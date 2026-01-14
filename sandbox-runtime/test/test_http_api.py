import pytest
import asyncio
import json
import sys
from unittest.mock import patch, MagicMock, AsyncMock
from aiohttp import ClientResponse
import requests
from sandbox_runtime.utils.http_api import API, HTTPMethod, Config
from sandbox_runtime.errors import SandboxError

if sys.platform.startswith("win"):
    pytest.skip(
        "Skipping http_api tests on Windows",
        allow_module_level=True,
    )


class TestAPIInitialization:
    """测试 API 类的初始化"""

    def test_api_initialization_default(self):
        """测试 API 类的默认初始化"""
        api = API(url="https://api.example.com/test")

        assert api.url == "https://api.example.com/test"
        assert api.params == {}
        assert api.payload is None
        assert api.data is None
        assert api.headers == {}
        assert api.method == HTTPMethod.GET

    def test_api_initialization_with_params(self):
        """测试带参数的 API 初始化"""
        api = API(
            url="https://api.example.com/test",
            params={"key": "value"},
            payload={"data": "test"},
            headers={"Content-Type": "application/json"},
            method=HTTPMethod.POST,
        )

        assert api.url == "https://api.example.com/test"
        assert api.params == {"key": "value"}
        assert api.payload == {"data": "test"}
        assert api.headers == {"Content-Type": "application/json"}
        assert api.method == HTTPMethod.POST

    def test_config_enum(self):
        """测试 Config 枚举"""
        assert Config.TIMES.value == 3
        assert Config.timeout.value == 300


class TestHTTPMethod:
    """测试 HTTP 方法"""

    def test_http_methods(self):
        """测试 HTTP 方法常量"""
        assert HTTPMethod.GET == "GET"
        assert HTTPMethod.POST == "POST"


class TestAPICallSync:
    """测试同步 API 调用"""

    @patch("requests.get")
    def test_get_request_success(self, mock_get):
        """测试成功的 GET 请求"""
        # 模拟响应
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "success"}
        mock_get.return_value = mock_response

        api = API(url="https://api.example.com/test")
        result = api.call()

        assert result == {"message": "success"}
        mock_get.assert_called_once_with(
            "https://api.example.com/test",
            params=None,
            headers={},
            timeout=300,
            verify=False,
        )

    @patch("requests.get")
    def test_get_request_with_params(self, mock_get):
        """测试带参数的 GET 请求"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "success"}
        mock_get.return_value = mock_response

        api = API(
            url="https://api.example.com/test",
            payload={"param1": "value1", "param2": "value2"},
            headers={"Authorization": "Bearer token"},
        )
        result = api.call(timeout=60, verify=True)

        assert result == {"message": "success"}
        mock_get.assert_called_once_with(
            "https://api.example.com/test",
            params={"param1": "value1", "param2": "value2"},
            headers={"Authorization": "Bearer token"},
            timeout=60,
            verify=True,
        )

    @patch("requests.post")
    def test_post_request_success(self, mock_post):
        """测试成功的 POST 请求"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "created"}
        mock_post.return_value = mock_response

        api = API(
            url="https://api.example.com/test",
            method=HTTPMethod.POST,
            params={"param1": "value1"},
            payload={"data": "test data"},
            data="raw data",
            headers={"Content-Type": "application/json"},
        )
        result = api.call()

        assert result == {"message": "created"}
        mock_post.assert_called_once_with(
            "https://api.example.com/test",
            params={"param1": "value1"},
            json={"data": "test data"},
            data="raw data",
            headers={"Content-Type": "application/json"},
            timeout=300,
            verify=False,
        )

    @patch("requests.get")
    def test_get_request_raw_content(self, mock_get):
        """测试获取原始内容的 GET 请求"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"raw binary content"
        mock_get.return_value = mock_response

        api = API(url="https://api.example.com/test")
        result = api.call(raw_content=True)

        assert result == b"raw binary content"

    @patch("requests.get")
    def test_get_request_error_status(self, mock_get):
        """测试错误状态的 GET 请求"""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.reason = "Not Found"
        mock_response.json.return_value = {"error": "Resource not found"}
        mock_get.return_value = mock_response

        api = API(url="https://api.example.com/test")

        with pytest.raises(SandboxError) as exc_info:
            api.call()

        error = exc_info.value
        assert error.extra["url"] == "https://api.example.com/test"
        assert error.extra["status"] == 404
        assert error.extra["reason"] == "Not Found"
        assert error.extra["detail"] == {"error": "Resource not found"}

    @patch("requests.get")
    def test_get_request_error_status_no_json(self, mock_get):
        """测试错误状态且无法解析 JSON 的 GET 请求"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.reason = "Internal Server Error"
        mock_response.json.side_effect = json.decoder.JSONDecodeError(
            "Invalid JSON", "", 0
        )
        mock_get.return_value = mock_response

        api = API(url="https://api.example.com/test")

        with pytest.raises(SandboxError) as exc_info:
            api.call()

        error = exc_info.value
        assert error.extra["url"] == "https://api.example.com/test"
        assert error.extra["status"] == 500
        assert error.extra["reason"] == "Internal Server Error"
        assert error.extra["detail"] == {}

    def test_unsupported_method(self):
        """测试不支持的方法"""
        api = API(url="https://api.example.com/test", method="PUT")

        with pytest.raises(SandboxError) as exc_info:
            api.call()

        error = exc_info.value
        assert error.message == "method not support"
        assert error.extra["url"] == "https://api.example.com/test"


