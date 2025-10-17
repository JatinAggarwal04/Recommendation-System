from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
import os
from sentence_transformers import SentenceTransformer
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import uvicorn

# --- Configuration & Initialization ---
load_dotenv()
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Context manager to handle model loading on startup and cleanup on shutdown.
    """
    print("Loading models...")
    # Using a smaller, faster model for classification and simple tasks
    fast_llm = ChatOllama(model="llama3", temperature=0)
    # Using a more capable model for creative description generation
    creative_llm = ChatOllama(model="llama3", temperature=0.7)

    ml_models["text_model"] = SentenceTransformer('all-MiniLM-L6-v2')
    
    # --- 1. Enhanced Intent Detection Chain ---
    intent_template = """
    Analyze the user's latest message in the context of the chat history and the last shown products. Classify the intent into ONE of the following categories:
    GREETING, SEARCH, REFINEMENT, FOLLOWUP, QUESTION.

    - GREETING: The user is saying hello, thanks, or making simple conversation.
    - SEARCH: The user is starting a NEW search for a product. This is for queries that are not related to the previous search.
    - REFINEMENT: The user wants to MODIFY the previous search (e.g., "cheaper," "in blue," "a smaller one").
    - FOLLOWUP: The user is asking a general question about one of the products just shown (e.g., "tell me more about the first one," "which is best?").
    - QUESTION: The user is asking a SPECIFIC question about one of the products shown (e.g., "what is the second one made of?", "what are the dimensions of the last one?").
    
    Respond with ONLY the category name.

    <Chat History>
    {chat_history}
    </Chat History>

    <Last Products Shown>
    {last_products}
    </Last Products Shown>

    User Message: "{user_message}"
    Intent:
    """
    intent_prompt = ChatPromptTemplate.from_template(intent_template)
    ml_models["intent_chain"] = intent_prompt | fast_llm | StrOutputParser()

    # --- 2. Query Refinement Chain ---
    refinement_template = """
    You are a search query assistant. Your task is to refine a previous search query based on the user's new request.
    Combine the previous query with the user's refinement to create a new, complete search query.

    Previous Search Query: "{previous_query}"
    User's Refinement: "{user_message}"
    New Search Query:
    """
    refinement_prompt = ChatPromptTemplate.from_template(refinement_template)
    ml_models["refinement_chain"] = refinement_prompt | fast_llm | StrOutputParser()
    
    # --- 3. Product Q&A Chain ---
    qa_template = """
    You are a helpful furniture expert. Answer the user's question based ONLY on the provided product information.
    If the information is not available in the provided text, say "I'm sorry, I don't have that information."
    Identify which product the user is asking about (e.g., "the first one," "the second option").

    <Product Information>
    {product_context}
    </Product Information>

    User's Question: "{user_message}"
    Answer:
    """
    qa_prompt = ChatPromptTemplate.from_template(qa_template)
    ml_models["qa_chain"] = qa_prompt | fast_llm | StrOutputParser()

    # --- 4. Creative Description Chain ---
    desc_template = """
    You are an expert e-commerce copywriter. Based on the product data, write a single, compelling, and creative descriptive paragraph.
    The output MUST be a single paragraph of text only. NO markdown, titles, or bullet points.
    
    Product Data:
    - Title: {title}
    - Description: {description}
    
    Creative Paragraph:
    """
    desc_prompt = ChatPromptTemplate.from_template(desc_template)
    ml_models["desc_chain"] = desc_prompt | creative_llm

    print("Models loaded successfully.")
    yield
    print("Cleaning up models...")
    ml_models.clear()

app = FastAPI(lifespan=lifespan)

# --- CORS Middleware ---
origins = ["http://localhost:3000", "http://localhost:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Pydantic Models ---
class ChatMessage(BaseModel):
    from_user: str = Field(..., alias='from')
    text: str

class Product(BaseModel):
    id: str
    title: str
    generated_description: str
    # Add other fields you might need for context
    
class ConversationalQuery(BaseModel):
    query: str
    history: List[ChatMessage]
    last_products: Optional[List[Product]] = None

# --- Pinecone Initialization ---
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("INDEX_NAME"))

def get_last_search_query(history: List[ChatMessage]) -> str:
    # Find the last message from the user that was a search query
    for msg in reversed(history):
        if msg.from_user == 'user':
            return msg.text
    return ""

def format_product_context(products: List[Product], query: str) -> str:
    if not products:
        return "No products are currently being displayed."
    
    context_str = ""
    for i, p in enumerate(products):
        context_str += f"Product {i+1}:\n"
        context_str += f"  Title: {p.title}\n"
        context_str += f"  Description: {p.generated_description}\n\n"
    return context_str

# --- Main API Endpoint ---
@app.post("/recommend")
def recommend_products(query: ConversationalQuery):
    chat_history_str = "\n".join([f"{msg.from_user}: {msg.text}" for msg in query.history])
    last_products_str = format_product_context(query.last_products, query.query)

    # 1. Determine Intent
    intent_chain = ml_models["intent_chain"]
    intent = intent_chain.invoke({
        "chat_history": chat_history_str,
        "last_products": last_products_str,
        "user_message": query.query
    })
    print(f"Detected Intent: {intent}")

    # 2. Route based on Intent
    if "GREETING" in intent:
        return {"type": "greeting", "response": "Hello! How can I help you find furniture today?"}

    elif "FOLLOWUP" in intent or "QUESTION" in intent:
        qa_chain = ml_models["qa_chain"]
        answer = qa_chain.invoke({
            "product_context": last_products_str,
            "user_message": query.query
        })
        return {"type": "answer", "response": answer}

    else: # SEARCH or REFINEMENT
        search_query = query.query
        if "REFINEMENT" in intent:
            refinement_chain = ml_models["refinement_chain"]
            previous_query = get_last_search_query(query.history)
            search_query = refinement_chain.invoke({
                "previous_query": previous_query,
                "user_message": query.query
            })
            print(f"Refined Search Query: {search_query}")

        # Perform the search
        text_model = ml_models["text_model"]
        query_embedding = text_model.encode(search_query).tolist()
        sparse_image_part = [0.0] * 768
        combined_query_embedding = query_embedding + sparse_image_part
        results = index.query(vector=combined_query_embedding, top_k=3, include_metadata=True)
        
        recommendations = []
        desc_chain = ml_models["desc_chain"]
        for match in results['matches']:
            metadata = match['metadata']
            try:
                response = desc_chain.invoke({"title": metadata['title'], "description": metadata.get('description', '')})
                creative_desc = response.content
            except Exception as e:
                print(f"Error generating description: {e}")
                creative_desc = metadata.get('description', 'A beautiful piece of furniture.')

            recommendations.append({
                "id": match['id'],
                "title": metadata['title'],
                "image": metadata.get('image'),
                "score": match['score'],
                "generated_description": creative_desc.strip()
            })
        return {"type": "products", "recommendations": recommendations}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

