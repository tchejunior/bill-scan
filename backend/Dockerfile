FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf-2.0-0 \
    libffi-dev libcairo2 libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