class TestAPICallAsync:
    """测试异步 API 调用"""

    @pytest.mark.asyncio
    async def test_get_request_async_success(self):
        """测试成功的异步 GET 请求"""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"message": "success"})
        mock_response.read = AsyncMock(return_value=b"raw content")

        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(url="https://api.example.com/test")
            result = await api.call_async()

            assert result == {"message": "success"}

    @pytest.mark.asyncio
    async def test_get_request_async_with_params(self):
        """测试带参数的异步 GET 请求"""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"message": "success"})

        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(
                url="https://api.example.com/test",
                params={"param1": "value1"},
                headers={"Authorization": "Bearer token"},
            )
            result = await api.call_async(timeout=60, verify=True)

            assert result == {"message": "success"}

    @pytest.mark.asyncio
    async def test_post_request_async_success(self):
        """测试成功的异步 POST 请求"""
        mock_response = AsyncMock()
        mock_response.status = 201  # 测试 2xx 状态码
        mock_response.json = AsyncMock(return_value={"message": "created"})

        mock_session = AsyncMock()
        mock_session.post.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(
                url="https://api.example.com/test",
                method=HTTPMethod.POST,
                params={"param1": "value1"},
                payload={"data": "test data"},
                data="raw data",
                headers={"Content-Type": "application/json"},
            )
            result = await api.call_async()

            assert result == {"message": "created"}

    @pytest.mark.asyncio
    async def test_get_request_async_raw_content(self):
        """测试获取原始内容的异步 GET 请求"""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.read = AsyncMock(return_value=b"raw binary content")

        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(url="https://api.example.com/test")
            result = await api.call_async(raw_content=True)

            assert result == b"raw binary content"

    @pytest.mark.asyncio
    async def test_get_request_async_error_status(self):
        """测试错误状态的异步 GET 请求"""
        mock_response = AsyncMock()
        mock_response.status = 404
        mock_response.reason = "Not Found"
        mock_response.json = AsyncMock(return_value={"error": "Resource not found"})

        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(url="https://api.example.com/test")

            with pytest.raises(SandboxError) as exc_info:
                await api.call_async()

            error = exc_info.value
            assert error.extra["url"] == "https://api.example.com/test"
            assert error.extra["status"] == 404
            assert error.extra["reason"] == "Not Found"
            assert error.extra["detail"] == {"error": "Resource not found"}

    @pytest.mark.asyncio
    async def test_get_request_async_error_status_no_json(self):
        """测试错误状态且无法解析 JSON 的异步 GET 请求"""
        mock_response = AsyncMock()
        mock_response.status = 500
        mock_response.reason = "Internal Server Error"
        mock_response.json = AsyncMock(
            side_effect=requests.exceptions.JSONDecodeError("Invalid JSON", "", 0)
        )

        mock_session = AsyncMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(url="https://api.example.com/test")

            with pytest.raises(SandboxError) as exc_info:
                await api.call_async()

            error = exc_info.value
            assert error.extra["url"] == "https://api.example.com/test"
            assert error.extra["status"] == 500
            assert error.extra["reason"] == "Internal Server Error"
            assert error.extra["detail"] == {}

    @pytest.mark.asyncio
    async def test_post_request_async_error_status_json_decode_error(self):
        """测试 POST 请求错误状态且 JSON 解码错误"""
        mock_response = AsyncMock()
        mock_response.status = 400
        mock_response.reason = "Bad Request"
        mock_response.json = AsyncMock(
            side_effect=json.decoder.JSONDecodeError("Invalid JSON", "", 0)
        )

        mock_session = AsyncMock()
        mock_session.post.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            api = API(url="https://api.example.com/test", method=HTTPMethod.POST)

            with pytest.raises(SandboxError) as exc_info:
                await api.call_async()

            error = exc_info.value
            assert error.extra["url"] == "https://api.example.com/test"
            assert error.extra["status"] == 400
            assert error.extra["reason"] == "Bad Request"
            assert error.extra["detail"] == json.decoder.JSONDecodeError(
                "Invalid JSON", "", 0
            )

    @pytest.mark.asyncio
    async def test_unsupported_method_async(self):
        """测试不支持的异步方法"""
        api = API(url="https://api.example.com/test", method="PUT")

        with pytest.raises(SandboxError) as exc_info:
            await api.call_async()

        error = exc_info.value
        assert error.message == "method not support"
        assert error.extra["url"] == "https://api.example.com/test"


