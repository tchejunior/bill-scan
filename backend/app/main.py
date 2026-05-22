from fastapi import FastAPI

app = FastAPI(title="Recibo42 API")


@app.get("/api/health")
def health():
    return {"status": "ok"}
