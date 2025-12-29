#!/usr/bin/env python3
"""
EFAST 下载示例

展示如何使用 download_file_efast API 端点下载文件。
"""

import requests
import json

def download_file_from_efast():
    """从 EFAST 下载文件的示例"""
    
    # API 端点配置
    base_url = "http://localhost:8000"  # 根据实际部署调整
    session_id = "test-session-123"
    token = "your_efast_token_here"  # 替换为实际的 token
    
    # 文件参数，按照新的结构
    file_params = [
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/A5AAE8168BAF4C49A7E10FFF800DB2A2',
            'rev': '9EB18A32ADBB466991396E4D5942E72D',
            'savename': '新能源汽车产业分析 (9).docx'
        }
    ]
    
    # 构建请求 URL
    url = f"{base_url}/workspace/se/download_from_efast/{session_id}"
    
    try:
        # 发送 POST 请求
        response = requests.post(
            url,
            json=file_params,
            params={
                'token': token,
                'save_path': '',  # 可选，留空则保存到会话目录
                'efast_url': '',  # 可选，留空则使用默认URL
                'timeout': 300    # 可选，下载超时时间
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            # 解析 JSON 响应
            result = response.json()
            print(f"✅ 下载完成: {result.get('message', '')}")
            print(f"成功: {result.get('success_count', 0)} 个文件")
            print(f"失败: {result.get('failed_count', 0)} 个文件")
            print(f"保存路径: {result.get('save_path', '')}")
            print(f"会话ID: {result.get('session_id', '')}")
            
            # 显示每个文件的结果
            for file_result in result.get('results', []):
                if file_result.get('success'):
                    print(f"  ✅ {file_result.get('savename')}: 成功")
                    print(f"     文件路径: {file_result.get('file_path', '')}")
                    print(f"     文件大小: {file_result.get('file_size', 0)} 字节")
                else:
                    print(f"  ❌ {file_result.get('savename')}: 失败")
                    print(f"     错误: {file_result.get('error', 'Unknown error')}")
        else:
            print(f"❌ 下载失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")

def download_multiple_files():
    """批量下载多个文件的示例"""
    
    base_url = "http://localhost:8000"
    session_id = "test-session-456"
    token = "your_efast_token_here"  # 替换为实际的 token
    
    # 多个文件参数，按照新的结构
    file_params = [
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/A5AAE8168BAF4C49A7E10FFF800DB2A2',
            'rev': '9EB18A32ADBB466991396E4D5942E72D',
            'savename': '文档1.docx'
        },
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/B6BBF9279CBF5D5AB8F21GGG911EC3B3',
            'rev': '8FC17A21ACAA355880285DDD4831D61C',
            'savename': '文档2.pdf'
        }
    ]
    
    url = f"{base_url}/workspace/se/download_from_efast/{session_id}"
    
    try:
        response = requests.post(
            url,
            json=file_params,
            params={
                'token': token,
                'save_path': 'downloads',  # 保存到会话目录下的 downloads 子目录
                'efast_url': '',  # 可选，留空则使用默认URL
                'timeout': 300    # 可选，下载超时时间
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 批量下载完成: {result.get('message', '')}")
            print(f"保存路径: {result.get('save_path', '')}")
            
            # 显示每个文件的结果
            for file_result in result.get('results', []):
                if file_result.get('success'):
                    print(f"  ✅ {file_result.get('savename')}: 成功")
                    print(f"     文件路径: {file_result.get('file_path', '')}")
                    print(f"     文件大小: {file_result.get('file_size', 0)} 字节")
                else:
                    print(f"  ❌ {file_result.get('savename')}: 失败")
                    print(f"     错误: {file_result.get('error', 'Unknown error')}")
        else:
            print(f"❌ 批量下载失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")

def test_api_with_curl():
    """使用 curl 命令测试 API 的示例"""
    
    print("使用 curl 命令测试 API:")
    print("=" * 50)
    
    session_id = "test-session-789"
    base_url = "http://localhost:8000"
    token = "your_efast_token_here"
    
    file_params = [
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/A5AAE8168BAF4C49A7E10FFF800DB2A2',
            'rev': '9EB18A32ADBB466991396E4D5942E72D',
            'savename': '新能源汽车产业分析 (9).docx'
        }
    ]
    
    # 单个文件下载
    print("1. 单个文件下载:")
    curl_command_single = f'''curl -X POST "{base_url}/workspace/se/download_from_efast/{session_id}" \\
  -H "Content-Type: application/json" \\
  -G -d "token={token}" \\
  -d "save_path=" \\
  -d "efast_url=" \\
  -d "timeout=300" \\
  -d '{json.dumps(file_params, ensure_ascii=False)}' \\
  --output "download_result.json"'''
    
    print(curl_command_single)
    
    # 多个文件下载
    print("\n2. 多个文件下载:")
    multiple_file_params = [
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/A5AAE8168BAF4C49A7E10FFF800DB2A2',
            'rev': '9EB18A32ADBB466991396E4D5942E72D',
            'savename': '文档1.docx'
        },
        {
            'docid': 'gns://00328E97423F42AC9DEE87B4F4B4631E/83D893844A0B4A34A64DFFB343BEF416/B6BBF9279CBF5D5AB8F21GGG911EC3B3',
            'rev': '8FC17A21ACAA355880285DDD4831D61C',
            'savename': '文档2.pdf'
        }
    ]
    
    curl_command_multiple = f'''curl -X POST "{base_url}/workspace/se/download_from_efast/{session_id}" \\
  -H "Content-Type: application/json" \\
  -G -d "token={token}" \\
  -d "save_path=downloads" \\
  -d "efast_url=" \\
  -d "timeout=300" \\
  -d '{json.dumps(multiple_file_params, ensure_ascii=False)}' \\
  --output "download_results.json"'''
    
    print(curl_command_multiple)
    
    print("\n注意事项:")
    print("- 替换 'your_efast_token_here' 为实际的 EFAST token")
    print("- 确保会话 ID 存在")
    print("- 检查网络连接和防火墙设置")
    print("- API 只返回下载结果 JSON，不返回文件内容")
    print("- 下载的文件保存在指定的 save_path 目录中")

if __name__ == "__main__":
    print("EFAST 下载示例")
    print("=" * 30)
    
    print("\n1. 单个文件下载:")
    download_file_from_efast()
    
    print("\n2. 批量文件下载:")
    download_multiple_files()
    
    print("\n3. curl 命令示例:")
    test_api_with_curl()
    
    print("\n注意事项:")
    print("- 确保 EFAST 服务器正在运行")
    print("- 设置正确的 EFAST_TOKEN 环境变量")
    print("- 确保会话 ID 存在")
    print("- 检查网络连接和防火墙设置")
