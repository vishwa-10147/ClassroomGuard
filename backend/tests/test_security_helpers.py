import pytest

from backend.app.api.uploads import _parse_range
from backend.app.services.webhook_service import _validate_webhook_url


def test_parse_range_supports_bounded_and_suffix_ranges() -> None:
    assert _parse_range("bytes=2-5", 10) == (2, 5)
    assert _parse_range("bytes=7-", 10) == (7, 9)
    assert _parse_range("bytes=-3", 10) == (7, 9)


@pytest.mark.parametrize("header", ["bytes=10-2", "bytes=10-", "bytes=0-1,3-4", "items=0-1"])
def test_parse_range_rejects_invalid_ranges(header: str) -> None:
    with pytest.raises(ValueError):
        _parse_range(header, 10)


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "http://127.0.0.1:8000/internal",
        "http://localhost:8000/internal",
        "https://user:password@example.com/hook",
    ],
)
def test_webhook_url_rejects_unsafe_destinations(url: str) -> None:
    with pytest.raises(ValueError):
        _validate_webhook_url(url)
