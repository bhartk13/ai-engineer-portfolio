import os, sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

load_dotenv()

def load_documents(data_dir="./data"):
    """Load PDF, DOCX, and TXT files from directory"""
    from langchain_community.document_loaders import TextLoader
    
    data_path = Path(data_dir)
    data_path.mkdir(exist_ok=True)
    documents = []
    
    # Load text files
    for file_path in data_path.glob("*.txt"):
        try:
            loader = TextLoader(str(file_path), encoding='utf-8')
            documents.extend(loader.load())
            print(f"✓ Loaded {file_path.name}")
        except Exception as e:
            print(f"✗ Error loading {file_path.name}: {e}")
    
    # Load PDF and DOCX files
    for pattern in ["*.pdf", "*.docx"]:
        for file_path in data_path.glob(pattern):
            try:
                loader = PyPDFLoader(str(file_path)) if pattern == "*.pdf" else Docx2txtLoader(str(file_path))
                documents.extend(loader.load())
                print(f"✓ Loaded {file_path.name}")
            except Exception as e:
                print(f"✗ Error loading {file_path.name}: {e}")
    
    return documents

def main():
    if not os.getenv("OPENAI_API_KEY"):
        print("✗ Set OPENAI_API_KEY in .env file")
        return
    
    documents = load_documents()
    if not documents:
        print("✗ No documents found in ./data directory")
        return
    
    # Split and create vectorstore
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(documents)
    
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=OpenAIEmbeddings(),
        persist_directory="./chroma_db"
    )
    
    print(f"🎉 Ingested {len(chunks)} chunks from {len(documents)} documents")
    print("Run: streamlit run ui.py")

if __name__ == "__main__":
    main()