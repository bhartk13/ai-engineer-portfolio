import streamlit as st
import os
from chatbot import CustomerSupportChatbot

st.set_page_config(page_title="Customer Support Chatbot", page_icon="🤖", layout="wide")

@st.cache_resource
def get_chatbot():
    return CustomerSupportChatbot()

def main():
    st.title("🤖 Customer Support Chatbot")
    
    # Sidebar
    with st.sidebar:
        st.header("ℹ️ Status")
        
        if not os.getenv("OPENAI_API_KEY"):
            st.error("Set OPENAI_API_KEY in .env file")
            st.stop()
        
        chatbot = get_chatbot()
        info = chatbot.get_vectorstore_info()
        
        if info['status'] == 'ready':
            st.success(f"Ready ({info['count']} documents)")
        else:
            st.error("Run 'python ingest.py' first")
        
        st.markdown("---")
        st.markdown("**Sample Questions:**")
        samples = ["What are your business hours?", "How can I return a product?", 
                  "What payment methods do you accept?"]
        
        for q in samples:
            if st.button(q, key=f"sample_{hash(q)}"):
                st.session_state.sample_question = q
    
    # Initialize session state
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    if 'sample_question' not in st.session_state:
        st.session_state.sample_question = None
    
    # Display chat history
    for chat in st.session_state.chat_history:
        st.chat_message("user").write(chat['question'])
        st.chat_message("assistant").write(chat['answer'])
        if chat.get('sources'):
            with st.expander(f"📚 Sources ({len(chat['sources'])})"):
                for src in chat['sources']:
                    st.write(f"**{src['index']}.** {src['content']}")
    
    # Input
    default_q = st.session_state.sample_question or ""
    if st.session_state.sample_question:
        st.session_state.sample_question = None
    
    if question := st.chat_input("Ask your question...", key="chat_input"):
        question = question or default_q
        if question.strip():
            st.chat_message("user").write(question)
            
            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    response = chatbot.ask_question(question)
                    st.write(response['answer'])
                    
                    if response.get('sources'):
                        with st.expander(f"📚 Sources ({len(response['sources'])})"):
                            for src in response['sources']:
                                st.write(f"**{src['index']}.** {src['content']}")
            
            # Add to history
            st.session_state.chat_history.append({
                'question': question,
                'answer': response['answer'],
                'sources': response.get('sources', [])
            })
    
    # Clear button
    if st.session_state.chat_history and st.button("🗑️ Clear Chat"):
        st.session_state.chat_history = []
        st.rerun()

if __name__ == "__main__":
    main()