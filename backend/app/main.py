from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pinecone import Pinecone
import os
from sentence_transformers import SentenceTransformer
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import uvicorn
import re
import json
import pandas as pd
import ast
from collections import Counter

load_dotenv()
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    print("🚀 Loading models...")
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found")

    llm = ChatGroq(
        model="llama-3.1-8b-instant", 
        groq_api_key=groq_api_key, 
        temperature=0,
        max_tokens=500
    )
    
    ml_models["text_model"] = SentenceTransformer('all-MiniLM-L6-v2')
    ml_models["llm"] = llm
    
    # Intent detection
    intent_template = """Classify user intent. Return ONLY ONE WORD.

GREETING: "hi", "hello", "hey"
FOLLOW_UP: Filtering previous results ("under $50", "red ones", "cheaper ones")
QUESTION: Asking about shown products ("which is cheapest", "what's the difference")
SEARCH: Looking for products ("find sofa", "show me beds", "sofas")

History: {history}
Query: "{query}"

Return ONLY one word (GREETING/FOLLOW_UP/QUESTION/SEARCH):"""
    
    intent_prompt = ChatPromptTemplate.from_template(intent_template)
    ml_models["intent_chain"] = intent_prompt | llm | StrOutputParser()
    
    # Title classifier - determines PRIMARY product category
    title_classifier_template = """What is the PRIMARY product category of this furniture item?

Product Title: "{title}"

Look at the MAIN product being sold, not accessories or features mentioned.

Categories:
- sofa: sofas, couches, sectionals, loveseats (seating for 2+ people)
- chair: chairs, recliners, armchairs (seating for 1 person)
- bed: beds, bed frames
- table: tables, desks
- ottoman: ottomans, footstools
- storage: dressers, cabinets, nightstands
- other: anything else

Examples:
"FANYE Oversized 6 Seaters Modular Storage Sectional Sofa Couch" → sofa
"MoNiBloom Massage Gaming Recliner Chair with Speakers" → chair (it's a recliner chair, not a sofa)
"jela Kids Couch Large, Floor Sofa Modular" → sofa (it's a couch/sofa for kids)
"Lazy Chair with Ottoman" → chair (main item is chair, ottoman is accessory)
"Ottoman Storage Bench" → ottoman
"Sofa Side Table" → table (it's a table that goes beside sofas)

Return ONLY the category word (sofa/chair/bed/table/ottoman/storage/other):"""
    
    title_classifier_prompt = ChatPromptTemplate.from_template(title_classifier_template)
    ml_models["title_classifier_chain"] = title_classifier_prompt | llm | StrOutputParser()
    
    # Query parser - this is the ONLY job for LLM
    query_template = """Extract what furniture the user wants.

Query: "{query}"

Identify the MAIN furniture category:
- sofa/couch/sectional/loveseat → "sofa"
- bed/bedframe → "bed"  
- chair/armchair/recliner → "chair"
- table/desk → "table"
- ottoman/footstool → "ottoman"
- dresser/nightstand → "storage"
- sports/exercise/gym/fitness → "sports" (NOT furniture)
- appliance/electronic/gadget → "electronics" (NOT furniture)

Return JSON:
{{
  "category": "sofa|bed|chair|table|ottoman|storage|sports|electronics|other",
  "material": "wood|metal|fabric|leather|null",
  "color": "red|blue|gray|etc|null",
  "size": "large|small|null",
  "price_max": number or null
}}

Examples:
"find sofas" → {{"category": "sofa"}}
"red leather couch" → {{"category": "sofa", "material": "leather", "color": "red"}}
"wooden dining table under $200" → {{"category": "table", "material": "wood", "price_max": 200}}
"sports equipment" → {{"category": "sports"}}
"beds" → {{"category": "bed"}}

JSON:"""
    
    query_prompt = ChatPromptTemplate.from_template(query_template)
    ml_models["query_chain"] = query_prompt | llm | StrOutputParser()
    
    # Q&A for product comparisons and questions
    qa_template = """You are helping a customer compare furniture products.

DISPLAYED PRODUCTS:
{products}

CUSTOMER QUESTION: "{query}"

Provide a helpful, concise answer (2-3 sentences max). If comparing products, be specific about which product you're referring to (e.g., "The first one...", "Product #2...").

Answer:"""
    
    qa_prompt = ChatPromptTemplate.from_template(qa_template)
    ml_models["qa_chain"] = qa_prompt | llm | StrOutputParser()
    
    # Follow-up filter parser
    followup_template = """Extract filters from user request. Return ONLY valid JSON.

PREVIOUS PRODUCTS: {product_list}
USER REQUEST: "{query}"

Extract filters:
- price_max: number or null (e.g., "under 130" → 130)
- color: specific color or null
- size: "large", "small", or null
- material: "wood", "metal", "fabric", "leather", or null
- brand: specific brand name or null

Examples:
"under $100" → {{"price_max": 100}}
"under 130$" → {{"price_max": 130}}
"red ones" → {{"color": "red"}}
"wooden ones" → {{"material": "wood"}}
"large sofas" → {{"size": "large"}}
"from FANYE" → {{"brand": "FANYE"}}

Return ONLY valid JSON (no explanations):"""
    
    followup_prompt = ChatPromptTemplate.from_template(followup_template)
    ml_models["followup_chain"] = followup_prompt | llm | StrOutputParser()
    
    print("✅ Models loaded")
    yield
    ml_models.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

