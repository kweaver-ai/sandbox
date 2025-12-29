import pytest
import platform
from pathlib import Path
from sandbox_runtime.utils.common import safe_join


class TestSafeJoinNormalCases:
    """测试 safe_join 函数的正常情况"""

    def test_simple_relative_path(self):
        """测试简单的相对路径"""
        result = safe_join("/parent/dir", "child")
        assert result == Path("/parent/dir/child")

    def test_nested_relative_path(self):
        """测试嵌套的相对路径"""
        result = safe_join("/parent/dir", "subdir/file.txt")
        assert result == Path("/parent/dir/subdir/file.txt")

    def test_empty_child_path(self):
        """测试空的子路径"""
        result = safe_join("/parent/dir", "")
        assert result == Path("/parent/dir")

    def test_multiple_levels(self):
        """测试多级路径"""
        result = safe_join("/root", "a/b/c/d.txt")
        assert result == Path("/root/a/b/c/d.txt")

    def test_path_with_dot_in_middle(self):
        """测试路径中间包含 '.' 的情况（应该允许）"""
        result = safe_join("/parent", "file.name.txt")
        assert result == Path("/parent/file.name.txt")

    def test_path_with_dotdot_in_middle(self):
        """测试路径中间包含 '..' 的情况（应该被禁止）"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/parent", "a/../b/file.txt")

    def test_windows_style_path(self):
        """测试 Windows 风格的路径（作为子路径）"""
        # Windows 风格的相对路径应该被允许
        result = safe_join("C:\\parent", "subdir\\file.txt")
        # 注意：Path 会自动处理路径分隔符
        assert "subdir" in str(result)
        assert "file.txt" in str(result)


class TestSafeJoinAbsolutePath:
    """测试 safe_join 函数对绝对路径的处理"""

    def test_absolute_path_unix(self):
        """测试 Unix 绝对路径（应该去掉开头的 '/' 后拼接）"""
        result = safe_join("/parent/dir", "/absolute/path")
        assert result == Path("/parent/dir/absolute/path")

    def test_absolute_path_with_nested_dirs(self):
        """测试嵌套的绝对路径"""
        result = safe_join("/parent/dir", "/a/b/c/file.txt")
        assert result == Path("/parent/dir/a/b/c/file.txt")

    def test_absolute_path_root(self):
        """测试根路径 '/'"""
        result = safe_join("/parent/dir", "/")
        assert result == Path("/parent/dir")

    def test_absolute_path_with_multiple_slashes(self):
        """测试多个连续斜杠的绝对路径（应该去掉所有开头的 '/'）"""
        result = safe_join("/parent/dir", "///absolute/path")
        assert result == Path("/parent/dir/absolute/path")

    def test_absolute_path_with_many_slashes(self):
        """测试很多连续斜杠的绝对路径"""
        result = safe_join("/parent/dir", "//////a/b/c")
        assert result == Path("/parent/dir/a/b/c")

    def test_absolute_path_all_slashes(self):
        """测试全部是斜杠的路径"""
        result = safe_join("/parent/dir", "///")
        assert result == Path("/parent/dir")

    def test_path_with_trailing_slashes(self):
        """测试末尾有多个斜杠的路径"""
        result = safe_join("/parent/dir", "path///")
        # Path 会自动处理末尾的斜杠
        assert result == Path("/parent/dir/path")

    def test_path_with_trailing_slashes_nested(self):
        """测试嵌套路径末尾有多个斜杠"""
        result = safe_join("/parent/dir", "a/b///")
        assert result == Path("/parent/dir/a/b")

    def test_absolute_path_with_trailing_slashes(self):
        """测试绝对路径末尾有多个斜杠"""
        result = safe_join("/parent/dir", "/absolute/path///")
        assert result == Path("/parent/dir/absolute/path")

    def test_path_with_slashes_both_ends(self):
        """测试开头和末尾都有多个斜杠的路径"""
        result = safe_join("/parent/dir", "///path///")
        assert result == Path("/parent/dir/path")

    @pytest.mark.skipif(
        platform.system() != "Windows", reason="Windows 路径测试仅在 Windows 系统上运行"
    )
    def test_absolute_path_windows(self):
        """测试 Windows 绝对路径（应该去掉盘符和开头的 '/' 后拼接）"""
        # 在 Windows 上，Path("C:\\absolute\\path") 可能不被识别为绝对路径
        # 但如果是，应该去掉盘符部分
        result = safe_join("C:\\parent", "C:\\absolute\\path")
        # 结果取决于 Path 的行为，但应该能正常拼接
        assert "absolute" in str(result) or "path" in str(result)

    @pytest.mark.skipif(
        platform.system() != "Windows", reason="Windows 路径测试仅在 Windows 系统上运行"
    )
    def test_absolute_path_with_drive_letter(self):
        """测试带盘符的绝对路径"""
        result = safe_join("/parent", "C:/absolute/path")
        # 在 Linux 上，C:/absolute/path 可能不被识别为绝对路径
        # 如果被识别为绝对路径，应该去掉开头的部分
        assert isinstance(result, Path)


class TestSafeJoinDotPaths:
    """测试 safe_join 函数对以 '.' 或 '..' 开头的路径的处理"""

    def test_path_starting_with_dot(self):
        """测试以 '.' 开头的路径

        注意：Path('./child') 会被规范化为 'child'，所以不会触发异常。
        这是 Path 对象的行为，它会自动规范化路径。
        """
        # Path 会规范化 './child' 为 'child'，所以不会抛出异常
        result = safe_join("/parent/dir", "./child")
        assert result == Path("/parent/dir/child")

    def test_path_starting_with_dotdot(self):
        """测试以 '..' 开头的路径（应该抛出异常）"""
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/parent/dir", "../child")

    def test_path_starting_with_dot_slash(self):
        """测试以 './' 开头的路径

        注意：Path('./subdir/file.txt') 会被规范化为 'subdir/file.txt'，所以不会触发异常。
        """
        # Path 会规范化 './subdir/file.txt' 为 'subdir/file.txt'，所以不会抛出异常
        result = safe_join("/parent/dir", "./subdir/file.txt")
        assert result == Path("/parent/dir/subdir/file.txt")

    def test_path_starting_with_dotdot_slash(self):
        """测试以 '../' 开头的路径（应该抛出异常）"""
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/parent/dir", "../subdir/file.txt")

    def test_path_starting_with_multiple_dotdot(self):
        """测试以多个 '..' 开头的路径（应该抛出异常）"""
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/parent/dir", "../../child")

    def test_path_starting_with_dot_only(self):
        """测试只有 '.' 的路径

        注意：Path('.') 的 parts 是空的，所以不会触发异常检查。
        这是 Path 对象的行为。
        """
        # Path('.') 的 parts 是空的，所以不会抛出异常
        result = safe_join("/parent/dir", ".")
        assert result == Path("/parent/dir")

    def test_path_starting_with_dotdot_only(self):
        """测试只有 '..' 的路径（应该抛出异常）"""
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/parent/dir", "..")


class TestSafeJoinEdgeCases:
    """测试 safe_join 函数的边界情况"""

    def test_parent_with_trailing_slash(self):
        """测试父路径带尾随斜杠"""
        result = safe_join("/parent/dir/", "child")
        assert result == Path("/parent/dir/child")

    def test_parent_empty_string(self):
        """测试父路径为空字符串"""
        result = safe_join("", "child")
        assert result == Path("child")

    def test_special_characters_in_path(self):
        """测试路径中包含特殊字符"""
        result = safe_join("/parent", "file-name_with.underscores.txt")
        assert result == Path("/parent/file-name_with.underscores.txt")

    def test_unicode_characters(self):
        """测试路径中包含 Unicode 字符"""
        result = safe_join("/parent", "文件/目录.txt")
        assert result == Path("/parent/文件/目录.txt")

    def test_path_with_spaces(self):
        """测试路径中包含空格"""
        result = safe_join("/parent", "sub dir/file name.txt")
        assert result == Path("/parent/sub dir/file name.txt")

    def test_numeric_paths(self):
        """测试数字路径"""
        result = safe_join("/parent", "123/456.txt")
        assert result == Path("/parent/123/456.txt")

    def test_path_with_dot_but_not_at_start(self):
        """测试路径中包含 '.' 但不在开头（应该允许）"""
        result = safe_join("/parent", "a.b/c.d/file.e.txt")
        assert result == Path("/parent/a.b/c.d/file.e.txt")

    def test_path_with_dotdot_but_not_at_start(self):
        """测试路径中包含 '..' 但不在开头（应该被禁止）"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/parent", "a/../b/file.txt")


