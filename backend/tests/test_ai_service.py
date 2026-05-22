import pytest
from unittest.mock import MagicMock, patch
from app.services.ai import extract_receipt_data


def _mock_claude_response(text: str):
    msg = MagicMock()
    msg.content = [MagicMock(text=text)]
    return msg


def test_extract_receipt_data_parses_json():
    response_text = """{
        "vendor": "Supermercado Extra",
        "date": "2026-05-21",
        "total_amount": 287.40,
        "subtotal": 270.00,
        "tax_amount": 17.40,
        "payment_method": "debit",
        "suggested_category": "Alimentação",
        "currency": "BRL",
        "line_items": []
    }"""
    with patch("app.services.ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = _mock_claude_response(response_text)
        result = extract_receipt_data(b"fake-image-bytes")

    assert result["vendor"] == "Supermercado Extra"
    assert result["date"] == "2026-05-21"
    assert result["total_amount"] == 287.40
    assert result["payment_method"] == "debit"
    assert result["suggested_category"] == "Alimentação"


def test_extract_handles_markdown_code_block():
    response_text = '```json\n{"vendor": "Test", "date": null, "total_amount": 10.0, "subtotal": null, "tax_amount": null, "payment_method": null, "suggested_category": null, "currency": "BRL", "line_items": []}\n```'
    with patch("app.services.ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = _mock_claude_response(response_text)
        result = extract_receipt_data(b"fake-image-bytes")
    assert result["vendor"] == "Test"


def test_extract_raises_on_invalid_json():
    with patch("app.services.ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = _mock_claude_response("not json at all")
        with pytest.raises(Exception):
            extract_receipt_data(b"fake-image-bytes")
