from sqlalchemy import inspect


def test_all_tables_exist(engine):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "users" in tables
    assert "receipts" in tables
    assert "expenses" in tables
