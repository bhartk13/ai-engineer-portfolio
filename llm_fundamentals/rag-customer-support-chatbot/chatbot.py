import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

load_dotenv()

class CustomerSupportChatbot:
    def __init__(self, persist_directory="./chroma_db"):
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.1, max_tokens=500)
        
        try:
            self.vectorstore = Chroma(persist_directory=persist_directory, embedding_function=self.embeddings)
            self.retriever = self.vectorstore.as_retriever(search_kwargs={"k": 3})
            
            # Create RAG chain
            prompt = PromptTemplate.from_template("""
            You are a helpful customer support assistant. Use the context to answer questions.
            If you can't find the answer, suggest contacting support directly.
            
            Context: {context}
            Question: {question}
            Answer:""")
            
            def format_docs(docs):
                return "\n\n".join(doc.page_content for doc in docs)
            
            self.rag_chain = (
                {"context": self.retriever | format_docs, "question": RunnablePassthrough()}
                | prompt
                | self.llm
                | StrOutputParser()
            )
            
        except Exception as e:
            print(f"✗ Error initializing chatbot: {e}")
            self.rag_chain = None
    
    def get_rag_chain(self):
        return self.rag_chain
    
    def ask_question(self, question):
        if not self.rag_chain or not question.strip():
            return {"answer": "Please run 'python ingest.py' first or ask a valid question.", "sources": [], "error": True}
        
        try:
            # Get relevant documents
            docs = self.retriever.invoke(question)
            sources = [{"content": doc.page_content[:200] + "...", "metadata": doc.metadata, "index": i+1} 
                      for i, doc in enumerate(docs)]
            
            # Get answer
            answer = self.rag_chain.invoke(question)
            return {"answer": answer, "sources": sources, "error": False}
        except Exception as e:
            return {"answer": f"Error: {e}", "sources": [], "error": True}
    
    def get_vectorstore_info(self):
        try:
            return {"status": "ready", "count": self.vectorstore._collection.count()}
        except:
            return {"status": "not_initialized", "count": 0}

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("✗ Set OPENAI_API_KEY in .env file")
    else:
        chatbot = CustomerSupportChatbot()
        for q in ["What are your business hours?", "How can I return a product?"]:
            print(f"Q: {q}\nA: {chatbot.ask_question(q)['answer']}\n")