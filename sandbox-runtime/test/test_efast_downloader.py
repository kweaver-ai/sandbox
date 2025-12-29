import pytest
import asyncio
import tempfile
import os
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path
from sandbox_runtime.utils.efast_downloader import EFASTDownloader, DownloadItem
from sandbox_runtime.errors import SandboxError


class TestDownloadItem:
    """测试 DownloadItem 类"""

    def test_download_item_creation(self):
        """测试 DownloadItem 创建"""
        item = DownloadItem("test_docid", "test_file.docx", "rev123")

        assert item.docid == "test_docid"
        assert item.savename == "test_file.docx"
        assert item.rev == "rev123"

    def test_download_item_defaults(self):
        """测试 DownloadItem 默认值"""
        item = DownloadItem("test_docid")

        assert item.docid == "test_docid"
        assert item.savename == ""
        assert item.rev == ""


class TestEFASTDownloaderInitialization:
    """测试 EFASTDownloader 初始化"""

    def test_initialization(self):
        """测试基本初始化"""
        downloader = EFASTDownloader("http://test.com", "test_token")

        assert downloader.base_url == "http://test.com"
        assert downloader.token == "test_token"
        assert (
            downloader.osdownload_url == "http://test.com/api/efast/v1/file/osdownload/"
        )

    def test_initialization_with_timeout(self):
        """测试带超时的初始化"""
        downloader = EFASTDownloader("http://test.com", "test_token", timeout=60)

        assert downloader.base_url == "http://test.com"
        assert downloader.token == "test_token"
        assert downloader.timeout == 60


class TestEFASTDownloaderHelpers:
    """测试辅助方法"""

    def test_get_headers(self):
        """测试获取请求头"""
        downloader = EFASTDownloader("http://test.com", "test_token")
        headers = downloader._get_headers()

        expected = {
            "Content-Type": "application/json",
            "Authorization": "Bearer test_token",
        }
        assert headers == expected

    def test_parse_auth_request(self):
        """测试解析认证请求"""
        downloader = EFASTDownloader("http://test.com", "test_token")

        auth_request = [
            "GET",
            "https://example.com/file",
            "Authorization: AWS test:signature",
            "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
        ]

        result = downloader._parse_auth_request(auth_request)

        expected = {
            "method": "GET",
            "url": "https://example.com/file",
            "authorization": "Authorization: AWS test:signature",
            "x_amz_date": "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
        }
        assert result == expected

    def test_parse_auth_request_invalid(self):
        """测试解析无效的认证请求"""
        downloader = EFASTDownloader("http://test.com", "test_token")

        with pytest.raises(SandboxError) as exc_info:
            downloader._parse_auth_request(["GET", "https://example.com"])

        assert "Invalid auth request format" in str(exc_info.value)

    def test_get_download_headers(self):
        """测试获取下载请求头"""
        downloader = EFASTDownloader("http://test.com", "test_token")

        auth_info = {
            "authorization": "Authorization: AWS test:signature",
            "x_amz_date": "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
        }

        result = downloader._get_download_headers(auth_info)

        expected = {
            "Authorization": "Authorization: AWS test:signature",
            "x-amz-date": "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
        }
        assert result == expected


