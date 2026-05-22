import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
import app.models  # noqa: F401 — registers all models with Base
import os

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://recibo42:recibo42@localhost:5433/recibo42_test",
)


@pytest.fixture(scope="session")
def engine():
    _engine = create_engine(TEST_DB_URL)
    Base.metadata.create_all(_engine)
    yield _engine
    Base.metadata.drop_all(_engine)


@pytest.fixture
def db(engine):
    with engine.connect() as connection:
        with connection.begin():
            Session = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=connection,
                join_transaction_mode="create_savepoint",
            )
            session = Session()
            yield session
            session.close()
            # connection.begin() context manager rolls back on exit


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client):
    client.post("/api/auth/register", json={
        "email": "test@recibo42.com",
        "password": "testpassword123",
    })
    client.post("/api/auth/login", json={
        "email": "test@recibo42.com",
        "password": "testpassword123",
    })
    return client
