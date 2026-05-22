from celery import Celery
from app.config import settings

celery = Celery(
    "recibo42",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)
celery.conf.task_serializer = "json"
celery.conf.result_serializer = "json"
celery.conf.accept_content = ["json"]
