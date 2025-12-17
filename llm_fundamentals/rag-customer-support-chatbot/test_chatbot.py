from chatbot import CustomerSupportChatbot

print("🤖 Testing RAG Customer Support Chatbot")
print("=" * 50)

bot = CustomerSupportChatbot()
info = bot.get_vectorstore_info()
print(f"Vectorstore Status: {info['status']}")
print(f"Document Count: {info['count']}")
print()

# Test questions
questions = [
    "What are your business hours?",
    "What payment methods do you accept?", 
    "How can I return a product?",
    "What are your shipping options?",
    "How do I contact technical support?"
]

for i, question in enumerate(questions, 1):
    print(f"{i}. Q: {question}")
    result = bot.ask_question(question)
    print(f"   A: {result['answer'][:150]}...")
    print(f"   Sources: {len(result['sources'])} documents")
    print()

print("✅ All tests completed successfully!")