from unittest.mock import AsyncMock, MagicMock, patch


def test_events_requires_auth(client):
    resp = client.get("/api/events")
    assert resp.status_code == 401


def test_events_returns_event_stream(auth_client):
    # r.pubsub() is a sync call so r must be MagicMock (not AsyncMock).
    # Only the awaited methods (subscribe, unsubscribe, aclose) need AsyncMock.
    async def _empty_listen():
        return
        yield

    mock_pubsub = MagicMock()
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    mock_pubsub.listen = _empty_listen

    mock_redis = MagicMock()
    mock_redis.pubsub.return_value = mock_pubsub
    mock_redis.aclose = AsyncMock()

    with patch("app.api.events.aioredis.from_url", return_value=mock_redis):
        with auth_client.stream("GET", "/api/events") as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]
            first_line = next(resp.iter_lines())
            assert "connected" in first_line
