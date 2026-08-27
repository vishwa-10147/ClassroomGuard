from __future__ import annotations

import re
import unicodedata
from typing import Any


def strip_html_tags(value: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", value)


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strip HTML tags, normalize unicode, and enforce max length."""
    cleaned = strip_html_tags(value)
    cleaned = unicodedata.normalize("NFC", cleaned)
    cleaned = cleaned.strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename by removing unsafe characters."""
    cleaned = filename.strip()
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", cleaned)
    cleaned = re.sub(r"\.{2,}", ".", cleaned)
    cleaned = cleaned.strip(". ")
    if not cleaned:
        cleaned = "unnamed"
    return cleaned[:255]


def validate_email(email: str) -> str:
    """Basic email format validation."""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        raise ValueError("Invalid email format")
    return email.strip().lower()


def sanitize_input(data: dict[str, Any], string_fields: dict[str, int] | None = None) -> dict[str, Any]:
    """Sanitize string fields in a dictionary."""
    if string_fields is None:
        string_fields = {}
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            max_len = string_fields.get(key, 500)
            result[key] = sanitize_string(value, max_length=max_len)
        else:
            result[key] = value
    return result
