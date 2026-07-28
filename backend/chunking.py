from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.config import logger

def split_documents(documents, chunk_size=1000, chunk_overlap=200):
    """
    Splits loaded documents into smaller text chunks using RecursiveCharacterTextSplitter.
    """
    logger.info(f"Splitting {len(documents)} pages into chunks (size={chunk_size}, overlap={chunk_overlap})...")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True,
    )
    
    chunks = text_splitter.split_documents(documents)
    logger.info(f"Split completed. Created {len(chunks)} chunks.")
    return chunks
