def test_events_requires_auth(client):
    resp = client.get("/api/events")
    assert resp.status_code == 401


def test_events_returns_event_stream(auth_client):
    # Open SSE connection — TestClient reads first chunk then closes
    with auth_client.stream("GET", "/api/events", timeout=5.0) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        # Should receive the initial connected event
        first_line = next(resp.iter_lines())
        assert "connected" in first_line
