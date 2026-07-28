from langchain_groq import ChatGroq
import requests
import re
from backend.config import logger, GROQ_API_KEY
from backend.vector_store import get_vector_store


class HospitalFAQChatbot:
    def __init__(self):
        """
        Initializes the chatbot with optional Groq LLM and the vector store.
        Works fully offline using document retrieval if no API key is available.
        """
        # Always load the vector store and documents regardless of Groq
        try:
            self.vector_store = get_vector_store()
        except Exception as e:
            logger.error(f"Failed to initialize Chroma vector store: {e}.")
            self.vector_store = None

        # Load all documents for keyword fallback search
        try:
            from backend.config import DOCS_DIR_ABS
            from backend.pdf_loader import load_all_pdfs
            self.fallback_documents = load_all_pdfs(DOCS_DIR_ABS)
        except Exception as ex:
            logger.error(f"Failed to load fallback documents: {ex}")
            self.fallback_documents = []

        # Initialize Groq LLM if key is valid
        self.llm = None
        if GROQ_API_KEY and GROQ_API_KEY not in ("your_groq_api_key_here", ""):
            try:
                logger.info("Initializing Groq Chat LLM (model: mixtral-8x7b-32768)...")
                self.llm = ChatGroq(
                    model="mixtral-8x7b-32768",
                    groq_api_key=GROQ_API_KEY,
                    temperature=0.2
                )
            except Exception as e:
                logger.error(f"Failed to initialize Groq LLM: {e}")
                self.llm = None

    def format_docs_to_context(self, docs):
        """
        Helper to format langchain documents into a context block and citations list.
        """
        context_parts = []
        citations = []
        seen_citations = set()

        for idx, doc in enumerate(docs):
            source = doc.metadata.get("source_file", "Hospital_Document.pdf")
            page = doc.metadata.get("page", 0) + 1

            context_parts.append(f"[Document Source {idx+1}: {source}, Page {page}]\n{doc.page_content}\n")

            citation_key = f"{source} (Page {page})"
            if citation_key not in seen_citations:
                seen_citations.add(citation_key)
                citations.append({
                    "source": source,
                    "page": page,
                    "preview": doc.page_content[:150].strip() + "..."
                })

        context_str = "\n".join(context_parts)
        return context_str, citations

    def keyword_search_fallback(self, query: str, k: int = 6):
        """
        Calculates simple word overlap scores on loaded PDFs as a local search fallback.
        """
        if not self.fallback_documents:
            logger.warning("No fallback documents loaded.")
            return "", []

        keywords = [w.lower() for w in query.split() if len(w) > 2]
        if not keywords:
            keywords = [w.lower() for w in query.split()]

        scored_docs = []
        for doc in self.fallback_documents:
            content_lower = doc.page_content.lower()
            score = 0
            for keyword in keywords:
                score += content_lower.count(keyword)
            if score > 0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        top_docs = [doc for score, doc in scored_docs[:k]]

        if not top_docs:
            top_docs = self.fallback_documents[:k]

        logger.info(f"Local keyword search found {len(top_docs)} relevant pages.")
        return self.format_docs_to_context(top_docs)

    def get_context_and_citations(self, query: str, k: int = 6):
        """
        Queries the vector store for semantic matches, falling back to local keyword search.
        """
        if self.vector_store:
            try:
                docs = self.vector_store.similarity_search(query, k=k)
                if docs:
                    return self.format_docs_to_context(docs)
            except Exception as e:
                logger.error(f"Semantic similarity search failed: {e}. Trying keyword search fallback...")

        return self.keyword_search_fallback(query, k=k)

    def format_chat_history(self, history):
        """
        Converts the history list into a flat string for prompt injection.
        """
        formatted = ""
        for message in history:
            role = "Patient" if message.get("role") == "user" else "Care Desk"
            text = message.get("content", "")
            formatted += f"{role}: {text}\n"
        return formatted

    def extract_qa_pairs(self, context: str, query: str):
        """
        Finds Q&A pairs in the document context relevant to the query.
        Returns list of (question, answer) tuples sorted by relevance.
        """
        keywords = [w.lower() for w in query.split() if len(w) > 2]
        stopwords = {"what", "where", "when", "which", "does", "have", "here",
                     "there", "and", "are", "the", "how", "who", "can", "this",
                     "that", "with", "from", "your", "about"}
        keywords = [w for w in keywords if w not in stopwords] or keywords

        qa_pairs = []
        # Match numbered Q&A pattern like "74. Q: ... A: ..."
        pattern = re.findall(
            r'(?:\d+\.\s*)?Q[:\.]?\s*(.+?\?)\s*(?:•\s*)?A[:\.]?\s*(.+?)(?=\n\s*\d|\n\s*Q[:\.]|\Z)',
            context, re.DOTALL | re.IGNORECASE
        )
        for q, a in pattern:
            q_clean = q.strip()
            a_clean = a.strip().replace('\n', ' ')
            combined = (q_clean + ' ' + a_clean).lower()
            score = sum(combined.count(kw) for kw in keywords)
            if score > 0:
                qa_pairs.append((score, q_clean, a_clean))

        qa_pairs.sort(key=lambda x: x[0], reverse=True)
        return qa_pairs

    def generate_smart_answer(self, query: str, context: str, citations: list):
        """
        Generates a full, well-structured answer from the document context
        without requiring any external LLM API.
        """
        q = query.lower().strip()
        keywords = [w for w in q.split() if len(w) > 2]

        # --- Detect intent ---
        is_timing = any(t in q for t in ["timing", "timings", "hour", "hours", "open", "close", "schedule", "time"])
        is_contact = any(t in q for t in ["contact", "phone", "number", "call", "helpline", "reach"])
        is_location = any(t in q for t in ["location", "address", "where", "branch", "city", "state"])
        is_doctor = any(t in q for t in ["doctor", "dr.", "dr ", "specialist", "physician", "surgeon", "consultant"])
        is_appointment = any(t in q for t in ["appointment", "book", "schedule", "slot", "consult"])
        is_insurance = any(t in q for t in ["insurance", "cashless", "tpa", "policy", "claim", "coverage"])
        is_emergency = any(t in q for t in ["emergency", "urgent", "ambulance", "trauma", "accident"])
        is_department = any(t in q for t in ["department", "unit", "ward", "cardiology", "neurology", "oncology",
                                              "orthopedic", "pediatric", "gynaecology", "urology", "ent"])
        is_package = any(t in q for t in ["package", "checkup", "health check", "screen", "test"])

        # --- Try Q&A pairs first ---
        qa_pairs = self.extract_qa_pairs(context, query)

        # --- Build answer from context lines ---
        pages = context.split("[Document Source ")
        all_lines = []
        for page in pages:
            if not page.strip():
                continue
            lines = page.split("\n")
            for line in lines[1:]:
                line = line.strip()
                if not line or len(line) < 10:
                    continue
                line_lower = line.lower()
                score = sum(line_lower.count(kw) for kw in keywords)
                if score > 0:
                    all_lines.append((score, line))

        all_lines.sort(key=lambda x: x[0], reverse=True)

        # Clean lines
        def clean_line(line):
            line = re.sub(r'^\d+\.\s*Q:.*?\?\s*', '', line)
            line = re.sub(r'^A:\s*', '', line)
            line = re.sub(r'^•\s*A?:\s*', '', line)
            line = re.sub(r'^\d+\.\s*', '', line)
            return line.strip()

        cleaned_lines = []
        seen = set()
        for _, line in all_lines:
            cl = clean_line(line)
            if cl and cl not in seen and len(cl) > 15:
                seen.add(cl)
                cleaned_lines.append(cl)

        # -----------------------------------------------
        # Build structured response based on intent
        # -----------------------------------------------
        answer_parts = []

        # Use best Q&A pair if highly relevant
        if qa_pairs:
            top_score, top_q, top_a = qa_pairs[0]
            if top_score >= 2:
                top_a_clean = clean_line(top_a)
                if top_a_clean:
                    answer_parts.append(top_a_clean)
                # Add secondary Q&A if different enough
                for sc, sq, sa in qa_pairs[1:3]:
                    sa_clean = clean_line(sa)
                    if sa_clean and sa_clean not in seen and sa_clean != top_a_clean:
                        answer_parts.append(sa_clean)
                        seen.add(sa_clean)

        # Supplement with top scored lines
        for cl in cleaned_lines:
            if cl not in seen:
                answer_parts.append(cl)
                seen.add(cl)
            if len(answer_parts) >= 6:
                break

        # If still no answer, take any lines from context
        if not answer_parts:
            for page in pages:
                lines = page.split("\n")[1:]
                for line in lines:
                    cl = clean_line(line.strip())
                    if cl and len(cl) > 20 and cl not in seen:
                        answer_parts.append(cl)
                        seen.add(cl)
                    if len(answer_parts) >= 5:
                        break
                if len(answer_parts) >= 5:
                    break

        if not answer_parts:
            return (
                "I'm sorry, I couldn't find specific information about that in our hospital documents. "
                "Please contact our main help desk at **+91 40 4344 0109** or visit the nearest Apollo Hospitals branch. "
                "For emergencies, call **+91 99999 88888**."
            )

        # Format the final answer
        intro = "Here is what I found in our hospital documents:\n\n"

        if is_emergency:
            intro = "🚨 **Emergency Information:**\n\nPlease call **+91 99999 88888** immediately. "

        if is_timing:
            intro = "🕐 **Hospital Timings:**\n\n"
        elif is_contact:
            intro = "📞 **Contact Information:**\n\n"
        elif is_location:
            intro = "📍 **Location & Branches:**\n\n"
        elif is_doctor:
            intro = "👨‍⚕️ **Doctor Information:**\n\n"
        elif is_appointment:
            intro = "📅 **Appointment Information:**\n\n"
        elif is_insurance:
            intro = "🏥 **Insurance & TPA Information:**\n\n"
        elif is_department:
            intro = "🏨 **Department Information:**\n\n"
        elif is_package:
            intro = "🩺 **Health Package Information:**\n\n"

        # Format as bullet points if multiple items
        if len(answer_parts) > 1:
            body = "\n".join(f"• {p}" if not p.endswith(('.', '?', '!')) else f"• {p}" for p in answer_parts[:6])
        else:
            body = answer_parts[0]
            if not body.endswith(('.', '?', '!')):
                body += "."

        citation_note = ""
        if citations:
            src_names = list(set(c["source"].replace(".pdf", "").replace("_", " ") for c in citations[:3]))
            citation_note = f"\n\n*Sources: {', '.join(src_names)}*"

        return intro + body + citation_note

    def get_response(self, query: str, history=None):
        """
        Full RAG pipeline:
        1. Retrieves relevant documents from ChromaDB / keyword search.
        2. If Groq LLM available → use it for high-quality generation.
        3. Otherwise → generate a smart, structured answer locally from documents.
        """
        if history is None:
            history = []

        logger.info(f"Processing query: '{query[:80]}'")

        # 1. Retrieve context and citations
        context, citations = self.get_context_and_citations(query)

        # 2. Try Groq LLM if configured
        if self.llm:
            chat_history_str = self.format_chat_history(history)
            system_prompt = f"""You are "Apollo Care Desk", the warm, professional, and empathetic AI Receptionist at Apollo Hospitals Group. Your goal is to assist patients, visitors, and family members with their questions using ONLY the provided clinical and policy context documents.

Strict Operational Guidelines:
1. Speak in a helpful, empathetic, and professional tone.
2. Rely strictly on the retrieved context to answer the user's question. If the information is not present, politely direct them to call +91 40 4344 0109.
3. Cite the specific file name and page number when possible (e.g. "[Source: Patient_Guide.pdf, Page 2]").
4. If the query is about an emergency, immediately provide the Emergency Hotline (+91 99999 88888).
5. Keep answers clear and structured. Use bullet points for multi-step processes.
6. Do not invent information not present in the context.

Retrieved context from hospital documents:
=========================================
{context}
=========================================

Conversation history:
-----------------------------------------
{chat_history_str}
-----------------------------------------

Patient: {query}
Care Desk:"""
            try:
                logger.info(f"Invoking Groq model for query: '{query[:50]}...'")
                response = self.llm.invoke(system_prompt)
                answer = response.content.strip()
                logger.info("Groq model responded successfully.")
                return {"answer": answer, "citations": citations}
            except Exception as e:
                logger.error(f"Groq model error: {e}. Falling back to local RAG answer.")

        # 3. Local document-based answer generation (no API needed)
        logger.info("Generating answer locally from retrieved documents.")
        answer = self.generate_smart_answer(query, context, citations)
        return {"answer": answer, "citations": citations}
