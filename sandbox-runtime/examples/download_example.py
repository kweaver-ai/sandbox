from sandbox_runtime.utils.efast_downloader import EFASTDownloader, DownloadItem


def _test_download(url, token, docid, savename, save_path):
    downloader = EFASTDownloader(url, token)
    result = downloader.osdownload(docid, savename, save_path)
    return result


async def _test_download_async(url, token, docid, savename, save_path):
    downloader = EFASTDownloader(url, token)
    result = await downloader.osdownload_async(docid, savename, save_path)
    return result


async def _test_download_multiple(url, token, items, save_path):
    downloader = EFASTDownloader(url, token)
    result = await downloader.download_multiple_async(items, save_path)
    return result


if __name__ == "__main__":
    url = "http://192.168.167.13:9123"
    token = "ory_at_MxXQrJz-IfFUVBTJvVHQp0ptmiHRGWcMx2_n1Zc63Mk.-IZ_HgoTmpbCzeB1F1mh5K7yG0M95Hy4eL01nCnzf4U"
    docid = "gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/72FC87ED37E64E39B0D41095D7925497"
    savename = "test.docx"
    save_path = "./test_download"
    try:
        result = _test_download(url, token, docid, "test.docx", save_path)
        print(result)
    except Exception as e:
        print(e)

    import asyncio

    try:
        result = asyncio.run(
            _test_download_async(url, token, docid, "test1.docx", save_path)
        )
        print(result)
    except Exception as e:
        print(e)

    try:
        items = [
            DownloadItem(docid, "test2.docx"),
            DownloadItem(docid[::-1], "test3.docx"),
        ]
        result = asyncio.run(_test_download_multiple(url, token, items, save_path))
        print(result)
    except Exception as e:
        print(e)
