import streamlit as st
from rag import initialize_rag
import os

st.set_page_config(
    page_title="DocuMind - AI PDF Assistant",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.stApp {background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a2332 100%);font-family: 'Plus Jakarta Sans', sans-serif;}
h1, h2, h3, h4, h5, h6 {font-family: 'Plus Jakarta Sans', sans-serif;}
p, div, span, label {font-family: 'Plus Jakarta Sans', sans-serif;}
h1 {background: linear-gradient(90deg, #58a6ff, #3fb950);-webkit-background-clip: text;-webkit-text-fill-color: transparent;font-weight: 800;font-size: 2.8rem !important;}
[data-testid="stSidebar"] {background: linear-gradient(180deg, #21262d 0%, #0d1117 100%);border-right: 1px solid #30363d;}
[data-testid="stChatInput"] {background: #21262d;border: 1px solid #30363d;border-radius: 12px;}
[data-testid="stChatInput"] input {background: transparent !important;color: #e6edf3 !important;font-family: 'Plus Jakarta Sans', sans-serif !important;}
[data-testid="stChatInput"]:focus-within {border-color: #58a6ff;box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);}
.stButton > button {background: linear-gradient(135deg, #238636, #2ea043);border: none;border-radius: 8px;color: white;font-weight: 600;transition: all 0.2s ease;font-family: 'Plus Jakarta Sans', sans-serif;}
.stButton > button:hover {transform: translateY(-1px);box-shadow: 0 4px 12px rgba(46, 160, 67, 0.4);}
[data-testid="stInfo"] {background: rgba(56, 139, 253, 0.15);border: 1px solid rgba(56, 139, 253, 0.4);border-radius: 12px;color: #a5d6ff;}
[data-testid="stSuccess"] {background: rgba(63, 185, 80, 0.15);border: 1px solid rgba(63, 185, 80, 0.4);border-radius: 12px;color: #7ee787;}
[data-testid="stError"] {background: rgba(248, 81, 73, 0.15);border: 1px solid rgba(248, 81, 73, 0.4);border-radius: 12px;color: #ffa198;}
.streamlit-expanderHeader {background: #21262d;border: 1px solid #30363d;border-radius: 8px;color: #8b949e !important;}
hr {border-color: #30363d;}
.stSelectbox > div > div {background: #21262d;border: 1px solid #30363d;color: #e6edf3;}
[data-testid="stChatMessage"] {background: rgba(33, 38, 45, 0.6);border: 1px solid #30363d;border-radius: 16px;padding: 1rem 1.25rem;}
#MainMenu {visibility: hidden;}footer {visibility: hidden;}header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

st.title("DocuMind")
st.markdown('<p class="subtitle">AI-powered PDF document assistant</p>', unsafe_allow_html=True)

if 'rag_instance' not in st.session_state:
    st.session_state.rag_instance = None

if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'pdf_processed' not in st.session_state:
    st.session_state.pdf_processed = False

if 'current_pdf_name' not in st.session_state:
    st.session_state.current_pdf_name = None

with st.sidebar:
    st.markdown("### 📤 Upload PDF")
    uploaded_file = st.file_uploader(
        "Drag and drop your PDF here",
        type=['pdf'],
        help="Upload a PDF document to start chatting"
    )

    if uploaded_file is not None:
        file_changed = st.session_state.current_pdf_name != uploaded_file.name
        if file_changed:
            st.session_state.pdf_processed = False
            st.session_state.rag_instance = None
            st.session_state.messages = []
            st.session_state.current_pdf_name = uploaded_file.name
        
        if not st.session_state.pdf_processed:
            with st.spinner("Processing PDF..."):
                try:
                    st.session_state.rag_instance = initialize_rag(uploaded_file)
                    st.session_state.pdf_processed = True
                    st.success(f"Loaded: {uploaded_file.name}")
                except Exception as e:
                    st.error(f"Error: {str(e)}")

    st.markdown("---")
    st.markdown("### ⚙️ Settings")
    model_name = st.selectbox(
        "Model",
        ["llama3.2", "mistral", "codellama"],
        index=0,
        help="Select the LLM model"
    )

    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        if st.button("Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.rerun()
    with col_btn2:
        if st.button("New PDF", use_container_width=True):
            st.session_state.pdf_processed = False
            st.session_state.rag_instance = None
            st.session_state.messages = []
            st.rerun()

col1, col2 = st.columns([3, 1])

with col1:
    if not st.session_state.pdf_processed:
        st.markdown("""
        <div class="welcome-card">
            <h3>👋 Welcome to DocuMind</h3>
            <p style="color: #8b949e; margin-top: 1rem;">Upload a PDF document and ask questions about its content.</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("### How it works")
        st.markdown("""
        <div class="step-card">📄 <strong>Upload</strong> — Drag and drop your PDF document</div>
        <div class="step-card">⚡ <strong>Process</strong> — AI extracts and indexes the content</div>
        <div class="step-card">💬 <strong>Ask</strong> — Type questions about your document</div>
        <div class="step-card">🎯 <strong>Answer</strong> — Get instant AI-powered responses</div>
        """, unsafe_allow_html=True)

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Ask anything about your document..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        if st.session_state.rag_instance is None:
            with st.chat_message("assistant"):
                st.error("Please upload a PDF first!")
        else:
            with st.chat_message("assistant"):
                with st.spinner("Analyzing document..."):
                    try:
                        result = st.session_state.rag_instance.ask(prompt)
                        st.markdown(result["answer"])

                        with st.expander("📚 View source passages"):
                            for i, doc in enumerate(result.get("source_documents", [])):
                                st.markdown(f"**Passage {i+1}:**")
                                st.code(doc.page_content[:600] + "..." if len(doc.page_content) > 600 else doc.page_content, language="text")

                        st.session_state.messages.append({
                            "role": "assistant",
                            "content": result["answer"]
                        })
                    except Exception as e:
                        st.error(f"Error: {str(e)}")

with col2:
    if st.session_state.pdf_processed:
        st.markdown("### 💡 Quick Prompts")
        st.markdown("""
        - What is this document about?
        - Summarize the main points
        - Extract key findings
        - What are the conclusions?
        """)

if __name__ == "__main__":
    pass
