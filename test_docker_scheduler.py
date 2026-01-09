#!/usr/bin/env python3
"""
测试 Docker 调度器
"""
import asyncio
from sandbox_control_plane.src.infrastructure.container_scheduler.docker_scheduler import DockerScheduler
from sandbox_control_plane.src.infrastructure.container_scheduler.base import ContainerConfig


async def test_docker_scheduler():
    """测试 Docker 调度器基本功能"""
    print("=" * 60)
    print("Testing Docker Scheduler")
    print("=" * 60)

    # 创建 Docker 调度器
    scheduler = DockerScheduler(docker_url="unix:///Users/guochenguang/.docker/run/docker.sock")

    try:
        # 1. 测试连接
        print("\n[1] Testing Docker connection...")
        is_connected = await scheduler.ping()
        print(f"   Docker connected: {is_connected}")

        if not is_connected:
            print("   ERROR: Cannot connect to Docker daemon")
            return

        # 2. 创建测试容器
        print("\n[2] Creating test container...")
        config = ContainerConfig(
            image="busybox:latest",
            name="sandbox-test-container",
            env_vars={"TEST": "value"},
            cpu_limit="0.5",
            memory_limit="512Mi",
            disk_limit="1Gi",
            workspace_path="s3://test/session-123",
            labels={"test": "true"},
        )

        container_id = await scheduler.create_container(config)
        print(f"   Container created: {container_id[:12]}")

        # 3. 启动容器
        print("\n[3] Starting container...")
        await scheduler.start_container(container_id)
        print(f"   Container started: {container_id[:12]}")

        # 4. 获取容器状态
        print("\n[4] Getting container status...")
        status = await scheduler.get_container_status(container_id)
        print(f"   Status: {status.status}")
        print(f"   Image: {status.image}")

        # 5. 获取容器日志
        print("\n[5] Getting container logs...")
        logs = await scheduler.get_container_logs(container_id, tail=10)
        print(f"   Logs (first 200 chars): {logs[:200]}...")

        # 6. 停止容器
        print("\n[6] Stopping container...")
        await scheduler.stop_container(container_id, timeout=5)
        print(f"   Container stopped: {container_id[:12]}")

        # 7. 删除容器
        print("\n[7] Removing container...")
        await scheduler.remove_container(container_id)
        print(f"   Container removed: {container_id[:12]}")

        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await scheduler.close()


if __name__ == "__main__":
    asyncio.run(test_docker_scheduler())
