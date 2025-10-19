# Recommendation System

# FurniFind — Recommendation System

A small end-to-end furniture recommendation project:
- Backend API (FastAPI + Pinecone + SentenceTransformers + Groq LLM chains): [backend/app/main.py](backend/app/main.py) — see functions [`app.recommend_products`](backend/app/main.py), [`app.get_analytics`](backend/app/main.py) and lifecycle [`lifespan`](backend/app/main.py).
- Frontend (React + Vite): [frontend/src](frontend/src) — key components: [`ChatPage`](frontend/src/components/ChatPage.jsx), [`AnalyticsPage`](frontend/src/components/AnalyticsPage.jsx).
- Data & training notebooks: [Training/generate_embeddings.ipynb](Training/generate_embeddings.ipynb).
- Dependencies and deployment config: [backend/requirements.txt](backend/requirements.txt), [backend/Procfile](backend/Procfile).

## Features
- Natural-language conversational search and follow-up filtering.
- Embedding search powered by Pinecone.
- Product analytics endpoint for dashboards.
- Frontend chat UI with product cards and lightbox.

## Quickstart (local)

1. Create & activate a Python virtual environment (recommended):
```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

3. Configure environment variables (edit `backend/.env`):
- GROQ_API_KEY — Groq LLM key used by [`lifespan`](backend/app/main.py)
- PINECONE_API_KEY — Pinecone API key (used by `pc = Pinecone(...)` in [backend/app/main.py](backend/app/main.py))
- INDEX_NAME — Pinecone index name

Make sure [backend/.env](backend/.env) contains these values before starting the server.

4. Run backend (from project root or the `backend` folder):
```bash
# from repo root:
uvicorn app.main:app --reload --app-dir backend
# or from backend/:
uvicorn app.main:app --reload
```

The API endpoints are implemented in [backend/app/main.py](backend/app/main.py): the main route for recommendations is implemented as [`app.recommend_products`](backend/app/main.py) and analytics as [`app.get_analytics`](backend/app/main.py).

5. Start frontend:
```bash
cd frontend
npm install
npm run dev
```
Open the frontend at the printed Vite URL (default: http://localhost:5173). Frontend posts to the backend `/recommend` endpoint used by [`ChatPage`](frontend/src/components/ChatPage.jsx).

## API (brief)
- POST /recommend — conversational search; see implementation: [`app.recommend_products`](backend/app/main.py).
- GET /analytics — returns aggregated metrics from Pinecone; implementation: [`app.get_analytics`](backend/app/main.py).

See the server code: [backend/app/main.py](backend/app/main.py).

## Data & embeddings
- Source CSVs and processing notebook: [Training/generate_embeddings.ipynb](Training/generate_embeddings.ipynb).
- Notebook uploads embeddings to Pinecone and stores metadata fields (title, description, price, categories, brand, material, color, package_dimensions) used by the API.

## Troubleshooting

- "Could not import module 'app.main'": this usually means an exception occurred during import. Common causes in this project:
  - Missing environment variables (e.g., `GROQ_API_KEY`, `PINECONE_API_KEY`, `INDEX_NAME`) required at import or at startup in [backend/app/main.py](backend/app/main.py).
  - Missing packages (install via [backend/requirements.txt](backend/requirements.txt)).
  - Pinecone or heavy model initialization failing at import time (the file uses a startup lifespan to load LLMs, but the Pinecone client is created at module level). To debug:
    ```bash
    # run from backend/ directory to see full traceback
    python -c "import app.main"
    ```
    Check the traceback and ensure env vars and packages are present.

## Notes & tips
- The LLM chains (intent, query parsing, QA) are created in the FastAPI lifespan in [backend/app/main.py](backend/app/main.py) — see [`lifespan`](backend/app/main.py).
- Pinecone index dimension used in the project is set by the embedding pipeline in the training notebook; ensure the same `INDEX_NAME` is used between training and runtime.
- If you modify embeddings or metadata, re-run [Training/generate_embeddings.ipynb](Training/generate_embeddings.ipynb).

## Contributing
- Backend: edit [backend/app/main.py](backend/app/main.py).
- Frontend: edit [frontend/src/components/ChatPage.jsx](frontend/src/components/ChatPage.jsx) and [frontend/src/components/AnalyticsPage.jsx](frontend/src/components/AnalyticsPage.jsx).

## License
MIT — see [LICENSE](LICENSE)