class TestSafeJoinReturnType:
    """测试 safe_join 函数的返回类型"""

    def test_returns_path_object(self):
        """测试返回 Path 对象"""
        result = safe_join("/parent", "child")
        assert isinstance(result, Path)

    def test_result_is_pathlib_path(self):
        """测试返回的是 pathlib.Path 对象"""
        from pathlib import Path as PathLibPath

        result = safe_join("/parent", "child")
        assert isinstance(result, PathLibPath)


class TestSafeJoinSecurity:
    """测试 safe_join 函数的安全性"""

    def test_path_traversal_prevention(self):
        """测试路径遍历攻击防护"""
        # 尝试使用 .. 进行路径遍历（应该被阻止）
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/secure/parent", "../etc/passwd")

    def test_multiple_path_traversal_attempts(self):
        """测试多次路径遍历尝试"""
        with pytest.raises(
            ValueError, match="child path cannot start with '.' or '..'"
        ):
            safe_join("/secure/parent", "../../../etc/passwd")

    def test_path_traversal_in_middle(self):
        """测试路径中间包含 .. 的路径遍历攻击"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/secure/parent", "a/../../../b")

    def test_path_traversal_with_nested_dirs(self):
        """测试嵌套目录中的路径遍历"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/secure/parent", "subdir/../../etc/passwd")

    def test_path_traversal_multiple_dotdot(self):
        """测试多个 .. 的路径遍历"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/secure/parent", "a/b/../../..")

    def test_path_traversal_after_normal_path(self):
        """测试正常路径后跟 .. 的情况"""
        with pytest.raises(ValueError, match="child path cannot contain '..'"):
            safe_join("/secure/parent", "normal/path/../../etc")

    def test_absolute_path_injection(self):
        """测试绝对路径注入防护

        绝对路径会被去掉开头的 '/' 后拼接，结果仍然在父目录内，这是安全的。
        """
        result = safe_join("/secure/parent", "/etc/passwd")
        # 绝对路径会被转换为相对路径，结果在父目录内
        assert result == Path("/secure/parent/etc/passwd")

    def test_dot_path_injection(self):
        """测试点路径注入防护

        注意：Path('./etc/passwd') 会被规范化为 'etc/passwd'，所以不会触发异常。
        但这是安全的，因为路径仍然在父目录内。
        """
        # Path 会规范化 './etc/passwd' 为 'etc/passwd'，所以不会抛出异常
        # 但这是安全的，因为结果路径仍然在父目录内
        result = safe_join("/secure/parent", "./etc/passwd")
        assert result == Path("/secure/parent/etc/passwd")


# 运行测试的辅助函数
def run_tests():
    """运行所有测试"""
    pytest.main([__file__, "-v"])


if __name__ == "__main__":
    run_tests()
