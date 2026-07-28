import os
import pickle
from pathlib import Path

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

# ------------------------------------------------------------------
# Configuration – pull paths from backend.config if possible
# ------------------------------------------------------------------
try:
    from backend.config import DOCS_DIR_ABS
except Exception:
    # Fallback: assume documents folder relative to this file
    DOCS_DIR_ABS = Path(__file__).parent.parent / "documents"

# Index storage (persisted next to this module)
INDEX_PATH = Path(__file__).parent / "faiss_index.pkl"
CHUNKS_PATH = Path(__file__).parent / "chunks.pkl"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "Qwen/Qwen2.5-7B-Instruct")
TOP_K = 3
CHUNK_SIZE = 500  # characters per chunk

# ------------------------------------------------------------------
# Helper: load PDFs and split into chunks
# ------------------------------------------------------------------
def _load_documents() -> str:
    text = ""
    for pdf_path in sorted(Path(DOCS_DIR_ABS).glob("*.pdf")):
        try:
            reader = PdfReader(str(pdf_path))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception:
            continue
    return text

def _chunk_text(text: str, size: int = CHUNK_SIZE) -> list:
    return [text[i:i + size] for i in range(0, len(text), size)]

# ------------------------------------------------------------------
# Index creation / loading
# ------------------------------------------------------------------
def _load_or_build_index():
    if INDEX_PATH.exists() and CHUNKS_PATH.exists():
        with open(INDEX_PATH, "rb") as f:
            index = pickle.load(f)
        with open(CHUNKS_PATH, "rb") as f:
            chunks = pickle.load(f)
        return index, chunks

    # Build from scratch
    raw_text = _load_documents()
    chunks = _chunk_text(raw_text)
    embedder = SentenceTransformer(EMBEDDING_MODEL)
    embeddings = embedder.encode(chunks, convert_to_numpy=True, show_progress_bar=False)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings.astype("float32"))
    # Persist
    with open(INDEX_PATH, "wb") as f:
        pickle.dump(index, f)
    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(chunks, f)
    return index, chunks

faiss_index, chunk_list = _load_or_build_index()

# ------------------------------------------------------------------
# Load the quantised LLM (CPU‑first, GPU if available)
# ------------------------------------------------------------------
quant_cfg = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
)

tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
llm = AutoModelForCausalLM.from_pretrained(
    LLM_MODEL,
    quantization_config=quant_cfg,
    device_map="auto",
)

embedder = SentenceTransformer(EMBEDDING_MODEL)

# ------------------------------------------------------------------
# Public API – answer a user question using the local RAG pipeline
# ------------------------------------------------------------------
def answer_question(question: str) -> str:
    """Return a generated answer for *question* using FAISS retrieval + Qwen.
    Raises on unexpected errors; callers should handle exceptions.
    """
    # 1️⃣ Embed the query
    q_emb = embedder.encode([question], convert_to_numpy=True)
    D, I = faiss_index.search(q_emb.astype("float32"), TOP_K)
    retrieved = "\n".join(chunk_list[i] for i in I[0])

    # 2️⃣ Build prompt
    prompt = (
        "You are a helpful AI assistant for Apollo Hospitals. Use only the provided context to answer the user query. "
        "If the answer is not in the context, politely say you don't have the information.\n\n"
        f"Context:\n{retrieved}\n\n"
        f"Question: {question}\nAnswer:"
    )

    # 3️⃣ Generate response
    inputs = tokenizer(prompt, return_tensors="pt").to(llm.device)
    output_ids = llm.generate(
        **inputs,
        max_new_tokens=256,
        temperature=0.2,
        do_sample=False,
    )
    answer = tokenizer.decode(
        output_ids[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )
    return answer.strip()
