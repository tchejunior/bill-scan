from app.worker.celery_app import celery


@celery.task
def process_receipt(receipt_id: str):
    pass
