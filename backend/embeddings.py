from langchain_core.embeddings import Embeddings
from typing import List
from backend.config import logger


class ChromaBuiltinEmbeddings(Embeddings):
    """
    Wraps ChromaDB's built-in ONNX MiniLM embedding function as a LangChain-compatible class.
    Uses all-MiniLM-L6-v2 via ONNX runtime — already bundled with chromadb.
    No torch, scipy, or sentence-transformers needed.
    """
    def __init__(self):
        from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
        self._fn = ONNXMiniLM_L6_V2()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._fn(texts)

    def embed_query(self, text: str) -> List[float]:
        return self._fn([text])[0]


def get_embeddings_model():
    """
    Returns ChromaDB's built-in ONNX embeddings model (all-MiniLM-L6-v2).
    No API key required. Runs locally via ONNX runtime.
    """
    logger.info("Initializing ChromaDB built-in ONNX embeddings (all-MiniLM-L6-v2)...")
    try:
        embeddings = ChromaBuiltinEmbeddings()
        logger.info("ONNX embeddings initialized successfully.")
        return embeddings
    except Exception as e:
        logger.error(f"Failed to initialize ChromaDB ONNX embeddings: {e}")
        raise e
