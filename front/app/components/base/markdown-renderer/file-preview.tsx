'use client'
import React, { useState } from 'react'
import { Modal } from 'antd'
import { EyeOutlined, CloseOutlined, DownloadOutlined } from '@ant-design/icons'
import PreviewExcel from '@/app/components/preview/previewExcel'
import PreviewPdfDoc from '@/app/components/preview/previewPdf' // 注意：previewPdf 导出的是 PreviewDoc
import PreviewDoc from '@/app/components/preview/previewDoc'
import PreviewMD from '@/app/components/preview/previewMD'
import PreviewJson from '@/app/components/preview/previewJSON'
import PreviewHtml from '@/app/components/preview/previewHTML'
import PreviewPpt from '@/app/components/preview/previewPpt'
import PreviewTxt from '@/app/components/preview/previewTxt'
import { PUBLIC_API_PREFIX } from '@/app-specs'

type FilePreviewProps = {
  filePath: string
  fileName?: string
  className?: string
}

// 获取文件扩展名
const getFileExtension = (path: string): string => {
  const match = path.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

// 判断是否为可预览的文件
const isPreviewableFile = (path: string): boolean => {
  const ext = getFileExtension(path)
  const previewableExts = ['csv', 'xlsx', 'xls', 'pdf', 'docx', 'md', 'json', 'html', 'pptx', 'txt']
  return previewableExts.includes(ext)
}

// 转换文件路径为可访问的 URL
const convertFilePath = (path: string): string => {
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

// 小窗口预览组件
const FilePreviewThumbnail: React.FC<FilePreviewProps> = ({ filePath, fileName, className = '' }) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const fileUrl = convertFilePath(filePath)
  const ext = getFileExtension(filePath)
  const displayName = fileName || filePath.split('/').pop() || '文件'

  // 根据文件类型渲染预览内容
  const renderPreview = () => {
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
      return <PreviewExcel url={fileUrl} />
    } else if (ext === 'pdf') {
      return <PreviewPdfDoc url={fileUrl} />
    } else if (ext === 'docx') {
      return <PreviewDoc url={fileUrl} />
    } else if (ext === 'md') {
      return <div className='p-5'><PreviewMD url={fileUrl} /></div>
    } else if (ext === 'json') {
      return <div className='p-5'><PreviewJson url={fileUrl} /></div>
    } else if (ext === 'html') {
      return <PreviewHtml url={fileUrl} />
    } else if (ext === 'pptx') {
      return <PreviewPpt url={fileUrl} />
    } else if (ext === 'txt') {
      return <div className='p-5'><PreviewTxt url={fileUrl} /></div>
    }
    return <div className='p-5 text-center text-gray-500'>不支持预览此文件类型</div>
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = displayName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div
        className={`relative inline-block ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          cursor: 'pointer',
          transition: 'all 0.2s',
          maxWidth: '400px',
        }}
        onClick={() => setIsModalVisible(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EyeOutlined style={{ fontSize: '16px', color: '#1677ff' }} />
          <span style={{ fontSize: '14px', color: '#1677ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {isHovered && (
            <button
              onClick={handleDownload}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="下载文件"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <DownloadOutlined style={{ fontSize: '14px', color: '#1677ff' }} />
            </button>
          )}
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
          点击预览文件内容
        </div>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{displayName}</span>
            <a
              href={fileUrl}
              download={displayName}
              style={{ fontSize: '14px', color: '#1677ff' }}
              onClick={(e) => e.stopPropagation()}
            >
              <DownloadOutlined /> 下载
            </a>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 100px)', padding: '20px', overflow: 'auto' }}
        closeIcon={<CloseOutlined style={{ fontSize: '18px' }} />}
      >
        <div style={{ height: '100%', width: '100%' }}>
          {renderPreview()}
        </div>
      </Modal>
    </>
  )
}

export { FilePreviewThumbnail, isPreviewableFile, getFileExtension }

