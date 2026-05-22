import pytest
from unittest.mock import AsyncMock, patch


def test_events_requires_auth(client):
    resp = client.get("/api/events")
    assert resp.status_code == 401


def test_events_returns_event_stream(auth_client):
    # Mock Redis so pubsub.listen() exits immediately instead of blocking forever.
    # Real Redis integration is covered by manual / E2E testing.
    async def _empty_listen():
        return
        yield  # make it an async generator

    mock_pubsub = AsyncMock()
    mock_pubsub.listen = _empty_listen
    mock_redis = AsyncMock()
    mock_redis.pubsub.return_value = mock_pubsub

    with patch("app.api.events.aioredis.from_url", return_value=mock_redis):
        with auth_client.stream("GET", "/api/events") as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]
            first_line = next(resp.iter_lines())
            assert "connected" in first_line
