import os
from langchain_community.document_loaders import PyPDFLoader
from backend.config import logger

def load_single_pdf(file_path: str):
    """
    Loads text content from a single PDF file using PyPDFLoader.
    """
    if not os.path.exists(file_path):
        logger.error(f"PDF file not found at: {file_path}")
        return []
    
    logger.info(f"Loading PDF: {os.path.basename(file_path)}")
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        return docs
    except Exception as e:
        logger.error(f"Failed to load PDF {file_path}: {e}")
        return []

def load_all_pdfs(docs_dir: str):
    """
    Scans the documents directory and loads all PDF files.
    """
    all_documents = []
    if not os.path.exists(docs_dir):
        logger.error(f"Documents directory does not exist: {docs_dir}")
        return all_documents

    files = [f for f in os.listdir(docs_dir) if f.lower().endswith(".pdf")]
    if not files:
        logger.warning(f"No PDF files found in documents directory: {docs_dir}")
        return all_documents

    for file in files:
        file_path = os.path.join(docs_dir, file)
        docs = load_single_pdf(file_path)
        # Ensure metadata has the filename for proper citation rendering
        for doc in docs:
            doc.metadata["source_file"] = file
        all_documents.extend(docs)

    logger.info(f"Successfully loaded {len(all_documents)} pages across {len(files)} PDFs.")
    return all_documents
