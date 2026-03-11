# DocuMind 📄

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Streamlit-1.0+-red.svg" alt="Streamlit">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

> Chat with your PDF documents instantly using AI-powered RAG

## ✨ Features

- 📤 **Drag & Drop PDF Upload** - Easy file upload interface
- 💬 **Instant Q&A** - Ask questions and get immediate AI-powered answers
- 🗃️ **Local FAISS Storage** - No database needed, all processing is local
- 📚 **Conversation History** - Maintain chat history within session
- 🔒 **Privacy Focused** - Your documents never leave your machine

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DocuMind Architecture                        │
└─────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   Streamlit UI   │
                              │  (Frontend)      │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │     app.py       │
                              │  (Orchestrator)  │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
           │  PDF Loader   │  │   RAG Engine   │  │   Chat UI     │
           │ (PyPDF2/pdf   │  │   (rag.py)     │  │  (Messages)   │
           │  plumber)     │  │                │  │               │
           └───────┬────────┘  └───────┬────────┘  └───────────────┘
                   │                    │
                   ▼                    ▼
           ┌────────────────┐  ┌────────────────┐
           │ Text Splitter │  │  FAISS Vector  │
           │ (Recursive)   │  │     Store      │
           └───────┬────────┘  └───────┬────────┘
                   │                    │
                   ▼                    ▼
           ┌────────────────┐  ┌────────────────┐
           │   Embeddings   │  │  Retriever     │
           │ (HuggingFace)  │  │   (k=4)        │
           └───────┬────────┘  └───────┬────────┘
                   │                    │
                   └─────────┬──────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Ollama LLM   │
                    │  (llama3.2)   │
                    └────────────────┘
```

## 🚀 Demo

![DocuMind Demo](https://via.placeholder.com/800x450?text=DocuMind+Demo+GIF)

*Upload a PDF, ask questions, get instant answers!*

## 📋 Requirements

- Python 3.10+
- Ollama (for local LLM inference)
- 4GB+ RAM recommended

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/documind.git
cd documind
```

### 2. Create virtual environment (optional but recommended)

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Install and configure Ollama

```bash
# Install Ollama from https://ollama.ai

# Pull the model
ollama pull llama3.2

# Verify Ollama is running
ollama list
```

## ▶️ How to Run

### Step 1: Start Ollama

```bash
# In a separate terminal
ollama serve
```

### Step 2: Run the application

```bash
streamlit run app.py
```

### Step 3: Open in browser

Navigate to `http://localhost:8501`

## 💻 Usage

1. **Upload PDF**: Drag and drop your PDF file in the sidebar
2. **Wait for processing**: The document will be indexed using FAISS
3. **Ask questions**: Type your question in the chat input
4. **Get answers**: Receive instant answers from the AI

### Example Questions

- "What is this document about?"
- "Summarize the main points"
- "What are the key findings?"
- "Extract the conclusions"

## ⚙️ Configuration

You can customize the following in `rag.py`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `model_name` | `llama3.2` | LLM model to use |
| `embedding_model` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `ollama_base_url` | `http://localhost:11434` | Ollama server URL |
| `chunk_size` | `1000` | Text chunk size |
| `chunk_overlap` | `200` | Chunk overlap for context |

## 📁 Project Structure

```
documind/
├── app.py              # Main Streamlit application
├── rag.py              # RAG engine with FAISS
├── requirements.txt    # Python dependencies
├── AGENTS.md          # Agent configuration
└── README.md          # This file
```

## 🔧 Troubleshooting

### Ollama connection error

```bash
# Make sure Ollama is running
ollama serve

# Check available models
ollama list
```

### PDF processing error

- Ensure the PDF is not password-protected
- Try a different PDF to verify

### Memory issues

- Use a smaller embedding model: `sentence-transformers/all-MiniLM-L6-v2`
- Reduce chunk size in `rag.py`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchain) - LLM framework
- [FAISS](https://github.com/facebookresearch/faiss) - Vector similarity search
- [Ollama](https://ollama.ai/) - Local LLM inference
- [Streamlit](https://streamlit.io/) - UI framework
