import os
import asyncio
import traceback
import aiohttp
import requests
from urllib.parse import urljoin
from typing import Optional, Dict, Any, Callable, Union
from pathlib import Path
from sandbox_runtime.settings import get_settings
from sandbox_runtime.utils.http_api import API, HTTPMethod
from sandbox_runtime.errors import SandboxError, SandboxHTTPError
from sandbox_runtime.utils.loggers import DEFAULT_LOGGER
from email import message_from_string

_settings = get_settings()


from dataclasses import dataclass


@dataclass
class DownloadItem:
    docid: str
    savename: Optional[str] = ""
    rev: Optional[str] = ""


class EFASTDownloader:
    """Efast 文件下载器

    支持同步和异步下载，基于 efast API 的文件下载功能。
    """

    def __init__(self, base_url: str | None, token: str, timeout: int | None = None):
        """初始化下载器

        Args:
            base_url: efast API 基础 URL
            token: 认证令牌
            timeout: 超时时间（秒）
        """
        self.base_url = base_url.rstrip("/")
        self.token = token

        if not timeout:
            self.timeout = _settings.DOWNLOADER_TIMEOUT
        else:
            self.timeout = timeout

        if not base_url:
            self.base_url = _settings.EFAST_DOWNLOADER_URL

        self._gen_urls()

    def _gen_urls(self):
        """生成 API URL"""
        osdownload_url = "api/efast/v1/file/osdownload/"
        self.osdownload_url = urljoin(self.base_url + "/", osdownload_url)

    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
        }

    def _parse_auth_request(self, auth_request: list) -> Dict[str, str]:
        """解析认证请求信息

        Args:
            auth_request: 从 API 返回的认证请求信息

        Returns:
            包含认证信息的字典
        """
        # 华为云的请求头格式为
        # [
        #   'GET',
        #   'https://obs-dip-zhangyulin.obs.cn-east-3.myhuaweicloud.com/e6db6f66-1fa0-4c18-befc-4595073f1d7f/4E1A905ACD63400E936F0BC8C6A50F56/AC911AEFED804D829C9B7FCE08A11395',
        #   'Authorization: OBS HPUANX9B6ZDDL6E3PP4E:wyIJ6u1BuR8wbtHABiM4h3abKjY=',
        #   'Host: obs-dip-zhangyulin.obs.cn-east-3.myhuaweicloud.com',
        #   'x-obs-date: Mon, 13 Oct 2025 18:09:14 GMT'
        # ]
        # 所以需要根据请求头格式来判断
        # 其他的格式为 AWS 格式
        # [
        #   'GET',
        #   'https://example.com/file',
        #   'Authorization: AWS test:signature',
        #   'x-amz-date: Wed, 10 Sep 2025 15:22:51 GMT'
        # ]
        # 所以需要使用 email 的 message_from_string 方法来解析请求头
        if len(auth_request) < 4:
            raise SandboxError("Invalid auth request format")

        # DEFAULT_LOGGER.info(f"Auth request: {auth_request}")

        auth_request_info = {
            "method": auth_request[0],  # method 永远是 GET
            "url": auth_request[1],
        }

        for header in auth_request[2:]:
            auth_request_info.update(dict(message_from_string(header).items()))

        return auth_request_info

    # def _get_download_headers(self, auth_info: Dict[str, str]) -> Dict[str, str]:
    #     """获取下载请求头

    #     Args:
    #         auth_info: 认证信息

    #     Returns:
    #         下载请求头
    #     """
    #     return {
    #         "Authorization": auth_info["authorization"],
    #         "x-amz-date": auth_info["x_amz_date"]
    #     }

    def osdownload(
        self,
        docid: str,
        savename: Optional[str] = "",
        save_path: Optional[Union[str, Path]] = "",
        rev: Optional[str] = "",
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> Dict[str, Any]:
        """同步下载文件

        Args:
            docid: 文档 ID
            savename: 保存的文件名，如果为 None 则使用 API 返回的 name
            save_path: 保存路径，如果为 None 则保存到当前目录
            rev: 版本号，如果为 None 则使用最近版本
            progress_callback: 进度回调函数，参数为 (已下载字节数, 总字节数)

        Returns:
            包含下载信息的字典

        Raises:
            SandboxError: 下载失败时抛出
        """
        try:
            # 第一步：获取下载授权
            payload = {"docid": docid}
            if savename:
                payload["savename"] = savename

            if rev:
                payload["rev"] = rev

            api = API(
                url=self.osdownload_url,
                method=HTTPMethod.POST,
                payload=payload,
                headers=self._get_headers(),
            )

            response = api.call()
            # DEFAULT_LOGGER.info(f"Response: {response}")

            # 解析响应
            auth_info = self._parse_auth_request(response["authrequest"])
            # DEFAULT_LOGGER.info(f"Auth info: {auth_info}")

            local_savename = savename or response.get("name", "download_file")
            file_info = {
                "name": local_savename,
                "size": response.get("size", 0),
                # "modified": response.get("modified", 0),
                # "client_mtime": response.get("client_mtime", 0),
                "rev": response.get("rev", ""),
                # "siteid": response.get("siteid", ""),
                # "editor": response.get("editor", ""),
                # "need_watermark": response.get("need_watermark", False)
            }
            DEFAULT_LOGGER.info(f"File info: {file_info}")

            # 第二步：下载文件
            # download_headers = self._get_download_headers(auth_info)
            # DEFAULT_LOGGER.info(f"Download headers: {download_headers}")

            # 确定保存路径
            if save_path is None:
                save_path = Path.cwd()
            else:
                save_path = Path(save_path)

            if not save_path.exists():
                save_path.mkdir(parents=True, exist_ok=True)

            if save_path.is_dir():
                file_path = save_path / local_savename
            else:
                file_path = save_path

            DEFAULT_LOGGER.info(f"File path: {file_path}")

            # 下载文件
            url = auth_info.pop("url")
            auth_info.pop("method")

            with requests.get(
                url,
                headers=auth_info,  # 移除 url 和 method 后剩下的就是下载请求头
                stream=True,
                timeout=self.timeout,
                verify=False,
            ) as response:
                response.raise_for_status()

                total_size = int(
                    response.headers.get("content-length", file_info["size"])
                )
                downloaded = 0

                with open(file_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)

                            # 调用进度回调
                            if progress_callback:
                                progress_callback(downloaded, total_size)

            return {
                "success": True,
                "file_path": str(file_path),
                "file_info": file_info,
                "downloaded_size": downloaded,
                "total_size": total_size,
            }
        except SandboxHTTPError as e:
            traceback.print_exc()
            raise e
        except Exception as e:
            traceback.print_exc()
            raise SandboxHTTPError(
                url=self.osdownload_url,
                status=500,
                reason="Internal Server Error",
                message="Download failed",
                detail={
                    "docid": docid,
                    "savename": savename,
                    "save_path": str(save_path) if save_path else None,
                    "error": str(e),
                },
            )

    async def osdownload_async(
        self,
        docid: str,
        savename: Optional[str] = "",
        save_path: Optional[Union[str, Path]] = "",
        rev: Optional[str] = "",
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> Dict[str, Any]:
        """异步下载文件

        Args:
            docid: 文档 ID
            savename: 保存的文件名，如果为 None 则使用 API 返回的 name
            save_path: 保存路径，如果为 None 则保存到当前目录
            rev: 版本号，如果为 None 则使用最近版本
            progress_callback: 进度回调函数，参数为 (已下载字节数, 总字节数)

        Returns:
            包含下载信息的字典

        Raises:
            SandboxError: 下载失败时抛出
        """
        try:
            # 第一步：获取下载授权
            payload = {"docid": docid}
            if savename:
                payload["savename"] = savename

            if rev:
                payload["rev"] = rev

            api = API(
                url=self.osdownload_url,
                method=HTTPMethod.POST,
                payload=payload,
                headers=self._get_headers(),
            )

            # DEFAULT_LOGGER.info(f"API: \n\t URL: {api.url}\n\t Method: {api.method}\n\t Payload: {api.payload}\n\t Headers: {api.headers}")

            response = await api.call_async()
            # DEFAULT_LOGGER.info(f"Response: {response}")

            # 解析响应
            auth_info = self._parse_auth_request(response["authrequest"])
            # DEFAULT_LOGGER.info(f"Auth info: {auth_info}")

            local_savename = savename or response.get("name", "download_file")
            file_info = {
                "name": local_savename,
                "size": response.get("size", 0),
                # "modified": response.get("modified", 0),
                # "client_mtime": response.get("client_mtime", 0),
                "rev": response.get("rev", ""),
                # "siteid": response.get("siteid", ""),
                # "editor": response.get("editor", ""),
                # "need_watermark": response.get("need_watermark", False)
            }

            # 第二步：异步下载文件
            # download_headers = self._get_download_headers(auth_info)

            # 确定保存路径
            if save_path is None:
                save_path = Path.cwd()
            else:
                save_path = Path(save_path)

            if not save_path.exists():
                save_path.mkdir(parents=True, exist_ok=True)

            if save_path.is_dir():
                file_path = save_path / local_savename
            else:
                file_path = save_path

            # 异步下载文件
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            async with aiohttp.ClientSession(
                timeout=timeout, connector=aiohttp.TCPConnector(ssl=False)
            ) as session:
                url = auth_info.pop("url")
                auth_info.pop("method")

                async with session.get(
                    url, headers=auth_info  # 移除 url 和 method 后剩下的就是下载请求头
                ) as response:
                    response.raise_for_status()

                    total_size = int(
                        response.headers.get("content-length", file_info["size"])
                    )
                    downloaded = 0

                    with open(file_path, "wb") as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                            downloaded += len(chunk)

                            # 调用进度回调
                            if progress_callback:
                                progress_callback(downloaded, total_size)

            return {
                "success": True,
                "file_path": str(file_path),
                "file_info": file_info,
                "downloaded_size": downloaded,
                "total_size": total_size,
            }
        except SandboxHTTPError as e:
            traceback.print_exc()
            raise e
        except Exception as e:
            traceback.print_exc()
            raise SandboxHTTPError(
                url=self.osdownload_url,
                status=500,
                reason="Internal Server Error",
                message="Async download failed",
                detail={
                    "docid": docid,
                    "savename": savename,
                    "save_path": str(save_path) if save_path else None,
                    "error": str(e),
                },
            )

    def download_multiple(
        self,
        downloads: list[DownloadItem],
        save_path: Optional[Union[str, Path]] = "",
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ) -> list:
        """批量同步下载文件

        Args:
            downloads: 下载列表，每个元素包含 docid 和可选的 savename
            save_path: 保存路径，如果为 "" 则保存到当前目录
            progress_callback: 进度回调函数，参数为 (当前文件已下载字节数, 当前文件总字节数, 文件名)

        Returns:
            下载结果列表
        """
        results = []
        for i, download in enumerate(downloads):
            docid = download.docid
            savename = download.savename
            rev = download.rev

            def file_progress_callback(downloaded, total):
                if progress_callback:
                    progress_callback(downloaded, total, savename or f"file_{i+1}")

            try:
                result = self.osdownload(
                    docid,
                    savename,
                    save_path,
                    rev=rev,
                    progress_callback=file_progress_callback,
                )
                results.append(result)

            except SandboxError as e:
                traceback.print_exc()
                results.append(
                    {
                        "success": False,
                        "error": str(e),
                        "docid": docid,
                        "save_path": save_path,
                        "savename": savename,
                        "rev": rev,
                    }
                )
            except Exception as e:
                traceback.print_exc()
                results.append(
                    {
                        "success": False,
                        "error": str(e),
                        "docid": docid,
                        "save_path": save_path,
                        "savename": savename,
                        "rev": rev,
                    }
                )

        return results

    async def download_multiple_async(
        self,
        downloads: list[DownloadItem],
        save_path: Optional[Union[str, Path]] = None,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        max_concurrent: int = 3,
    ) -> list:
        """批量异步下载文件

        Args:
            downloads: 下载列表，每个元素包含 docid 和可选的 savename
            save_path: 保存路径
            progress_callback: 进度回调函数，参数为 (当前文件已下载字节数, 当前文件总字节数, 文件名)
            max_concurrent: 最大并发下载数

        Returns:
            下载结果列表
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def download_single(download: DownloadItem, index: int):
            async with semaphore:
                docid = download.docid
                savename = download.savename
                rev = download.rev
                DEFAULT_LOGGER.info(
                    f"Downloading file {savename} with docid {docid} and rev {rev}"
                )

                def file_progress_callback(downloaded, total):
                    if progress_callback:
                        progress_callback(
                            downloaded, total, savename or f"file_{index+1}"
                        )

                try:
                    result = await self.osdownload_async(
                        docid,
                        savename,
                        save_path,
                        rev=rev,
                        progress_callback=file_progress_callback,
                    )
                    return result
                except SandboxHTTPError as e:
                    traceback.print_exc()
                    return {
                        "success": False,
                        "error": str(e),
                        "docid": docid,
                        "save_path": save_path,
                        "savename": savename,
                        "rev": rev,
                    }
                except Exception as e:
                    traceback.print_exc()
                    return {
                        "success": False,
                        "error": str(e),
                        "docid": docid,
                        "save_path": save_path,
                        "savename": savename,
                        "rev": rev,
                    }

        tasks = [download_single(download, i) for i, download in enumerate(downloads)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return results
