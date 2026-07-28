import os
from langchain_community.vectorstores import Chroma
from backend.config import logger, PERSIST_DIR_ABS, DOCS_DIR_ABS
from backend.pdf_loader import load_all_pdfs
from backend.chunking import split_documents
from backend.embeddings import get_embeddings_model

_vector_store = None

def get_vector_store(force_reindex=False):
    """
    Initializes and returns the Chroma vector store.
    If the vector store does not exist on disk, or if force_reindex is True,
    it loads the hospital documents, chunks them, generates embeddings, and indexes them.
    """
    global _vector_store
    if _vector_store is not None and not force_reindex:
        return _vector_store

    embeddings = get_embeddings_model()
    
    # Check if database directory is already populated
    db_exists = os.path.exists(PERSIST_DIR_ABS) and any(
        os.path.isdir(os.path.join(PERSIST_DIR_ABS, d)) for d in os.listdir(PERSIST_DIR_ABS)
    ) if os.path.exists(PERSIST_DIR_ABS) else False

    if not db_exists or force_reindex:
        logger.info("Persistent ChromaDB not found or force_reindex=True. Initializing indexing process...")
        
        # Load PDFs
        documents = load_all_pdfs(DOCS_DIR_ABS)
        if not documents:
            logger.error("No documents loaded. Vector store initialization aborted.")
            raise ValueError(f"No PDFs found in documents directory: {DOCS_DIR_ABS}")

        # Split documents
        chunks = split_documents(documents)

        # Build index and persist
        logger.info(f"Creating collection and embedding {len(chunks)} chunks in {PERSIST_DIR_ABS}...")
        _vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=PERSIST_DIR_ABS
        )
        logger.info("ChromaDB index successfully generated and persisted.")
    else:
        logger.info(f"Loading existing ChromaDB from {PERSIST_DIR_ABS}...")
        _vector_store = Chroma(
            persist_directory=PERSIST_DIR_ABS,
            embedding_function=embeddings
        )
        logger.info("ChromaDB loaded successfully.")

    return _vector_store