class ChatMessage(BaseModel):
    from_user: str
    text: str

class Product(BaseModel):
    id: str
    title: str
    image: Optional[str] = None
    price: Optional[str] = None
    key_features: Optional[List[str]] = None
    best_for: Optional[str] = None
    dimensions: Optional[str] = None
    material: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None

class ConversationalQuery(BaseModel):
    query: str
    history: List[ChatMessage]
    last_products: Optional[List[Product]] = None

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("INDEX_NAME"))

def classify_product_title(title: str) -> str:
    """Use LLM to classify product's PRIMARY category"""
    try:
        result = ml_models["title_classifier_chain"].invoke({"title": title})
        category = result.strip().lower()
        
        # Validate it's a known category
        valid_categories = ["sofa", "chair", "bed", "table", "ottoman", "storage", "sports", "other"]
        if category in valid_categories:
            return category
        
        # Fallback to keyword matching if LLM returns invalid category
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["sofa", "couch", "sectional", "loveseat"]):
            return "sofa"
        elif any(kw in title_lower for kw in ["chair", "recliner"]):
            return "chair"
        elif any(kw in title_lower for kw in ["bed", "bedframe"]):
            return "bed"
        elif any(kw in title_lower for kw in ["table", "desk"]):
            return "table"
        elif any(kw in title_lower for kw in ["ottoman", "footstool"]):
            return "ottoman"
        else:
            return "other"
            
    except Exception as e:
        print(f"    ⚠️ Classification error: {e}")
        return "other"

def clean_json(text: str) -> dict:
    """Extract JSON from LLM response"""
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except:
        pass
    return {}

def extract_price(price_str: str) -> Optional[float]:
    """Extract numeric price"""
    if not price_str or price_str == 'N/A':
        return None
    match = re.search(r'\d+\.?\d*', price_str.replace('$', '').replace(',', ''))
    return float(match.group()) if match else None

def generate_summary(title: str, desc: str) -> dict:
    """Generate product summary"""
    features = []
    text = f"{title} {desc}".lower()
    
    feature_patterns = [
        (r'(\d+\s*(?:drawer|shelf|shelves|tier|piece|seater|seat)s?)', 1),
        (r'(adjustable|foldable|convertible|extendable|reclining)', 1),
        (r'(storage|space-saving)', 1),
        (r'(ergonomic|lumbar support)', 1),
        (r'(upholstered|cushioned|padded)', 1),
        (r'(leather|velvet|linen|wood|metal)', 2),
        (r'(modular|sectional)', 1),
    ]
    
    found = []
    for pattern, priority in feature_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches[:1]:
            found.append((match, priority))
    
    found.sort(key=lambda x: x[1])
    seen = set()
    for feature, _ in found:
        feature_clean = feature.strip().lower()
        if feature_clean not in seen and len(features) < 4:
            seen.add(feature_clean)
            features.append(' '.join(word.capitalize() for word in feature.split()))
    
    if not features:
        features = ["Quality Construction", "Stylish Design"]
    
    title_lower = title.lower()
    if 'sofa' in title_lower or 'couch' in title_lower:
        best_for = "Perfect for living room relaxation"
    elif 'bed' in title_lower:
        best_for = "Ideal for comfortable sleeping"
    elif 'chair' in title_lower:
        best_for = "Comfortable seating"
    elif 'table' in title_lower:
        best_for = "Functional surface for any space"
    else:
        best_for = "Enhance your living space"
    
    return {"key_features": features, "best_for": best_for}

