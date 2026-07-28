import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BACKEND_DIR, ".env")
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("HospitalRAG")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PERSIST_DIRECTORY = os.getenv("PERSIST_DIRECTORY", "../chroma_db")
DOCUMENTS_DIRECTORY = os.getenv("DOCUMENTS_DIRECTORY", "../documents")

# Resolve absolute paths relative to backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIR_ABS = os.path.abspath(os.path.join(BACKEND_DIR, PERSIST_DIRECTORY))
DOCS_DIR_ABS = os.path.abspath(os.path.join(BACKEND_DIR, DOCUMENTS_DIRECTORY))

def validate_config():
    if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
        logger.error("GROQ_API_KEY is missing or invalid in backend/.env. Please get your free key from console.groq.com.")
        return False
    logger.info("Configuration validated successfully.")
    return True
