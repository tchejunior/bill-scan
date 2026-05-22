from fastapi import FastAPI, Depends
from app.api import auth
from app.api.deps import get_current_user
from app.models.user import User

app = FastAPI(title="Recibo42 API")
app.include_router(auth.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/expenses")
def expenses_stub(current_user: User = Depends(get_current_user)):
    return []