class TestAPIEdgeCases:
    """测试边界情况"""

    def test_empty_payload_and_data(self):
        """测试空的 payload 和 data"""
        api = API(
            url="https://api.example.com/test",
            method=HTTPMethod.POST,
            payload=None,
            data=None,
        )

        assert api.payload is None
        assert api.data is None

    def test_list_payload(self):
        """测试列表类型的 payload"""
        api = API(
            url="https://api.example.com/test",
            method=HTTPMethod.POST,
            payload=[1, 2, 3, {"key": "value"}],
        )

        assert api.payload == [1, 2, 3, {"key": "value"}]

    def test_custom_timeout(self):
        """测试自定义超时时间"""
        api = API(url="https://api.example.com/test")

        with patch("requests.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"message": "success"}
            mock_get.return_value = mock_response

            api.call(timeout=120)

            mock_get.assert_called_once_with(
                "https://api.example.com/test",
                params=None,
                headers={},
                timeout=120,
                verify=False,
            )


class TestAPIIntegration:
    """集成测试"""

    @pytest.mark.asyncio
    async def test_sync_and_async_consistency(self):
        """测试同步和异步调用的一致性"""
        # 这里可以添加真实 API 调用的集成测试
        # 但由于需要真实的服务器，这里只做结构测试
        pass

    def test_api_with_real_httpbin(self):
        """使用 httpbin.org 进行真实测试（可选）"""
        # 注意：这个测试需要网络连接
        # 可以通过 pytest -m "not real_api" 跳过
        pytest.skip("跳过真实 API 测试，需要网络连接")


# 运行测试的辅助函数
def run_tests():
    """运行所有测试"""
    pytest.main([__file__, "-v"])


if __name__ == "__main__":
    run_tests()
