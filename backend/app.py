import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.config import logger, DOCS_DIR_ABS, PERSIST_DIR_ABS, validate_config
from backend.chatbot import HospitalFAQChatbot
from backend.vector_store import get_vector_store

app = FastAPI(
    title="St. Jude Hospital FAQ Assistant API",
    description="A FastAPI backend powered by LangChain and Google Gemini to provide semantic search and answers based on hospital documents.",
    version="1.0.0"
)

# Configure CORS so our React frontend can query the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    history: List[Dict[str, Any]] = []

class ChatResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]

# Chatbot global reference
chatbot_instance = None

@app.on_event("startup")
def startup_event():
    """
    On server startup, checks if config is valid and performs initial
    document loading and embedding indexing if needed.
    """
    global chatbot_instance
    if validate_config():
        try:
            logger.info("Startup: Building vector store database (ChromaDB)...")
            get_vector_store()
            chatbot_instance = HospitalFAQChatbot()
            logger.info("Startup: HospitalFAQChatbot initialized and ready.")
        except Exception as e:
            logger.error(f"Startup: Failed to initialize RAG pipeline: {e}")

# Serve the documents folder statically so the user can open cited PDF files
if os.path.exists(DOCS_DIR_ABS):
    app.mount("/documents", StaticFiles(directory=DOCS_DIR_ABS), name="documents")
    logger.info(f"Static serving active for documents at path: {DOCS_DIR_ABS}")
else:
    logger.warning(f"Documents directory not found at: {DOCS_DIR_ABS}. Cannot serve PDF files statically.")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint that processes the query, retrieves vector context, and queries Gemini.
    """
    global chatbot_instance
    if chatbot_instance is None:
        if validate_config():
            try:
                chatbot_instance = HospitalFAQChatbot()
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Chatbot failed to initialize: {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=500,
                detail="Gemini API Key is missing. Please configure GOOGLE_API_KEY in the backend/.env file."
            )

    try:
        response = chatbot_instance.get_response(request.query, request.history)
        return response
    except Exception as e:
        logger.error(f"Error handling chat request: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating the response. Please check backend logs."
        )

@app.get("/api/status")
async def status():
    """
    Health check endpoint returning system readiness.
    """
    has_api_key = validate_config()
    
    # Check if vector store folder exists and contains files
    is_indexed = os.path.exists(PERSIST_DIR_ABS) and len(os.listdir(PERSIST_DIR_ABS)) > 0
    
    # Check if documents are generated
    has_pdfs = False
    if os.path.exists(DOCS_DIR_ABS):
        pdfs = [f for f in os.listdir(DOCS_DIR_ABS) if f.lower().endswith(".pdf")]
        has_pdfs = len(pdfs) > 0

    return {
        "status": "ready" if (has_api_key and is_indexed) else "pending",
        "api_key_configured": has_api_key,
        "database_indexed": is_indexed,
        "documents_available": has_pdfs,
        "docs_count": len(pdfs) if has_pdfs else 0
    }

@app.post("/api/reindex")
async def reindex():
    """
    Admin endpoint to force re-indexing of all PDFs in the documents folder.
    """
    global chatbot_instance
    if not validate_config():
        raise HTTPException(
            status_code=500,
            detail="Cannot reindex: Gemini API Key is missing."
        )
    
    try:
        logger.info("Reindexing requested. Cleaning and re-reading documents...")
        get_vector_store(force_reindex=True)
        chatbot_instance = HospitalFAQChatbot()
        return {"status": "success", "message": "All PDFs have been re-indexed into ChromaDB."}
    except Exception as e:
        logger.error(f"Reindexing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Reindexing failed: {str(e)}"
        )