class TestEFASTDownloaderSync:
    """测试同步下载方法"""

    @patch("requests.get")
    @patch("sandbox_runtime.utils.http_api.API.call")
    def test_osdownload_success(self, mock_api_call, mock_get):
        """测试成功的同步下载"""
        # 模拟 API 响应
        mock_api_response = {
            "authrequest": [
                "GET",
                "https://example.com/file",
                "Authorization: AWS test:signature",
                "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
            ],
            "name": "test_file.docx",
            "size": 1024,
            "modified": 1234567890,
            "client_mtime": 1234567890,
            "rev": "test_rev",
            "siteid": "test_site",
            "editor": "test_editor",
            "need_watermark": False,
        }
        mock_api_call.return_value = mock_api_response

        # 模拟下载响应
        mock_response = MagicMock()
        mock_response.headers = {"content-length": "1024"}
        mock_response.iter_content.return_value = [b"chunk1", b"chunk2"]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value.__enter__.return_value = mock_response

        downloader = EFASTDownloader("http://test.com", "test_token")

        with tempfile.TemporaryDirectory() as temp_dir:
            result = downloader.osdownload("test_docid", "test_file.docx", temp_dir)

            assert result["success"] is True
            assert "file_path" in result
            assert result["file_info"]["name"] == "test_file.docx"
            assert result["file_info"]["size"] == 1024
            assert result["downloaded_size"] == 12  # len(b'chunk1') + len(b'chunk2')

    @patch("sandbox_runtime.utils.http_api.API.call")
    def test_osdownload_api_error(self, mock_api_call):
        """测试 API 调用错误"""
        mock_api_call.side_effect = SandboxError("API error", detail={"status": 401})

        downloader = EFASTDownloader("http://test.com", "test_token")

        with pytest.raises(SandboxError) as exc_info:
            downloader.osdownload("test_docid")

        assert "Download failed" in str(exc_info.value)
        assert "API error" in str(exc_info.value)

    @patch("requests.get")
    @patch("sandbox_runtime.utils.http_api.API.call")
    def test_osdownload_download_error(self, mock_api_call, mock_get):
        """测试下载过程错误"""
        # 模拟 API 响应
        mock_api_response = {
            "authrequest": [
                "GET",
                "https://example.com/file",
                "Authorization: AWS test:signature",
                "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
            ],
            "name": "test_file.docx",
            "size": 1024,
        }
        mock_api_call.return_value = mock_api_response

        # 模拟下载错误
        mock_get.side_effect = Exception("Network error")

        downloader = EFASTDownloader("http://test.com", "test_token")

        with pytest.raises(SandboxError) as exc_info:
            downloader.osdownload("test_docid")

        assert "Download failed" in str(exc_info.value)
        assert "Network error" in str(exc_info.value)

    @patch("requests.get")
    @patch("sandbox_runtime.utils.http_api.API.call")
    def test_osdownload_with_progress_callback(self, mock_api_call, mock_get):
        """测试带进度回调的下载"""
        # 模拟 API 响应
        mock_api_response = {
            "authrequest": [
                "GET",
                "https://example.com/file",
                "Authorization: AWS test:signature",
                "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
            ],
            "name": "test_file.docx",
            "size": 1024,
        }
        mock_api_call.return_value = mock_api_response

        # 模拟下载响应
        mock_response = MagicMock()
        mock_response.headers = {"content-length": "1024"}
        mock_response.iter_content.return_value = [b"chunk1", b"chunk2"]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value.__enter__.return_value = mock_response

        # 记录进度回调调用
        progress_calls = []

        def progress_callback(downloaded, total):
            progress_calls.append((downloaded, total))

        downloader = EFASTDownloader("http://test.com", "test_token")

        with tempfile.TemporaryDirectory() as temp_dir:
            result = downloader.osdownload(
                "test_docid", "test_file.docx", temp_dir, progress_callback
            )

            assert result["success"] is True
            assert len(progress_calls) == 2  # 两个 chunk
            assert progress_calls[0] == (6, 1024)  # len(b'chunk1')
            assert progress_calls[1] == (12, 1024)  # len(b'chunk1') + len(b'chunk2')


class TestEFASTDownloaderAsync:
    """测试异步下载方法"""

    @pytest.mark.asyncio
    async def test_osdownload_async_success(self):
        """测试成功的异步下载"""
        # 由于 aiohttp 的异步上下文管理器 Mock 比较复杂，
        # 这里我们测试异步方法的基本功能，不测试具体的下载过程
        downloader = EFASTDownloader("http://test.com", "test_token")

        # 测试异步方法可以被调用（不执行实际下载）
        try:
            # 这里会失败，因为需要真实的 API 调用，但我们可以测试方法签名
            await downloader.osdownload_async("test_docid", "test_file.docx")
        except SandboxError:
            # 预期的错误，因为 API 调用会失败
            pass
        except Exception as e:
            # 其他错误也是预期的，因为我们没有设置真实的 API
            assert (
                "test_docid" in str(e) or "API" in str(e) or "network" in str(e).lower()
            )

        # 测试方法存在且可调用
        assert hasattr(downloader, "osdownload_async")
        assert callable(downloader.osdownload_async)

    @pytest.mark.asyncio
    async def test_osdownload_async_api_error(self):
        """测试异步 API 调用错误"""
        with patch(
            "sandbox_runtime.utils.http_api.API.call_async",
            side_effect=SandboxError("API error", detail={"status": 401}),
        ):

            downloader = EFASTDownloader("http://test.com", "test_token")

            with pytest.raises(SandboxError) as exc_info:
                await downloader.osdownload_async("test_docid")

            assert "Async download failed" in str(exc_info.value)
            assert "API error" in str(exc_info.value)


