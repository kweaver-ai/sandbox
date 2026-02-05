"""
Unit tests for CallbackClient.

Tests the JSON sanitization functionality for handling non-JSON-compliant
float values (NaN, Infinity, -Infinity).
"""

import math
import pytest
from unittest.mock import Mock, patch

from executor.infrastructure.http.callback_client import CallbackClient


class TestSanitizeForJson:
    """Test the _sanitize_for_json method."""

    def setup_method(self):
        """Create a CallbackClient instance for testing."""
        self.client = CallbackClient(
            control_plane_url="http://test.invalid",
            api_token="test-token",
        )

    def test_sanitize_valid_float(self):
        """Test that valid float values are preserved."""
        result = self.client._sanitize_for_json(3.14)
        assert result == 3.14

    def test_sanitize_nan(self):
        """Test that NaN is converted to None."""
        result = self.client._sanitize_for_json(float('nan'))
        assert result is None

    def test_sanitize_positive_infinity(self):
        """Test that positive Infinity is converted to None."""
        result = self.client._sanitize_for_json(float('inf'))
        assert result is None

    def test_sanitize_negative_infinity(self):
        """Test that negative Infinity is converted to None."""
        result = self.client._sanitize_for_json(float('-inf'))
        assert result is None

    def test_sanitize_nested_dict_with_nan(self):
        """Test sanitization of nested dictionaries with NaN values."""
        data = {
            "valid": 1.5,
            "nested": {
                "value": float('nan'),
                "other": "string",
            },
            "list": [float('inf'), 2.0],
        }
        result = self.client._sanitize_for_json(data)

        assert result["valid"] == 1.5
        assert result["nested"]["value"] is None
        assert result["nested"]["other"] == "string"
        assert result["list"][0] is None
        assert result["list"][1] == 2.0

    def test_sanitize_list_with_invalid_floats(self):
        """Test sanitization of lists with invalid float values."""
        data = [float('nan'), 1.0, float('inf'), float('-inf'), 2.5]
        result = self.client._sanitize_for_json(data)

        assert result == [None, 1.0, None, None, 2.5]

    def test_sanitize_none_value(self):
        """Test that None values are preserved."""
        result = self.client._sanitize_for_json(None)
        assert result is None

    def test_sanitize_string(self):
        """Test that string values are preserved."""
        result = self.client._sanitize_for_json("test")
        assert result == "test"

    def test_sanitize_integer(self):
        """Test that integer values are preserved."""
        result = self.client._sanitize_for_json(42)
        assert result == 42

    def test_sanitize_boolean(self):
        """Test that boolean values are preserved."""
        result = self.client._sanitize_for_json(True)
        assert result is True
        result = self.client._sanitize_for_json(False)
        assert result is False

    def test_sanitize_empty_dict(self):
        """Test that empty dictionaries are preserved."""
        result = self.client._sanitize_for_json({})
        assert result == {}

    def test_sanitize_empty_list(self):
        """Test that empty lists are preserved."""
        result = self.client._sanitize_for_json([])
        assert result == []
