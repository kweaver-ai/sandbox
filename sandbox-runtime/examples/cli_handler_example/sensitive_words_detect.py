import time
from typing import Optional
import requests


class ACNode(object):
    def __init__(self):
        self.children = {}  # 子节点
        self.fail = None  # 失败指针
        self.is_end = False  # 是否是单词结尾
        self.word = None  # 存储完整的敏感词


class ACFilter(object):
    def __init__(self):
        self.root = ACNode()

    def add_word(self, word):
        """添加敏感词"""
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = ACNode()
            node = node.children[char]
        node.is_end = True
        node.word = word

    def build_fail_pointer(self):
        """构建失败指针"""
        queue = []
        # 将第一层节点的失败指针指向root
        for child in self.root.children.values():
            child.fail = self.root
            queue.append(child)

        while queue:
            current = queue.pop(0)
            # 遍历当前节点的所有子节点
            for char, child in current.children.items():
                fail = current.fail
                # 寻找失败指针
                while fail and char not in fail.children:
                    fail = fail.fail
                child.fail = fail.children[char] if fail else self.root
                queue.append(child)

    def search(self, text):
        """查找敏感词"""
        result = []
        node = self.root
        for i, char in enumerate(text):
            while node is not self.root and char not in node.children:
                node = node.fail
            if char in node.children:
                node = node.children[char]
            temp = node
            while temp is not self.root:
                if temp.is_end:
                    result.append((i - len(temp.word) + 1, temp.word))
                temp = temp.fail
        return result


sensitive_detector = None


def check_sensitive_word(text) -> dict:
    """
    检测文本是否包含敏感词.包含敏感词 返回检测到的敏感词信息，否则返回空字典
    格式为{"pos": 敏感词起始位置, "word": 敏感词, "is_pass": False}，is_pass为True表示文本不包含敏感词;
    """
    global sensitive_detector
    if sensitive_detector is None:
        print("敏感词检测器未初始化，无法检测敏感词")
        return {"is_pass": True}
    sensitiveResult = sensitive_detector.search(text)
    if len(sensitiveResult) > 0:
        return {"sensitive_words": sensitiveResult, "is_pass": False}
    else:
        return {"is_pass": True}


def build_sensitive_detector(sensitive_words):
    global sensitive_detector
    if sensitive_detector is not None:
        return
    sensitive_detector = ACFilter()
    # 添加敏感词
    t1 = time.time()
    if not sensitive_words:
        sensitive_words = ["毒品"]
    if not isinstance(sensitive_words, list):
        sensitive_words = [str(sensitive_words)]
    for word in sensitive_words:
        sensitive_detector.add_word(word)
    print("构造AC树完成，耗时{}秒".format(time.time() - t1))

    # 构建失败指针
    sensitive_detector.build_fail_pointer()


# 下载敏感词库
def download_sensitive_words(url):
    """
    下载敏感词库
    :param url: 敏感词库URL
    敏感词使用','分隔, 解析并返回敏感词列表
    :return: 敏感词列表
    """
    try:
        # print(f"下载敏感词库URL: {url}")
        response = requests.get(url)
        response.raise_for_status()
        result = response.json()
        return result.get("sensitive_words", []), None
    except requests.RequestException as e:
        # print(f"下载敏感词库失败: {e}")
        return None, e


# # 解析敏感词
def parse_sensitive_words(sensitive_words_content):
    """
    解析敏感词
    :param sensitive_words_content: 敏感词内容
    :return: 解析后的敏感词列表
    """
    return sensitive_words_content.strip().split(",") if sensitive_words_content else []


def handler(event) -> dict:
    # sensitive_words_content, err = download_sensitive_words(event.get('sensitive_words_url'))
    # if err:
    #     # print(f"下载敏感词库失败: {err}")
    #     return {'is_pass': True}
    sensitive_words = parse_sensitive_words(event.get("sensitive_words"))
    build_sensitive_detector(sensitive_words)
    return check_sensitive_word(event.get("text"))


if __name__ == "__main__":
    # url =
    # sensitive_words, err = download_sensitive_words()
    # if err:
    #     print(f"下载敏感词库失败: {err}")
    #     exit(1)
    # sensitive_words_url = 'http://10.4.110.230:8080/api/v1/sensitive_words'
    text = "我不喜欢毒品，但是我支持政治"
    sensitive_words = "毒品,政治"
    # event = {"text": text, "sensitive_words_url": sensitive_words_url}
    event = {"text": text, "sensitive_words": sensitive_words}

    print(handler(event))
    # download_sensitive_words('http://10.4.110.230:8080/api/v1/sensitive_words')