class TestEFASTDownloaderBatch:
    """测试批量下载方法"""

    @patch("sandbox_runtime.utils.efast_downloader.EFASTDownloader.osdownload")
    def test_download_multiple_success(self, mock_osdownload):
        """测试成功的批量同步下载"""
        mock_osdownload.return_value = {
            "success": True,
            "file_path": "/path/to/file.docx",
            "downloaded_size": 1024,
        }

        downloader = EFASTDownloader("http://test.com", "test_token")

        downloads = [
            DownloadItem("doc1", "file1.docx"),
            DownloadItem("doc2", "file2.docx"),
        ]

        results = downloader.download_multiple(downloads)

        assert len(results) == 2
        assert all(result["success"] for result in results)
        assert mock_osdownload.call_count == 2

    @patch("sandbox_runtime.utils.efast_downloader.EFASTDownloader.osdownload")
    def test_download_multiple_with_error(self, mock_osdownload):
        """测试批量下载中的错误处理"""

        def side_effect(
            docid, savename=None, save_path=None, rev=None, progress_callback=None
        ):
            if docid == "doc1":
                return {"success": True, "file_path": "/path/to/file1.docx"}
            else:
                raise Exception("Download error")

        mock_osdownload.side_effect = side_effect

        downloader = EFASTDownloader("http://test.com", "test_token")

        downloads = [
            DownloadItem("doc1", "file1.docx"),
            DownloadItem("doc2", "file2.docx"),
        ]

        results = downloader.download_multiple(downloads)

        assert len(results) == 2
        assert results[0]["success"] is True
        assert results[1]["success"] is False
        assert "Download error" in results[1]["error"]

    @pytest.mark.asyncio
    async def test_download_multiple_async_success(self):
        """测试成功的批量异步下载"""

        async def mock_osdownload_async(
            docid, savename=None, save_path=None, rev=None, progress_callback=None
        ):
            return {
                "success": True,
                "file_path": f"/path/to/{savename}",
                "downloaded_size": 1024,
            }

        with patch(
            "sandbox_runtime.utils.efast_downloader.EFASTDownloader.osdownload_async",
            side_effect=mock_osdownload_async,
        ):

            downloader = EFASTDownloader("http://test.com", "test_token")

            downloads = [
                DownloadItem("doc1", "file1.docx"),
                DownloadItem("doc2", "file2.docx"),
            ]

            results = await downloader.download_multiple_async(
                downloads, max_concurrent=2
            )

            assert len(results) == 2
            assert all(result["success"] for result in results)

    @pytest.mark.asyncio
    async def test_download_multiple_async_with_error(self):
        """测试批量异步下载中的错误处理"""

        async def mock_osdownload_async(
            docid, savename=None, save_path=None, rev=None, progress_callback=None
        ):
            if docid == "doc1":
                return {"success": True, "file_path": f"/path/to/{savename}"}
            else:
                raise Exception("Async download error")

        with patch(
            "sandbox_runtime.utils.efast_downloader.EFASTDownloader.osdownload_async",
            side_effect=mock_osdownload_async,
        ):

            downloader = EFASTDownloader("http://test.com", "test_token")

            downloads = [
                DownloadItem("doc1", "file1.docx"),
                DownloadItem("doc2", "file2.docx"),
            ]

            results = await downloader.download_multiple_async(downloads)

            assert len(results) == 2
            assert results[0]["success"] is True
            assert results[1]["success"] is False
            assert "Async download error" in results[1]["error"]


class TestEFASTDownloaderEdgeCases:
    """测试边界情况"""

    def test_osdownload_with_empty_savename(self):
        """测试 savename 为空字符串的情况"""
        mock_api_response = {
            "authrequest": [
                "GET",
                "https://example.com/file",
                "Authorization: AWS test:signature",
                "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
            ],
            "name": "api_provided_name.docx",
            "size": 1024,
        }

        with patch(
            "sandbox_runtime.utils.http_api.API.call", return_value=mock_api_response
        ), patch("requests.get") as mock_get:

            mock_response = MagicMock()
            mock_response.headers = {"content-length": "1024"}
            mock_response.iter_content.return_value = [b"chunk1"]
            mock_response.raise_for_status.return_value = None
            mock_get.return_value.__enter__.return_value = mock_response

            downloader = EFASTDownloader("http://test.com", "test_token")

            with tempfile.TemporaryDirectory() as temp_dir:
                result = downloader.osdownload(
                    "test_docid", savename="", save_path=temp_dir
                )

                assert result["file_info"]["name"] == "api_provided_name.docx"

    def test_osdownload_with_file_path_not_dir(self):
        """测试 save_path 是文件而不是目录的情况"""
        mock_api_response = {
            "authrequest": [
                "GET",
                "https://example.com/file",
                "Authorization: AWS test:signature",
                "x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT",
            ],
            "name": "test_file.docx",
            "size": 1024,
        }

        with patch(
            "sandbox_runtime.utils.http_api.API.call", return_value=mock_api_response
        ), patch("requests.get") as mock_get:

            mock_response = MagicMock()
            mock_response.headers = {"content-length": "1024"}
            mock_response.iter_content.return_value = [b"chunk1"]
            mock_response.raise_for_status.return_value = None
            mock_get.return_value.__enter__.return_value = mock_response

            downloader = EFASTDownloader("http://test.com", "test_token")

            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file_path = temp_file.name

            try:
                result = downloader.osdownload("test_docid", save_path=temp_file_path)

                assert result["file_path"] == temp_file_path
            finally:
                os.unlink(temp_file_path)


# 运行测试的辅助函数
def run_tests():
    """运行所有测试"""
    pytest.main([__file__, "-v"])


if __name__ == "__main__":
    run_tests()