def format_product_context(products: List[Product]) -> str:
    """Format products for Q&A with full details"""
    if not products:
        return "No products displayed."
    
    context = ""
    for i, p in enumerate(products, 1):
        context += f"\n\nProduct #{i}:"
        context += f"\n  Title: {p.title}"
        context += f"\n  Price: {p.price}"
        if p.brand:
            context += f"\n  Brand: {p.brand}"
        if p.dimensions:
            context += f"\n  Dimensions: {p.dimensions}"
        if p.material:
            context += f"\n  Material: {p.material}"
        if p.color:
            context += f"\n  Color: {p.color}"
        if p.key_features:
            context += f"\n  Features: {', '.join(p.key_features)}"
    return context

def format_product_list_brief(products: List[Product]) -> str:
    """Brief product list for filter parsing"""
    return "\n".join([f"{i+1}. {p.title} - {p.price}" for i, p in enumerate(products)])

@app.post("/recommend")
def recommend_products(query: ConversationalQuery):
    history_text = "\n".join([f"{m.from_user}: {m.text}" for m in query.history[-6:]])
    
    # 1. DETECT INTENT
    try:
        intent_result = ml_models["intent_chain"].invoke({
            "query": query.query,
            "history": history_text
        })
        # Extract first word only to handle verbose LLM responses
        intent = intent_result.strip().split()[0].upper()
        print(f"💡 Intent: {intent}")
    except Exception as e:
        print(f"⚠️ Intent error: {e}")
        intent = "SEARCH"
    
    # 2. GREETING
    if "GREETING" in intent:
        return {
            "type": "greeting",
            "response": "Hello! I can help you find furniture. What are you looking for?"
        }
    
    # 3. QUESTIONS about displayed products
    if "QUESTION" in intent and query.last_products:
        print("❓ Answering question about displayed products")
        try:
            product_context = format_product_context(query.last_products)
            answer = ml_models["qa_chain"].invoke({
                "products": product_context,
                "query": query.query
            })
            return {"type": "answer", "response": answer}
        except Exception as e:
            print(f"⚠️ Q&A error: {e}")
            return {"type": "answer", "response": "Could you rephrase that question?"}
    
    # 4. FOLLOW-UP FILTERS on displayed products
    if "FOLLOW_UP" in intent and query.last_products:
        print("🔄 Filtering displayed products")
        
        # Use LLM to parse filters
        try:
            product_list = format_product_list_brief(query.last_products)
            filter_result = ml_models["followup_chain"].invoke({
                "product_list": product_list,
                "query": query.query
            })
            filters = clean_json(filter_result)
            print(f"🔍 Extracted filters: {filters}")
        except Exception as e:
            print(f"⚠️ Filter parsing error: {e}")
            filters = {}
        
        # Fallback: extract filters from query text if LLM fails
        if not filters:
            query_lower = query.query.lower()
            
            # More robust price extraction
            price_match = re.search(r'(?:under|below|less than|<)\s*\$?\s*(\d+)', query_lower)
            if not price_match:
                price_match = re.search(r'\$?\s*(\d+)\s*\$', query_lower)  # "130$" format
            if price_match:
                filters['price_max'] = float(price_match.group(1))
                print(f"  💰 Extracted price from fallback: {filters['price_max']}")
            
            if any(w in query_lower for w in ['large', 'big', 'oversized']):
                filters['size'] = 'large'
            elif any(w in query_lower for w in ['small', 'compact', 'mini']):
                filters['size'] = 'small'
            
            colors = ['red', 'blue', 'green', 'black', 'white', 'gray', 'grey', 'brown', 'yellow', 'navy', 'beige', 'tan']
            for color in colors:
                if color in query_lower:
                    filters['color'] = color
                    break
            
            materials = ['wood', 'wooden', 'metal', 'fabric', 'leather', 'velvet', 'plastic']
            for material in materials:
                if material in query_lower:
                    filters['material'] = material.replace('wooden', 'wood')
                    break
        
        # Apply filters
        filtered = []
        for product in query.last_products:
            keep = True
            reasons = []
            
            # Price filter
            if filters.get('price_max'):
                price = extract_price(product.price)
                if price and price > filters['price_max']:
                    keep = False
                    reasons.append(f"price ${price:.2f} > ${filters['price_max']}")
            
            # Color filter
            if keep and filters.get('color'):
                color_req = filters['color'].lower()
                title_lower = product.title.lower()
                color_meta = (product.color or '').lower()
                
                if color_req not in title_lower and color_req not in color_meta:
                    keep = False
                    reasons.append(f"color doesn't match '{filters['color']}'")
            
            # Size filter
            if keep and filters.get('size'):
                size = filters['size'].lower()
                title_lower = product.title.lower()
                
                if size == 'large':
                    if not any(w in title_lower for w in ['large', 'oversized', 'big', 'xl', 'king', 'queen']):
                        keep = False
                        reasons.append("not large")
                elif size == 'small':
                    if not any(w in title_lower for w in ['small', 'compact', 'mini', 'twin']):
                        keep = False
                        reasons.append("not small")
            
            # Material filter
            if keep and filters.get('material'):
                material_req = filters['material'].lower()
                title_lower = product.title.lower()
                material_meta = (product.material or '').lower()
                
                if material_req not in title_lower and material_req not in material_meta:
                    keep = False
                    reasons.append(f"material doesn't match '{filters['material']}'")
            
            # Brand filter
            if keep and filters.get('brand'):
                brand_req = filters['brand'].lower()
                brand_meta = (product.brand or '').lower()
                
                if brand_req not in brand_meta:
                    keep = False
                    reasons.append(f"brand doesn't match '{filters['brand']}'")
            
            if keep:
                print(f"  ✅ Kept: {product.title[:60]}")
                filtered.append(product)
            else:
                print(f"  ❌ Filtered out: {product.title[:60]} ({', '.join(reasons)})")
        
        # Return results
        if filtered:
            # Limit to top 3 for follow-up filters too
            filtered = filtered[:3]
            num = len(filtered)
            msg = f"I found {num} product{'s' if num > 1 else ''} matching your criteria:"
            return {
                "type": "products",
                "recommendations": [p.dict() for p in filtered],
                "response": msg
            }
        else:
            # Provide helpful message about why nothing matched
            filter_desc = []
            if filters.get('price_max'):
                filter_desc.append(f"under ${filters['price_max']}")
            if filters.get('color'):
                filter_desc.append(f"in {filters['color']}")
            if filters.get('material'):
                filter_desc.append(f"made of {filters['material']}")
            if filters.get('size'):
                filter_desc.append(f"in {filters['size']} size")
            if filters.get('brand'):
                filter_desc.append(f"from {filters['brand']}")
            
            if filter_desc:
                msg = f"None of the displayed products are {' and '.join(filter_desc)}. Try adjusting your filters."
            else:
                msg = "None of the displayed products match those criteria."
            
            return {
                "type": "no_results",
                "response": msg
            }
    
    # 5. SEARCH - Use LLM to parse, then strict rules to validate
    print("🔎 New product search")
    
    # Parse with LLM
    try:
        query_result = ml_models["query_chain"].invoke({"query": query.query})
        params = clean_json(query_result)
        print(f"📋 LLM parsed: {params}")
    except Exception as e:
        print(f"⚠️ Parse error: {e}")
        params = {"category": "other"}
    
    category = params.get("category", "other")
    
    # Check for non-furniture categories
    if category in ["sports", "electronics"]:
        print(f"❌ Category '{category}' is not furniture")
        return {
            "type": "no_results",
            "response": "I couldn't find any furniture matching your search. This is a furniture store - try searching for sofas, beds, chairs, tables, or other home furnishings."
        }
    
    # If category is unclear, do broad search
    if category == "other":
        search_text = query.query
    else:
        # Use category keywords for better embedding
        category_search = {
            "sofa": "sofa couch sectional living room seating",
            "bed": "bed frame bedroom sleeping",
            "chair": "chair seating dining office",
            "table": "table desk surface",
            "ottoman": "ottoman footstool",
            "storage": "dresser nightstand storage cabinet"
        }
        search_text = category_search.get(category, query.query)
    
    text_embedding = ml_models["text_model"].encode(search_text).tolist()
    query_embedding = text_embedding + [0.0] * 768
    
    print(f"🔎 Searching: '{search_text}' (category: {category})")
    
    # Get candidates from Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=20,
        include_metadata=True
    )
    
    print(f"📊 Pinecone returned {len(results['matches'])} candidates")
    
    if not results['matches']:
        return {
            "type": "no_results",
            "response": "I couldn't find any products."
        }
    
    # INTELLIGENT FILTERING using LLM to understand product titles
    matched_products = []
    
    for match in results['matches']:
        title = match['metadata'].get('title', '')
        
        # Use LLM to classify the product's PRIMARY category
        product_category = classify_product_title(title)
        
        # Check if it matches what user is looking for
        if category != "other" and product_category != category:
            print(f"  ❌ '{title[:80]}...'")
            print(f"     Product is: {product_category}, User wants: {category}")
            continue
        
        print(f"  ✅ '{title[:80]}...'")
        print(f"     Classified as: {product_category} ✓")
        
        # Apply metadata filters
        keep = True
        
        # Material filter
        if params.get('material'):
            material_req = params['material'].lower()
            material_meta = match['metadata'].get('material', '').lower()
            if material_req not in title.lower() and material_req not in material_meta:
                print(f"    ❌ Material mismatch (want: {material_req})")
                keep = False
        
        # Color filter
        if keep and params.get('color'):
            color_req = params['color'].lower()
            color_meta = match['metadata'].get('color', '').lower()
            if color_req not in title.lower() and color_req not in color_meta:
                print(f"    ❌ Color mismatch (want: {color_req})")
                keep = False
        
        # Price filter
        if keep and params.get('price_max'):
            price = extract_price(match['metadata'].get('price', ''))
            if price and price > params['price_max']:
                print(f"    ❌ Price too high: ${price} > ${params['price_max']}")
                keep = False
        
        if keep:
            matched_products.append(match)
    
    print(f"🎯 Final matches: {len(matched_products)} products")
    
    # Check if there's a perfect/near-perfect match (very high similarity score)
    is_perfect_match = False
    if len(matched_products) > 0 and matched_products[0]['score'] > 0.90:
        # Check if first result is significantly better than second
        if len(matched_products) == 1:
            is_perfect_match = True
        elif len(matched_products) > 1 and matched_products[0]['score'] - matched_products[1]['score'] > 0.05:
            is_perfect_match = True
            print(f"🎯 Perfect match detected: score {matched_products[0]['score']} vs {matched_products[1]['score']}")
    
    # Smart limiting based on match quality
    if len(matched_products) == 0:
        # No matches - will return no_results below
        pass
    elif is_perfect_match:
        # One result is significantly better - show only that
        matched_products = matched_products[:1]
        print(f"📦 Returning 1 product (perfect match)")
    elif len(matched_products) == 1:
        # Only 1 match - show it
        print(f"📦 Returning 1 product (only match)")
    elif len(matched_products) == 2:
        # Exactly 2 matches - show both
        print(f"📦 Returning 2 products")
    else:
        # 3 or more matches - show top 3
        matched_products = matched_products[:3]
        print(f"📦 Returning top 3 products")
    
    # Return results
    if not matched_products:
        return {
            "type": "no_results",
            "response": "I couldn't find any furniture matching your search. Try different keywords or filters."
        }
    
    recommendations = []
    for match in matched_products:
        metadata = match['metadata']
        summary = generate_summary(
            metadata.get('title', ''),
            metadata.get('description', '')
        )
        
        recommendations.append({
            "id": match['id'],
            "title": metadata.get('title', 'Product'),
            "image": metadata.get('image'),
            "price": metadata.get('price', 'N/A'),
            "brand": metadata.get('brand'),
            "score": round(match['score'], 3),
            "key_features": summary['key_features'],
            "best_for": summary['best_for'],
            "dimensions": metadata.get('package_dimensions'),
            "material": metadata.get('material'),
            "color": metadata.get('color')
        })
    
    num = len(recommendations)
    if num == 1:
        msg = "I found the perfect match:"
    elif num == 2:
        msg = "I found 2 great options:"
    else:
        msg = f"I found {num} products:"
    
    return {
        "type": "products",
        "recommendations": recommendations,
        "response": msg
    }

