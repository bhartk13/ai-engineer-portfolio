from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

resume_text="""
I have experience with AWS services including Lambda, S3, API Gateway, DynamoDB,
EKS, RDS and serverless architectures. I worked on building AI-based data apps,
GraphQL APIs, vector search, and event-driven systems.
"""
job_descriptions = [
    "AI Solution Architect needed with strong AWS, ML pipelines, Python, and LLM experience.",
    "Looking for a cloud engineer with Kubernetes and DevOps background.",
    "Hiring a data scientist skilled in training ML models and building analytics dashboards.",
    "AI Architect role requiring experience with vector databases, RAG, embeddings, and cloud services."
]

resume_embedding = model.encode(resume_text)
job_description_embeddings = model.encode(job_descriptions)

index = faiss.IndexFlatL2(resume_embedding.shape[0])
index.add(np.array([resume_embedding]))

distance, index = index.search(np.array([job_description_embeddings[0]]), k=1)
print(f"Distance: {distance}, Index: {index}")