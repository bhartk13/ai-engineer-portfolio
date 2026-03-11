import os
import tempfile
from typing import List, Optional, Any
from langchain_community.document_loaders import PyPDFLoader, PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
import streamlit as st


SYSTEM_TEMPLATE = """You are a helpful assistant that answers questions based on the provided context.
Answer the question based solely on the context provided. If you cannot find the answer in the context, 
say that you don't have enough information to answer the question."""

QUESTION_PROMPT = ChatPromptTemplate.from_template(SYSTEM_TEMPLATE + "\n\nContext: {context}\n\nQuestion: {question}")


class PDFRAG:
    def __init__(
        self,
        model_name: str = "llama3.2",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        ollama_base_url: str = "http://localhost:11434"
    ):
        self.model_name = model_name
        self.embedding_model = embedding_model
        self.ollama_base_url = ollama_base_url
        self.vector_store: Optional[FAISS] = None
        self.qa_chain = None
        self.embeddings: Embeddings
        self._init_embeddings()

    def _init_embeddings(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name=self.embedding_model,
            model_kwargs={'device': 'cpu'}
        )

    def load_pdf(self, uploaded_file) -> List[Document]:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(uploaded_file.getvalue())
            tmp_path = tmp_file.name

        try:
            loader = PDFPlumberLoader(tmp_path)
            documents = loader.load()
        except Exception:
            loader = PyPDFLoader(tmp_path)
            documents = loader.load()

        os.unlink(tmp_path)
        return documents

    def process_documents(self, documents: List[Document]) -> FAISS:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        texts = text_splitter.split_documents(documents)

        self.vector_store = FAISS.from_documents(texts, self.embeddings)
        return self.vector_store

    def create_qa_chain(self):
        if self.vector_store is None:
            raise ValueError("No vector store found. Process documents first.")

        llm = Ollama(
            model=self.model_name,
            base_url=self.ollama_base_url
        )

        retriever = self.vector_store.as_retriever(search_kwargs={"k": 4})

        def format_docs(docs: List[Document]) -> str:
            return "\n\n".join(doc.page_content for doc in docs)

        self.qa_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | QUESTION_PROMPT
            | llm
        )

    def ask(self, question: str) -> dict:
        if self.qa_chain is None:
            self.create_qa_chain()

        assert self.qa_chain is not None
        answer = self.qa_chain.invoke(question)
        return {
            "answer": answer.content if hasattr(answer, 'content') else str(answer),
            "source_documents": self.get_retrieved_context(question)
        }

    def get_retrieved_context(self, question: str, k: int = 4) -> List[Document]:
        if self.vector_store is None:
            return []
        return self.vector_store.similarity_search(question, k=k)


@st.cache_resource
def get_rag_instance() -> PDFRAG:
    return PDFRAG()


def initialize_rag(uploaded_file, model_name: str = "llama3.2") -> PDFRAG:
    rag = PDFRAG(model_name=model_name)
    documents = rag.load_pdf(uploaded_file)
    rag.process_documents(documents)
    rag.create_qa_chain()
    return rag
