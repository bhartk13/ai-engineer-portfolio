# DocuMind Agents

## Project Overview
- **Project Name**: DocuMind
- **Type**: AI-powered PDF Chat Application
- **Core Functionality**: Upload PDF documents via drag-and-drop and get instant answers through conversational AI
- **Target Users**: Students, researchers, professionals who need to extract information from PDF documents

## Tech Stack
- **Frontend**: Streamlit
- **Vector Store**: FAISS (local)
- **LLM**: Ollama (llama3.2 or mistral)
- **Embeddings**: sentence-transformers
- **PDF Processing**: PyPDF2, pdfplumber

## Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Streamlit UI                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Drag & Drop │  │   Chat UI   │  │  Conversation Hist. │  │
│  │  PDF Upload │  │   Messages  │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       app.py                                 │
│  - Session state management                                  │
│  - File upload handling                                      │
│  - Chat message handling                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       rag.py                                 │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ PDF Loader      │  │ Text Splitter   │                   │
│  │ (PyPDF2)        │  │ (Recursive)     │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Embeddings      │  │ FAISS Vector   │                   │
│  │ (sentence-tfm)  │  │ Store (local)  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Retriever       │  │ LLM Chain      │                   │
│  │                 │  │ (Ollama)       │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Features
1. **Drag & Drop PDF Upload** - Easy file upload interface
2. **Instant Q&A** - Ask questions and get immediate answers
3. **Local FAISS Storage** - No database needed, all processing local
4. **Conversation History** - Maintain chat history within session
5. **Multiple PDF Support** - Process multiple documents

## Setup Instructions
1. Install dependencies: `pip install -r requirements.txt`
2. Install Ollama and pull model: `ollama pull llama3.2`
3. Run the app: `streamlit run app.py`

## Environment Variables
- `OLLAMA_BASE_URL`: Base URL for Ollama (default: http://localhost:11434)
- `MODEL_NAME`: LLM model name (default: llama3.2)
- `EMBEDDING_MODEL`: Embedding model (default: sentence-transformers/all-MiniLM-L6-v2)
