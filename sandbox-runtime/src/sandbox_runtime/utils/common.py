from pathlib import Path

def safe_join(parent: str, child: str) -> Path:
    child_path = Path(child)

    # 1. 如果是绝对路径，去掉开头的所有 '/' 后拼接
    if child_path.is_absolute():
        # 去掉开头的所有 '/'，转换为相对路径
        child_str = str(child_path)
        child_str = child_str.lstrip('/')
        child_path = Path(child_str)

    # 2. 禁止以 '.' 或 '..' 开头
    parts = child_path.parts
    if parts and (parts[0] in {'.', '..'}):
        raise ValueError("child path cannot start with '.' or '..'")

    # 3. 禁止路径中包含 '..'（防止路径遍历攻击）
    if '..' in parts:
        raise ValueError("child path cannot contain '..'")

    # 4. 拼接并验证最终路径在父目录内
    result_path = Path(parent) / child_path
    parent_path = Path(parent).resolve()
    result_resolved = result_path.resolve()
    
    # 确保最终路径在父目录内
    try:
        result_resolved.relative_to(parent_path)
    except ValueError:
        # 如果无法转换为相对路径，说明路径在父目录外
        raise ValueError("child path would escape parent directory")

    return result_path
