import asyncio

import pytest

from sandbox_runtime.sdk.shared_env import SharedEnvSandbox  # type: ignore


def _unwrap(sandbox: SharedEnvSandbox, payload):
    return sandbox._unwrap_result(payload)


def test_unwrap_result():
    sandbox = SharedEnvSandbox(session_id="sid")
    assert _unwrap(sandbox, {"result": {"a": 1}}) == {"a": 1}
    assert _unwrap(sandbox, {"a": 1}) == {"a": 1}
    assert _unwrap(sandbox, None) is None


def test_methods_accept_wrapped_and_unwrapped(monkeypatch: pytest.MonkeyPatch):
    async def _run():
        sandbox = SharedEnvSandbox(session_id="sid")

        async def fake_request_wrapped(method, path, **kwargs):
            if "files" in path:
                return {"result": {"files": [{"filename": "a.txt"}]}}
            return {"result": {"filename": "a.txt", "returncode": 0}}

        sandbox._request = fake_request_wrapped  # type: ignore
        created = await sandbox.create_file("content", "a.txt")
        assert created["filename"] == "a.txt"

        listed = await sandbox.list_files()
        assert listed == [{"filename": "a.txt"}]

        executed = await sandbox.execute("echo")
        assert executed["returncode"] == 0

        async def fake_request_unwrapped(method, path, **kwargs):
            if "files" in path:
                return {"files": [{"filename": "b.txt"}]}
            return {"filename": "b.txt", "returncode": 0}

        sandbox._request = fake_request_unwrapped  # type: ignore
        created = await sandbox.create_file("content", "b.txt")
        assert created["filename"] == "b.txt"

        listed = await sandbox.list_files()
        assert listed == [{"filename": "b.txt"}]

        executed = await sandbox.execute("echo")
        assert executed["returncode"] == 0

    asyncio.run(_run())
