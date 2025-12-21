'use client'
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { DownloadOutlined } from '@ant-design/icons'
import 'katex/dist/katex.min.css'
import styles from './index.module.scss'
import { PUBLIC_API_PREFIX } from '@/app-specs'

type MarkdownRendererProps = {
  content: string
  className?: string
}

// 转换图片路径为可访问的 URL
const convertImagePath = (path: string): string => {
  if (!path) return path
  // 如果已经是 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/static')) {
    return path
  }
  // 转换 /app/upload/ 为 /static/upload/
  if (path.startsWith('/app/upload/')) {
    const convertedPath = path.replace('/app/upload/', '/static/upload/')
    // 在开发环境下添加 API 前缀
    if (process.env.NODE_ENV === 'development' && PUBLIC_API_PREFIX) {
      return `${PUBLIC_API_PREFIX.replace('/api', '')}${convertedPath}`
    }
    return convertedPath
  }
  return path
}

// 处理内容中的图片路径
const processImagePaths = (content: string): string => {
  if (!content) return content
  
  // 匹配纯文本形式的图片路径（如 /app/upload/sd/tmpu08_jdip.png）
  const imagePathRegex = /(\/app\/upload\/[^\s\)]+\.(png|jpg|jpeg|gif|webp|bmp))/gi
  return content.replace(imagePathRegex, (match) => {
    // 转换为 markdown 图片格式
    const imageUrl = convertImagePath(match)
    return `![图片](${imageUrl})`
  })
}

// 带下载按钮的图片组件
const ImageWithDownload: React.FC<{ src: string; alt?: string }> = ({ src, alt }) => {
  const [isHovered, setIsHovered] = useState(false)
  const imageUrl = convertImagePath(src || '')
  
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 获取文件名
    const fileName = imageUrl.split('/').pop() || 'image.png'
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        margin: '10px 0',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={imageUrl}
        alt={alt || '图片'}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '8px',
          display: 'block',
        }}
      />
      {isHovered && (
        <button
          onClick={handleDownload}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            transition: 'background-color 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
          }}
          title="下载图片"
        >
          <DownloadOutlined />
          下载
        </button>
      )}
    </div>
  )
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content)
    return null

  // 处理可能的转义字符和HTML实体
  let processedContent = content
    .replace(/^\\"/g, '') // 删除开头的转义引号
    .replace(/\\"$/g, '') // 删除结尾的转义引号
    .replace(/^"/g, '') // 删除开头的普通引号
    .replace(/"$/g, '') // 删除结尾的普通引号
    .replace(/\\n/g, '\n') // 将 \n 转换为真正的换行符
    .replace(/\\t/g, '\t') // 将 \t 转换为真正的制表符
    .replace(/\\r/g, '\r') // 将 \r 转换为真正的回车符
    .replace(/&lt;/g, '<') // 将 &lt; 转换为 <
    .replace(/&gt;/g, '>') // 将 &gt; 转换为 >
    .replace(/&amp;/g, '&') // 将 &amp; 转换为 &
    .replace(/&quot;/g, '"') // 将 &quot; 转换为 "
    .replace(/&#x27;/g, '\'') // 将 &#x27; 转换为 '
    .replace(/&#x2F;/g, '/') // 将 &#x2F; 转换为 /
    .replace(/^\s+|\s+$/g, '') // 删除首尾空白字符
    .replace(/^[^#]*###/, '###') // 删除 ### 前面的所有非#字符
    .replace(/###([^#\s])/g, '### $1') // 确保 ### 后面有空格
  
  // 处理图片路径
  processedContent = processImagePaths(processedContent)
  return (
    <div className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={false}
        components={{
          // 自定义表格组件
          table: ({ children, ...props }) => (
            <div className={styles.tableWrapper}>
              <table {...props}>{children}</table>
            </div>
          ),
          // 自定义代码块组件
          code: ({ node: _node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            return (!inline && match)
              ? (
                <pre className={styles.codeBlock}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              )
              : (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              )
          },
          // 自定义图片组件（带下载按钮）
          img: ({ src, alt, ...props }) => (
            <ImageWithDownload src={src || ''} alt={alt} />
          ),
          // 自定义链接组件
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1677ff', textDecoration: 'underline' }}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