@app.get("/analytics")
def get_analytics():
    try:
        stats = index.describe_index_stats()
        total_vectors = stats.get('total_vector_count', 0)
        
        if total_vectors > 0:
            # Fetch sample for analytics (max 1000 in free tier)
            fetch_response = index.query(
                vector=[0.0] * 1152, 
                top_k=min(total_vectors, 1000), 
                include_metadata=True
            )
            df = pd.DataFrame([match['metadata'] for match in fetch_response['matches']])
        else:
            df = pd.DataFrame()

        if not df.empty:
            # Top brands
            top_brands = df['brand'].value_counts().nlargest(10).reset_index()
            top_brands.columns = ['name', 'count']
            
            # Top categories
            all_categories = []
            for cat_str in df['categories'].dropna():
                try:
                    cats = ast.literal_eval(cat_str)
                    if isinstance(cats, list):
                        all_categories.extend(cats)
                except (ValueError, SyntaxError):
                    pass
            
            category_counts = Counter(all_categories)
            top_categories = [
                {"name": cat, "count": count} 
                for cat, count in category_counts.most_common(15)
            ]
            
            # Price analytics
            prices = []
            for price_str in df['price'].dropna():
                match = re.search(r'\d+\.?\d*', str(price_str).replace('$', '').replace(',', ''))
                if match:
                    prices.append(float(match.group()))
            
            # Price distribution (buckets)
            price_distribution = []
            if prices:
                price_ranges = [
                    ("$0-50", 0, 50),
                    ("$50-100", 50, 100),
                    ("$100-200", 100, 200),
                    ("$200-500", 200, 500),
                    ("$500-1000", 500, 1000),
                    ("$1000+", 1000, float('inf'))
                ]
                
                for range_label, min_price, max_price in price_ranges:
                    count = sum(1 for p in prices if min_price <= p < max_price)
                    if count > 0:
                        price_distribution.append({
                            "range": range_label,
                            "count": count
                        })
            
            # Average price
            avg_price = sum(prices) / len(prices) if prices else 0
            
            # Most/Least expensive products
            most_expensive = None
            least_expensive = None
            if prices:
                max_price = max(prices)
                min_price = min(prices)
                
                for _, row in df.iterrows():
                    price_str = str(row.get('price', ''))
                    match = re.search(r'\d+\.?\d*', price_str.replace('$', '').replace(',', ''))
                    if match:
                        price_val = float(match.group())
                        if price_val == max_price and not most_expensive:
                            most_expensive = {
                                "title": row.get('title', 'Unknown'),
                                "price": row.get('price', 'N/A')
                            }
                        if price_val == min_price and not least_expensive:
                            least_expensive = {
                                "title": row.get('title', 'Unknown'),
                                "price": row.get('price', 'N/A')
                            }
            
            # Category metrics for radar chart
            category_metrics = [
                {"category": cat["name"][:15], "count": cat["count"]} 
                for cat in top_categories[:8]
            ]
            
            return {
                "total_products": total_vectors,
                "top_brands": top_brands.to_dict('records'),
                "top_categories": top_categories,
                "price_distribution": price_distribution,
                "average_price": round(avg_price, 2),
                "most_expensive": most_expensive,
                "least_expensive": least_expensive,
                "category_metrics": category_metrics
            }
            
    except Exception as e:
        print(f"Error fetching analytics: {e}")
    
    # Fallback response
    return {
        "total_products": 0,
        "top_brands": [],
        "top_categories": [],
        "price_distribution": [],
        "average_price": 0,
        "most_expensive": None,
        "least_expensive": None,
        "category_metrics": []
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)