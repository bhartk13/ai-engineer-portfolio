# RAG Customer Support Chatbot

Complete RAG chatbot using OpenAI + LangChain + ChromaDB + Streamlit.

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Set API key in .env
OPENAI_API_KEY=your_key_here

# Create sample data (optional)
python sample_data.py

# Ingest documents
python ingest.py

# Run chatbot
streamlit run ui.py
```

## Files

- `ingest.py` - Loads PDF/DOCX files, creates embeddings
- `chatbot.py` - Core RAG logic with `get_rag_chain()` method  
- `ui.py` - Streamlit web interface
- `sample_data.py` - Creates test documents

## Usage

1. Add PDF/DOCX files to `./data/` directory
2. Run `python ingest.py` to process documents
3. Run `streamlit run ui.py` to start chatbot
4. Ask questions like "What are your business hours?"

## Configuration

Modify chunk size in `ingest.py`:
```python
RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
```

Change model in `chatbot.py`:
```python
ChatOpenAI(model_name="gpt-4", temperature=0.1)
```