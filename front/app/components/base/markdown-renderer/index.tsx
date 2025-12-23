'use client'
import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { DownloadOutlined } from '@ant-design/icons'
import 'katex/dist/katex.min.css'
import styles from './index.module.scss'
import { PUBLIC_API_PREFIX, API_PREFIX } from '@/app-specs'
import { FilePreviewThumbnail, isPreviewableFile } from './file-preview'
import { createRoot } from 'react-dom/client'
import ReactDOM from 'react-dom'

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

// 转换视频路径为可访问的 URL
const convertVideoPath = (path: string): string => {
  if (!path) return path
  // 如果已经是 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // 处理 /tmp/ 路径，通过 API 访问
  if (path.startsWith('/tmp/')) {
    // 使用 API_PREFIX 而不是 PUBLIC_API_PREFIX，因为文件下载API在 /console/api 下
    const apiPrefix = API_PREFIX || '/console/api'
    return `${apiPrefix}/files/download?file_path=${encodeURIComponent(path)}`
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

// 处理内容中的视频路径，返回处理后的内容和视频路径映射
const processVideoPaths = (content: string): { content: string; videoPaths: Map<string, { path: string; url: string; name: string }> } => {
  // 不再创建占位符，直接返回原内容，让文本组件直接匹配原始路径
  // 这样可以避免占位符没有被正确处理的问题
  return { content, videoPaths: new Map() }
}

// 处理内容中的文件路径（CSV、Excel、PDF等），返回处理后的内容和文件路径映射
const processFilePaths = (content: string): { content: string; filePaths: Map<string, string> } => {
  if (!content) return { content, filePaths: new Map() }
  
  const filePaths = new Map<string, string>()
  // 匹配文件路径（如 /app/upload/temp/0/lazyllm_files/xxx.csv）
  // 更宽松的匹配，包括可能的换行符和空格
  const filePathRegex = /(\/app\/upload\/[^\s\)\n]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt))/gi
  
  let processedContent = content.replace(filePathRegex, (match) => {
    if (isPreviewableFile(match)) {
      const placeholder = `__FILE_PREVIEW_${filePaths.size}__`
      filePaths.set(placeholder, match)
      return placeholder
    }
    return match
  })
  
  return { content: processedContent, filePaths }
}

