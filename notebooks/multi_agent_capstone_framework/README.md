Generic Multi-Agent Framework

Quickstart:

1. python3 -m venv venv
2. source venv/bin/activate      # Windows: venv\Scripts\activate
3. pip install -r requirements.txt
4. copy .env.example -> .env and (optionally) set GEMINI_API_KEY
5. uvicorn main:app --reload --port 8000
6. streamlit run ui/review_ui.py --server.port 8501

Open UI at http://localhost:8501 and API docs at http://127.0.0.1:8000/docs