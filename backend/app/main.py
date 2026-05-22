from fastapi import FastAPI
from app.api import auth

app = FastAPI(title="Recibo42 API")
app.include_router(auth.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
