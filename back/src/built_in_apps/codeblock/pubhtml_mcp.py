import json
import asyncio
import re
from lazyllm.tools.mcp.client import MCPClient

def main(html_content: str):
    # ========== 清理 HTML 内容 ==========
    # 移除可能的 Markdown 代码块标记
    html_content = html_content.strip()
    
    # 移除开头的 markdown 代码块标记（如ml, ```,\n 等）
    html_content = re.sub(r'^```[a-z]*\n?', '', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'^```\n?', '', html_content)
    
    # 移除结尾的 markdown 代码块标记
    html_content = re.sub(r'\n?```\s*$', '', html_content)
    
    # 确保 HTML 以 <!DOCTYPE 或 <html 开头
    if not (html_content.strip().startswith('<!DOCTYPE') or html_content.strip().startswith('<html')):
        # 如果前面还有内容，尝试找到第一个 HTML 标签
        match = re.search(r'<(!DOCTYPE|html)', html_content, re.IGNORECASE)
        if match:
            html_content = html_content[match.start():]
    # ========== 打印完整 HTML 源码 ==========
    print("=" * 80)
    print("[完整HTML源码]")
    print("=" * 80)
    print(html_content)
    print("=" * 80)
    print(f"[HTML源码结束] 总长度: {len(html_content)} 字符")
    print("=" * 80)
    
    # ========== 诊断：检查 HTML 完整性 ==========
    html_length = len(html_content)
    has_script = '<script' in html_content.lower()
    has_chart = 'echarts' in html_content.lower() or 'chart' in html_content.lower()
    has_canvas = '<canvas' in html_content.lower()
    
    # 检查 HTML 是否以正确的标签开始和结束
    starts_correctly = html_content.strip().startswith('<!DOCTYPE') or html_content.strip().startswith('<html')
    ends_correctly = html_content.strip().endswith('</html>') or html_content.strip().endswith('</body>')
    
    print(f"[HTML诊断] HTML长度: {html_length} 字符")
    print(f"[HTML诊断] 包含script标签: {has_script}")
    print(f"[HTML诊断] 包含chart/echarts: {has_chart}")
    print(f"[HTML诊断] 包含canvas标签: {has_canvas}")
    print(f"[HTML诊断] 正确开始: {starts_correctly}")
    print(f"[HTML诊断] 正确结束: {ends_correctly}")
    
    # 检查 HTML 是否完整（检查是否有未闭合的标签）
    open_tags = html_content.count('<')
    close_tags = html_content.count('>')
    if open_tags != close_tags:
        print(f"[HTML警告] 标签可能未闭合: 开始标签数={open_tags}, 结束标签数={close_tags}")
    
    # 检查是否有未闭合的 script 标签
    script_open = html_content.lower().count('<script')
    script_close = html_content.lower().count('</script>')
    if script_open != script_close:
        print(f"[HTML警告] Script标签未闭合: 开始={script_open}, 结束={script_close}")
    
    # ========== 使用 MCP Client 调用部署服务 ==========
    deploy_url = "https://mcp.api-inference.modelscope.net/17dd26b37cb844/sse"
    
    # 创建 MCP Client
    client = MCPClient(
        command_or_url=deploy_url,
        headers={},
        timeout=60.0
    )
    
    # 准备参数
    arguments = {"value": html_content}
    
    # 打印参数信息
    print(f"[MCP调用] 准备调用工具: deploy_html")
    print(f"[MCP调用] 参数长度: {len(str(arguments))} 字符")
    print(f"[MCP调用] HTML内容前100字符: {html_content[:100]}")
    print(f"[MCP调用] HTML内容后100字符: {html_content[-100:]}")
    
    # 调用工具
    try:
        result = asyncio.run(
            client.call_tool(
                "deploy_html",
                arguments
            )
        )
        
        print(f"[MCP结果] 调用成功")
        if result and hasattr(result, 'content'):
            print(f"[MCP结果] 返回内容数量: {len(result.content) if result.content else 0}")
        
        # 处理结果
        if result.content:
            text_contents = []
            for content in result.content:
                if hasattr(content, 'text'):
                    text_contents.append(content.text)
            
            if text_contents:
                try:
                    result_json = json.loads(text_contents[0])
                    if isinstance(result_json, dict):
                        deployed_url = result_json.get("url", "部署成功")
                        print(f"[MCP结果] 部署URL: {deployed_url}")
                        return deployed_url
                    else:
                        return text_contents[0]
                except json.JSONDecodeError:
                    return text_contents[0]
            else:
                return "部署成功，但未返回内容"
        else:
            return "部署成功，但未返回内容"
            
    except Exception as e:
        error_msg = f"部署失败: {str(e)}"
        print(f"[MCP错误] {error_msg}")
        import traceback
        print(f"[MCP错误] 详细错误: {traceback.format_exc()}")
        return error_msg