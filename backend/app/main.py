from fastapi import FastAPI
from app.api import auth, receipts, events, expenses, reports

app = FastAPI(title="Recibo42 API")
app.include_router(auth.router)
app.include_router(receipts.router)
app.include_router(events.router)
app.include_router(expenses.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
