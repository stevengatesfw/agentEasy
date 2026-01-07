'use client'
import React, { useState, useRef, useEffect } from 'react'
import { ValueType, formatValueByType } from '../../utils'
import { PUBLIC_API_PREFIX, API_PREFIX } from '@/app-specs'
import { Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import TextEditor from '../../text-composer'

// 视频文件扩展名正则表达式
const VIDEO_EXTENSIONS = /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i

// 验证是否是有效的视频路径（更宽松的验证）
const isValidVideoPath = (path: string): boolean => {
  if (!path || typeof path !== 'string')
    return false
  
  // 只要包含视频文件扩展名，就认为是有效的视频路径
  return VIDEO_EXTENSIONS.test(path)
}

const FieldItem = ({
  value: _value,
}) => {
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // 安全地提取视频路径
  const extractVideoPath = (): string | null => {
    try {
      let videoPath: string | undefined
      
      if (Array.isArray(_value)) {
        videoPath = _value.length > 0 ? String(_value[0]) : undefined
      } else if (typeof _value === 'string') {
        videoPath = _value
      } else if (typeof _value === 'object' && _value !== null) {
        // 如果是对象，尝试提取路径
        // 检查常见的路径字段
        videoPath = (_value as any).path || (_value as any).url || (_value as any).file_path || (_value as any).file_url || 
                    (Array.isArray((_value as any).files) && (_value as any).files.length > 0 ? String((_value as any).files[0]) : undefined) ||
                    (Array.isArray((_value as any).file_urls) && (_value as any).file_urls.length > 0 ? String((_value as any).file_urls[0]) : undefined)
        
        // 如果仍然没有找到，尝试 JSON 字符串解析
        if (!videoPath) {
          try {
            const jsonStr = JSON.stringify(_value)
            const parsed = JSON.parse(jsonStr)
            videoPath = parsed.path || parsed.url || parsed.file_path || parsed.file_url || 
                        (Array.isArray(parsed.files) && parsed.files.length > 0 ? String(parsed.files[0]) : undefined) ||
                        (Array.isArray(parsed.file_urls) && parsed.file_urls.length > 0 ? String(parsed.file_urls[0]) : undefined)
          } catch (e) {
            // JSON 解析失败，忽略
          }
        }
      } else {
        videoPath = _value ? String(_value) : undefined
      }
      
      // 验证输入是否是有效的视频路径
      if (!videoPath || typeof videoPath !== 'string' || !isValidVideoPath(videoPath)) {
        return null
      }
      
      return videoPath
    } catch (error) {
      console.error('Error extracting video path:', error, 'value:', _value)
      return null
    }
  }
  
  const videoPath = extractVideoPath()
  
  // 如果不是有效的视频路径，回退到文本显示
  if (!videoPath) {
    return <TextEditor value={_value} />
  }
  
  // 安全地处理视频 URL
  let videoUrl: string
  let fileName: string
  try {
    let value = formatValueByType(videoPath.replace('app', 'static'), ValueType.String)
    
    // 获取文件名用于下载
    fileName = videoPath.split('/').pop() || 'video.mp4'
    
    // 处理文件路径，如果是/tmp/word_english.mp4这样的路径，需要通过API访问
    if (value.startsWith('/tmp/')) {
      // 对于/tmp路径的文件，使用API访问（使用API_PREFIX因为文件下载API在/console/api下）
      const apiPrefix = API_PREFIX || '/console/api'
      const apiUrl = `${apiPrefix}/files/download?file_path=${encodeURIComponent(value)}`
      videoUrl = apiUrl
    } else {
      // 对于其他路径，使用静态资源路径
      if (process.env.NODE_ENV === 'development')
        value = `${PUBLIC_API_PREFIX.replace('api', '')}${value}`
      videoUrl = value
    }
  } catch (error) {
    console.error('Error processing video URL:', error, 'videoPath:', videoPath)
    return (
      <div className="flex flex-col gap-3">
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="text-red-600 font-medium mb-2">视频处理错误</div>
          <div className="text-red-500 text-sm mb-2">{error instanceof Error ? error.message : String(error)}</div>
        </div>
        <TextEditor value={_value} />
      </div>
    )
  }
  
  // 视频加载错误处理
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const error = e.currentTarget.error
    if (error) {
      let errorMsg = '视频加载失败'
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMsg = '视频加载被中止'
          break
        case error.MEDIA_ERR_NETWORK:
          errorMsg = '网络错误，无法加载视频'
          break
        case error.MEDIA_ERR_DECODE:
          errorMsg = '视频解码失败'
          break
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = '视频格式不支持或路径无效'
          break
      }
      setVideoError(errorMsg)
      console.error('视频加载错误:', errorMsg, '视频URL:', videoUrl, '原始路径:', videoPath)
    }
  }
  
  // 视频加载成功时清除错误
  const handleVideoLoaded = () => {
    setVideoError(null)
  }
  
  // 当视频URL变化时，重置错误状态
  useEffect(() => {
    setVideoError(null)
  }, [videoUrl])
  
  // 下载处理函数
  const handleDownload = () => {
    if (videoPath.startsWith('/tmp/')) {
      // 对于/tmp路径的文件，通过API下载（使用API_PREFIX因为文件下载API在/console/api下）
      const apiPrefix = API_PREFIX || '/console/api'
      const apiUrl = `${apiPrefix}/files/download?file_path=${encodeURIComponent(videoPath)}`
      fetch(apiUrl)
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
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        })
        .catch(error => {
          console.error('下载失败:', error)
        })
    } else {
      // 对于其他路径，直接下载
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  
  // 如果有错误，显示错误信息和原始值
  if (videoError) {
    return (
      <div className="flex flex-col gap-3">
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="text-red-600 font-medium mb-2">视频加载失败</div>
          <div className="text-red-500 text-sm mb-2">{videoError}</div>
          <div className="text-gray-600 text-xs">视频路径: {videoPath}</div>
          <div className="text-gray-600 text-xs">视频URL: {videoUrl}</div>
        </div>
        <TextEditor value={_value} />
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-3">
      <div className="w-full">
        <video 
          ref={videoRef}
          controls 
          src={videoUrl}
          className="w-full max-w-2xl rounded-lg"
          style={{ maxHeight: '500px' }}
          onError={handleVideoError}
          onLoadedData={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
        >
          您的浏览器不支持视频播放。
        </video>
      </div>
      {videoError && (
        <div className="text-red-500 text-sm">{videoError}</div>
      )}
      <div>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleDownload}
        >
          下载视频
        </Button>
      </div>
    </div>
  )
}
export default React.memo(FieldItem)