// 带下载按钮的视频组件
const VideoWithDownload: React.FC<{ src: string; fileName?: string }> = ({ src, fileName }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const videoFileName = fileName || src.split('/').pop() || 'video.mp4'
  
  // 检查文件是否存在
  React.useEffect(() => {
    if (src && (src.includes('/tmp/') || src.includes('file_path='))) {
      setIsLoading(true)
      setError(null)
      // 使用HEAD请求检查文件是否存在
      fetch(src, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            // 尝试获取错误详情
            return response.text().then(text => {
              let errorMsg = ''
              if (response.status === 404) {
                errorMsg = `文件不存在 (404)。路径: ${src}`
              } else if (response.status === 403) {
                errorMsg = `无权限访问文件 (403)。路径: ${src}`
              } else if (response.status === 500) {
                // 尝试解析JSON错误信息
                try {
                  const errorData = JSON.parse(text)
                  errorMsg = `服务器错误: ${errorData.error || errorData.message || '未知错误'}。路径: ${src}`
                } catch {
                  errorMsg = `服务器错误 (500)。路径: ${src}`
                }
              } else {
                errorMsg = `无法访问文件 (${response.status})。路径: ${src}`
              }
              setError(errorMsg)
              setIsLoading(false)
            })
          } else {
            // 文件存在，清除错误
            setError(null)
            setIsLoading(false)
          }
        })
        .catch(err => {
          console.error('检查文件失败:', err)
          setError(`无法连接到服务器: ${err.message}。路径: ${src}`)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [src])
  
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 如果是 /tmp/ 路径，通过 API 下载
    if (src.includes('/tmp/') || src.includes('file_path=')) {
      fetch(src)
        .then(response => {
          if (!response.ok) {
            throw new Error('下载失败')
          }
          return response.blob()
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = videoFileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        })
        .catch(error => {
          console.error('下载失败:', error)
          alert('下载失败，请稍后重试')
        })
    } else {
      // 直接下载
      const link = document.createElement('a')
      link.href = src
      link.download = videoFileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '100%',
        margin: '10px 0',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!error && (
        <video
          src={src}
          controls
          preload="metadata"
          crossOrigin="anonymous"
          muted={false}
          playsInline
          style={{
            maxWidth: '100%',
            maxHeight: '500px',
            borderRadius: '8px',
            display: 'block',
            backgroundColor: '#000',
          }}
          onError={(e) => {
            const videoElement = e.target as HTMLVideoElement
            const errorCode = videoElement.error?.code
            let errorMsg = '视频加载失败'
            
            if (errorCode === 1) {
              errorMsg = '视频加载被中止'
            } else if (errorCode === 2) {
              errorMsg = '网络错误，请检查网络连接或文件路径'
            } else if (errorCode === 3) {
              errorMsg = '视频解码失败，文件可能已损坏'
            } else if (errorCode === 4) {
              errorMsg = '视频格式不支持或文件不存在'
            }
            
            console.error('视频加载失败:', {
              src,
              errorCode,
              error: videoElement.error,
              message: videoElement.error?.message
            })
            setError(`${errorMsg}。路径: ${src}`)
          }}
          onLoadedMetadata={(e) => {
            setError(null)
          }}
          onLoadStart={() => {
            setError(null)
          }}
        >
          您的浏览器不支持视频播放。
        </video>
      )}
      {error && (
        <div style={{
          width: '100%',
          maxWidth: '800px',
          height: '300px',
          backgroundColor: '#000',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '16px',
        }}>
          视频无法加载
        </div>
      )}
      {isLoading && !error && (
        <div style={{ 
          color: '#666', 
          fontSize: '12px', 
          padding: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          正在检查文件...
        </div>
      )}
      {error && (
        <div style={{ 
          color: 'red', 
          fontSize: '12px', 
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderRadius: '4px',
          border: '1px solid #ffc107',
          marginTop: '4px'
        }}>
          {error}
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
            请检查：
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>文件路径是否正确</li>
              <li>文件是否已生成</li>
              <li>后端服务是否正常运行</li>
            </ul>
          </div>
        </div>
      )}
      {isHovered && (
        <button
          onClick={handleDownload}
          style={{
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
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
          }}
          title="下载视频"
        >
          <DownloadOutlined />
          下载视频
        </button>
      )}
    </div>
  )
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  
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
  
  // 处理视频路径
  const { content: videoProcessedContent, videoPaths: videoPathsMap } = processVideoPaths(processedContent)
  processedContent = videoProcessedContent
  // 确保 safeVideoPathsMap 有默认值
  const safeVideoPathsMap = videoPathsMap || new Map()
  
  // 处理文件路径：直接将文件路径替换为 HTML 标记，然后在组件中处理
  // 匹配文件路径，更宽松的匹配，包括单独成行的情况
  const filePathRegex = /(\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt))/gi
  const { processedContent: finalContent, filePathsMap } = useMemo(() => {
    const map = new Map<string, string>()
    let fileIndex = 0
    // 先收集所有文件路径
    const matches: Array<{ match: string; trimmed: string; index: number }> = []
    let tempContent = processedContent
    let match
    
    // 重置正则表达式
    filePathRegex.lastIndex = 0
    while ((match = filePathRegex.exec(processedContent)) !== null) {
      const trimmedMatch = match[0].trim()
      if (isPreviewableFile(trimmedMatch)) {
        const placeholder = `__FILE_PREVIEW_${fileIndex}__`
        map.set(placeholder, trimmedMatch)
        matches.push({ match: match[0], trimmed: trimmedMatch, index: match.index })
        fileIndex++
      }
    }
    
    // 然后替换文件路径为 HTML 标记（从后往前替换，避免索引问题）
    matches.sort((a, b) => b.index - a.index).forEach(({ match, trimmed, index }) => {
      const placeholder = Array.from(map.entries()).find(([_, path]) => path === trimmed)?.[0]
      if (placeholder) {
        // 替换为 HTML div 标记，这样 ReactMarkdown 会解析它
        tempContent = tempContent.substring(0, index) + 
          `<div class="file-preview-placeholder" data-file-path="${trimmed}" data-file-name="${trimmed.split('/').pop() || '文件'}"></div>` + 
          tempContent.substring(index + match.length)
      }
    })
    
    return { processedContent: tempContent, filePathsMap: map }
  }, [processedContent])
  
  processedContent = finalContent
  
  // 处理文本中的文件路径占位符
  const processTextWithFilePaths = (text: string, pathsMap: Map<string, string>): React.ReactNode[] => {
    if (!text || pathsMap.size === 0) return [text]
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const placeholderRegex = /__FILE_PREVIEW_(\d+)__/g
    let match
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = match[0]
      const filePath = pathsMap.get(placeholder)
      
      // 添加占位符前的文本
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      // 添加文件预览组件
      if (filePath) {
        const fileName = filePath.split('/').pop() || '文件'
        parts.push(
          <FilePreviewThumbnail key={`file-${filePath}-${match.index}`} filePath={filePath} fileName={fileName} />
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }
  
  // 处理文本中的视频路径占位符
  const processTextWithVideoPaths = (text: string, pathsMap: Map<string, { path: string; url: string; name: string }>): React.ReactNode[] => {
    if (!text || pathsMap.size === 0) return [text]
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const placeholderRegex = /__VIDEO_PREVIEW_(\d+)__/g
    let match
    
    while ((match = placeholderRegex.exec(text)) !== null) {
      const placeholder = match[0]
      const videoInfo = pathsMap.get(placeholder)
      
      // 添加占位符前的文本
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      // 添加视频预览组件
      if (videoInfo) {
        parts.push(
          <VideoWithDownload key={`video-${videoInfo.path}-${match.index}`} src={videoInfo.url} fileName={videoInfo.name} />
        )
      }
      
      lastIndex = match.index + match[0].length
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }
  
  // 自定义组件，用于替换文件路径占位符
  const components = useMemo(() => ({
    // 自定义表格组件
    table: ({ children, ...props }: any) => (
      <div className={styles.tableWrapper}>
        <table {...props}>{children}</table>
      </div>
    ),
    // 自定义 pre 组件，用于处理代码块
    pre: ({ children, ...props }: any) => {
      // 检查 pre 内的内容是否包含文件路径
      const childrenStr = typeof children === 'string' ? children : (Array.isArray(children) ? children.map(c => typeof c === 'string' ? c : String(c)).join('') : String(children))
      const hasFilePath = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/.test(childrenStr)
      
      if (hasFilePath) {
        const filePathMatch = childrenStr.match(/\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/)
        if (filePathMatch && isPreviewableFile(filePathMatch[0])) {
          const fileName = filePathMatch[0].split('/').pop() || '文件'
          // 如果 pre 只包含文件路径，直接返回预览组件
          if (childrenStr.trim() === filePathMatch[0].trim()) {
            return <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
          }
        }
      }
      
      return <pre {...props}>{children}</pre>
    },
    // 自定义代码块组件
    code: ({ node: _node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      // 处理代码块中的文件路径和视频路径
      const childrenStr = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : String(children))
      
      // 优先检查原始视频路径（因为占位符可能没有被正确处理）
      const hasVideoPath = /\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/.test(childrenStr)
      if (hasVideoPath) {
        const videoPathMatch = childrenStr.match(/\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/)
        if (videoPathMatch) {
          const videoPath = videoPathMatch[0].trim()
          const videoUrl = convertVideoPath(videoPath)
          const videoName = videoPath.split('/').pop() || 'video.mp4'
          // 如果代码块只包含视频路径，直接返回视频组件
          if (childrenStr.trim() === videoPath.trim()) {
            return <VideoWithDownload src={videoUrl} fileName={videoName} />
          }
          return (!inline && match)
            ? (
              <pre className={styles.codeBlock}>
                <code className={className} {...props}>
                  {childrenStr.substring(0, videoPathMatch.index)}
                  <VideoWithDownload src={videoUrl} fileName={videoName} />
                  {childrenStr.substring(videoPathMatch.index! + videoPathMatch[0].length)}
                </code>
              </pre>
            )
            : (
              <code className={styles.inlineCode} {...props}>
                {childrenStr.substring(0, videoPathMatch.index)}
                <VideoWithDownload src={videoUrl} fileName={videoName} />
                {childrenStr.substring(videoPathMatch.index! + videoPathMatch[0].length)}
              </code>
            )
        }
      }
      
      // 检查是否包含文件路径占位符或原始文件路径
      const hasPlaceholder = filePathsMap.size > 0 && /__FILE_PREVIEW_\d+__/.test(childrenStr)
      const hasFilePath = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/.test(childrenStr)
      
      if (hasPlaceholder || hasFilePath) {
        let processedChildren: React.ReactNode = childrenStr
        if (hasPlaceholder) {
          processedChildren = processTextWithFilePaths(childrenStr, filePathsMap)
        } else if (hasFilePath) {
          // 如果代码块中包含原始文件路径（没有被替换），直接处理
          const filePathMatch = childrenStr.match(/\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/)
          if (filePathMatch && isPreviewableFile(filePathMatch[0])) {
            const fileName = filePathMatch[0].split('/').pop() || '文件'
            // 如果代码块只包含文件路径，直接返回预览组件
            if (childrenStr.trim() === filePathMatch[0].trim()) {
              return <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
            }
            processedChildren = (
              <>
                {childrenStr.substring(0, filePathMatch.index)}
                <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
                {childrenStr.substring(filePathMatch.index! + filePathMatch[0].length)}
              </>
            )
          }
        }
        
        return (!inline && match)
          ? (
            <pre className={styles.codeBlock}>
              <code className={className} {...props}>
                {processedChildren}
              </code>
            </pre>
          )
          : (
            <code className={styles.inlineCode} {...props}>
              {processedChildren}
            </code>
          )
      }
      
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
    img: ({ src, alt, ...props }: any) => (
      <ImageWithDownload src={src || ''} alt={alt} />
    ),
    // 自定义链接组件
    a: ({ href, children, ...props }: any) => (
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
    // 自定义 div 组件，用于处理文件预览占位符和视频预览占位符
    div: ({ node, children, className, ...props }: any) => {
      // 检查是否是视频预览占位符
      // 支持多种属性访问方式（ReactMarkdown可能使用不同的属性结构）
      const classValue = className || node?.properties?.className || node?.properties?.class || props?.className
      const videoPath = node?.properties?.['data-video-path'] || props?.['data-video-path']
      const videoUrl = node?.properties?.['data-video-url'] || props?.['data-video-url']
      const videoName = node?.properties?.['data-video-name'] || props?.['data-video-name']
      
      if (classValue && (classValue.includes('video-preview-placeholder') || classValue === 'video-preview-placeholder')) {
        if (videoPath && videoUrl) {
          return <VideoWithDownload src={videoUrl} fileName={videoName || videoPath.split('/').pop() || 'video.mp4'} />
        }
        // 如果没有videoUrl，尝试从videoPath生成
        if (videoPath) {
          const url = convertVideoPath(videoPath)
          return <VideoWithDownload src={url} fileName={videoName || videoPath.split('/').pop() || 'video.mp4'} />
        }
      }
      
      // 检查是否是文件预览占位符
      const filePath = node?.properties?.['data-file-path'] || props?.['data-file-path']
      const fileName = node?.properties?.['data-file-name'] || props?.['data-file-name']
      
      if (classValue && (classValue.includes('file-preview-placeholder') || classValue === 'file-preview-placeholder')) {
        if (filePath && isPreviewableFile(filePath)) {
          return <FilePreviewThumbnail filePath={filePath} fileName={fileName || filePath.split('/').pop() || '文件'} />
        }
      }
      
      return <div className={className} {...props}>{children}</div>
    },
    // 自定义段落组件，用于检测和替换文件路径和视频路径
    p: ({ children, ...props }: any) => {
      const processChildren = (children: any): React.ReactNode => {
        if (typeof children === 'string') {
          // 优先检查原始视频路径（因为占位符可能没有被正确处理）
          const hasVideoPath = /\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/.test(children)
          if (hasVideoPath) {
            const videoPathMatch = children.match(/\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/)
            if (videoPathMatch) {
              const videoPath = videoPathMatch[0].trim()
              const videoUrl = convertVideoPath(videoPath)
              const videoName = videoPath.split('/').pop() || 'video.mp4'
              return (
                <>
                  {children.substring(0, videoPathMatch.index)}
                  <VideoWithDownload src={videoUrl} fileName={videoName} />
                  {children.substring(videoPathMatch.index! + videoPathMatch[0].length)}
                </>
              )
            }
          }
          
          // 检查是否包含视频路径占位符
          const hasVideoPlaceholder = /__VIDEO_PREVIEW_\d+__/.test(children)
          if (hasVideoPlaceholder && safeVideoPathsMap.size > 0) {
            return <>{processTextWithVideoPaths(children, safeVideoPathsMap)}</>
          }
          
          // 如果只有占位符但没有 map，尝试从占位符前后的文本中提取路径
          if (hasVideoPlaceholder && safeVideoPathsMap.size === 0) {
            // 占位符没有被正确处理，尝试匹配原始路径
            const videoPathMatch = children.match(/\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/)
            if (videoPathMatch) {
              const videoPath = videoPathMatch[0].trim()
              const videoUrl = convertVideoPath(videoPath)
              const videoName = videoPath.split('/').pop() || 'video.mp4'
              return (
                <>
                  {children.substring(0, videoPathMatch.index)}
                  <VideoWithDownload src={videoUrl} fileName={videoName} />
                  {children.substring(videoPathMatch.index! + videoPathMatch[0].length)}
                </>
              )
            }
          }
          // 检查是否包含文件路径（占位符或原始路径）
          const hasPlaceholder = filePathsMap.size > 0 && /__FILE_PREVIEW_\d+__/.test(children)
          const hasFilePath = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/.test(children)
          
          if (hasPlaceholder) {
            return processTextWithFilePaths(children, filePathsMap)
          } else if (hasFilePath) {
            // 如果包含原始文件路径，直接处理
            const filePathMatch = children.match(/\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/)
            if (filePathMatch && isPreviewableFile(filePathMatch[0])) {
              const fileName = filePathMatch[0].split('/').pop() || '文件'
              return (
                <>
                  {children.substring(0, filePathMatch.index)}
                  <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
                  {children.substring(filePathMatch.index! + filePathMatch[0].length)}
                </>
              )
            }
          }
          return children
        }
        if (Array.isArray(children)) {
          return children.map((child, idx) => {
            if (typeof child === 'string') {
              // 优先检查原始视频路径
              const hasVideoPath = /\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/.test(child)
              if (hasVideoPath) {
                const videoPathMatch = child.match(/\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/)
                if (videoPathMatch) {
                  const videoPath = videoPathMatch[0].trim()
                  const videoUrl = convertVideoPath(videoPath)
                  const videoName = videoPath.split('/').pop() || 'video.mp4'
                  return (
                    <React.Fragment key={idx}>
                      {child.substring(0, videoPathMatch.index)}
                      <VideoWithDownload src={videoUrl} fileName={videoName} />
                      {child.substring(videoPathMatch.index! + videoPathMatch[0].length)}
                    </React.Fragment>
                  )
                }
              }
              
              // 检查视频占位符
              const hasVideoPlaceholder = /__VIDEO_PREVIEW_\d+__/.test(child)
              if (hasVideoPlaceholder && safeVideoPathsMap.size > 0) {
                return <React.Fragment key={idx}>{processTextWithVideoPaths(child, safeVideoPathsMap)}</React.Fragment>
              }
              
              // 检查文件占位符
              const hasPlaceholder = filePathsMap.size > 0 && /__FILE_PREVIEW_\d+__/.test(child)
              const hasFilePath = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/.test(child)
              
              if (hasPlaceholder) {
                return <React.Fragment key={idx}>{processTextWithFilePaths(child, filePathsMap)}</React.Fragment>
              } else if (hasFilePath) {
                const filePathMatch = child.match(/\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/)
                if (filePathMatch && isPreviewableFile(filePathMatch[0])) {
                  const fileName = filePathMatch[0].split('/').pop() || '文件'
                  return (
                    <React.Fragment key={idx}>
                      {child.substring(0, filePathMatch.index)}
                      <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
                      {child.substring(filePathMatch.index! + filePathMatch[0].length)}
                    </React.Fragment>
                  )
                }
              }
              return <React.Fragment key={idx}>{child}</React.Fragment>
            }
            if (React.isValidElement(child) && child.props?.children) {
              return React.cloneElement(child, { key: idx, children: processChildren(child.props.children) })
            }
            return child
          })
        }
        if (React.isValidElement(children) && children.props?.children) {
          return React.cloneElement(children, { children: processChildren(children.props.children) })
        }
        return children
      }
      
      return <p {...props}>{processChildren(children)}</p>
    },
    // 自定义文本组件，用于处理行内文件路径和视频路径
    text: ({ children, ...props }: any) => {
      if (typeof children === 'string') {
        // 检查是否包含视频路径占位符
        const hasVideoPlaceholder = safeVideoPathsMap.size > 0 && /__VIDEO_PREVIEW_\d+__/.test(children)
        if (hasVideoPlaceholder) {
          return <>{processTextWithVideoPaths(children, safeVideoPathsMap)}</>
        }
        
        // 检查是否包含原始视频路径（没有被替换的）
        const hasVideoPath = /\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/.test(children)
        if (hasVideoPath) {
          const videoPathMatch = children.match(/\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/)
          if (videoPathMatch) {
            const videoPath = videoPathMatch[0].trim()
            const videoUrl = convertVideoPath(videoPath)
            const videoName = videoPath.split('/').pop() || 'video.mp4'
            return (
              <>
                {children.substring(0, videoPathMatch.index)}
                <VideoWithDownload src={videoUrl} fileName={videoName} />
                {children.substring(videoPathMatch.index! + videoPathMatch[0].length)}
              </>
            )
          }
        }
        
        // 检查是否包含文件路径（占位符或原始路径）
        const hasPlaceholder = filePathsMap.size > 0 && /__FILE_PREVIEW_\d+__/.test(children)
        const hasFilePath = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/.test(children)
        
        if (hasPlaceholder) {
          return <>{processTextWithFilePaths(children, filePathsMap)}</>
        } else if (hasFilePath) {
          // 如果包含原始文件路径，直接处理
          const filePathMatch = children.match(/\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/)
          if (filePathMatch && isPreviewableFile(filePathMatch[0])) {
            const fileName = filePathMatch[0].split('/').pop() || '文件'
            return (
              <>
                {children.substring(0, filePathMatch.index)}
                <FilePreviewThumbnail filePath={filePathMatch[0]} fileName={fileName} />
                {children.substring(filePathMatch.index! + filePathMatch[0].length)}
              </>
            )
          }
        }
        return <>{children}</>
      }
      return <>{children}</>
    },
    // 自定义列表项组件，用于处理列表中的文件路径
    li: ({ children, ...props }: any) => {
      const processChildren = (children: any): React.ReactNode => {
        if (typeof children === 'string') {
          return processTextWithFilePaths(children, filePathsMap)
        }
        if (Array.isArray(children)) {
          return children.map((child, idx) => {
            if (typeof child === 'string') {
              return <React.Fragment key={idx}>{processTextWithFilePaths(child, filePathsMap)}</React.Fragment>
            }
            if (React.isValidElement(child) && child.props?.children) {
              return React.cloneElement(child, { key: idx, children: processChildren(child.props.children) })
            }
            return child
          })
        }
        if (React.isValidElement(children) && children.props?.children) {
          return React.cloneElement(children, { children: processChildren(children.props.children) })
        }
        return children
      }
      
      return <li {...props}>{processChildren(children)}</li>
    },
  }), [filePathsMap, safeVideoPathsMap])
  
  // 使用 useEffect 在渲染后通过 DOM 操作替换文件路径和视频路径（备用方案）
  React.useEffect(() => {
    // 延迟执行，确保 ReactMarkdown 已经渲染完成
    const timer = setTimeout(() => {
      // 查找所有包含视频路径的文本节点
      const videoPathRegex = /\/(?:tmp|app\/upload)\/[^\n<>"]+\.(mp4|avi|mov|wmv|flv|webm|mkv)/gi
      // 查找所有包含文件路径的文本节点（在整个文档中搜索，不仅仅在 containerRef 中）
      const filePathRegex = /\/app\/upload\/[^\s\)\n<>"]+\.(csv|xlsx|xls|pdf|docx|md|json|html|pptx|txt)/gi
      
      // 首先在 containerRef 中搜索，如果没有找到，则在整个文档中搜索
      let searchRoot: Node = containerRef.current || document.body
      
      // 首先处理 textarea 元素（文件路径可能在代码块中被渲染为 textarea）
      // 在整个文档中搜索 textarea，不仅仅在 searchRoot 中
      const allTextareas = document.querySelectorAll('textarea')
      allTextareas.forEach((textarea: HTMLTextAreaElement) => {
        // 检查是否已经处理过
        if (textarea.parentElement?.querySelector('.file-preview-container')) {
          return
        }
        
        if (textarea.value) {
          const text = textarea.value
          filePathRegex.lastIndex = 0
          if (filePathRegex.test(text)) {
            filePathRegex.lastIndex = 0
            const match = filePathRegex.exec(text)
            if (match) {
              const trimmedMatch = match[0].trim()
              if (isPreviewableFile(trimmedMatch)) {
                // 如果 textarea 包含文件路径，替换整个 textarea
                const parent = textarea.parentElement
                if (parent && !parent.querySelector('.file-preview-container')) {
                  const fileName = trimmedMatch.split('/').pop() || '文件'
                  const previewContainer = document.createElement('span')
                  previewContainer.className = 'file-preview-container'
                  previewContainer.setAttribute('data-file-path', trimmedMatch)
                  previewContainer.setAttribute('data-file-name', fileName)
                  
                  // 替换 textarea
                  parent.replaceChild(previewContainer, textarea)
                  
                  // 使用 React 渲染文件预览组件
                  try {
                    if (typeof createRoot !== 'undefined') {
                      const root = createRoot(previewContainer)
                      root.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />)
                    } else {
                      ReactDOM.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />, previewContainer)
                    }
                  } catch (e) {
                    console.error('Error rendering file preview in textarea:', e)
                    try {
                      ReactDOM.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />, previewContainer)
                    } catch (e2) {
                      console.error('Error with ReactDOM.render:', e2)
                    }
                  }
                }
              }
            }
          }
        }
      })
      
      // 然后处理普通文本节点
      const walker = document.createTreeWalker(
        searchRoot,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      const textNodes: Text[] = []
      let node
      while ((node = walker.nextNode())) {
        // 跳过 textarea 内的文本节点（已经处理过了）
        if (node.parentElement?.tagName === 'TEXTAREA') {
          continue
        }
        
        if (node.textContent && filePathRegex.test(node.textContent)) {
          filePathRegex.lastIndex = 0 // 重置正则
          // 跳过已经处理过的节点
          const parent = node.parentElement
          if (parent && (parent.classList.contains('file-preview-container') || parent.querySelector('.file-preview-container'))) {
            continue
          }
          textNodes.push(node as Text)
        }
      }
      
      // 替换文本节点中的文件路径
      textNodes.forEach(textNode => {
        const parent = textNode.parentElement
        if (!parent) return
        if (parent.classList.contains('file-preview-container')) return // 跳过已经处理过的节点
        if (parent.querySelector('.file-preview-container')) return // 跳过已经包含预览组件的节点
        
        const text = textNode.textContent || ''
        filePathRegex.lastIndex = 0
        const matches: Array<{ match: string; index: number }> = []
        let match
        
        while ((match = filePathRegex.exec(text)) !== null) {
          const trimmedMatch = match[0].trim()
          if (isPreviewableFile(trimmedMatch)) {
            matches.push({ match: match[0], index: match.index })
          }
        }
        
        if (matches.length > 0) {
          // 从后往前替换，避免索引问题
          const firstMatch = matches[matches.length - 1] // 最后一个（索引最小的）
          const trimmedMatch = firstMatch.match.trim()
          if (isPreviewableFile(trimmedMatch)) {
            const beforeText = text.substring(0, firstMatch.index)
            const afterText = text.substring(firstMatch.index + firstMatch.match.length)
            const fileName = trimmedMatch.split('/').pop() || '文件'
            
            // 创建新的 DOM 结构
            const fragment = document.createDocumentFragment()
            if (beforeText) {
              fragment.appendChild(document.createTextNode(beforeText))
            }
            
            // 创建文件预览组件的容器
            const previewContainer = document.createElement('span')
            previewContainer.setAttribute('data-file-path', trimmedMatch)
            previewContainer.setAttribute('data-file-name', fileName)
            previewContainer.className = 'file-preview-container'
            fragment.appendChild(previewContainer)
            
            if (afterText) {
              fragment.appendChild(document.createTextNode(afterText))
            }
            
            parent.replaceChild(fragment, textNode)
            
            // 使用 React 渲染文件预览组件
            if (previewContainer.parentElement) {
              try {
                // 尝试使用 React 18 的 createRoot
                if (typeof createRoot !== 'undefined') {
                  const root = createRoot(previewContainer)
                  root.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />)
                } else {
                  // 回退到 ReactDOM.render (React 17)
                  ReactDOM.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />, previewContainer)
                }
              } catch (e) {
                console.error('Error rendering file preview:', e)
                // 如果都失败，使用 ReactDOM.render
                try {
                  ReactDOM.render(<FilePreviewThumbnail filePath={trimmedMatch} fileName={fileName} />, previewContainer)
                } catch (e2) {
                  console.error('Error with ReactDOM.render:', e2)
                }
              }
            }
          }
        }
      })
    }, 300) // 延迟 300ms 执行，确保 ReactMarkdown 完全渲染完成
    
    return () => clearTimeout(timer)
  }, [content])
  
  return (
    <div ref={containerRef} className={`${styles.markdownContent} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={false}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
