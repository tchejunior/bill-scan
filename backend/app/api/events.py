import asyncio
import json
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
async def event_stream(current_user=Depends(get_current_user)):
    user_id = str(current_user.id)

    async def generator():
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        pubsub = r.pubsub()
        channel = f"user:{user_id}:events"
        await pubsub.subscribe(channel)
        try:
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
                    await asyncio.sleep(0)
        except BaseException:
            raise
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
