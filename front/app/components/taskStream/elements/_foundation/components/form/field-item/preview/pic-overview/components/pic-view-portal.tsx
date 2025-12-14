import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { CloseOutlined } from '@ant-design/icons'

interface ImageModalProps {
  imageUrl?: string
  url?: string
  onClose?: () => void
  onCancel?: () => void
}

const ImageModalPortal: FC<ImageModalProps> = ({
  imageUrl,
  url,
  onClose,
  onCancel,
}) => {
  // 支持 imageUrl 和 url 两种 prop 名称
  const imageSrc = imageUrl || url || ''
  // 支持 onClose 和 onCancel 两种 prop 名称
  const handleClose = onClose || onCancel || (() => {})

  const handleBackdropClick = (e: React.MouseEvent) => {
    // 如果点击的是背景本身（不是图片或关闭按钮），则关闭弹窗
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleClose()
  }

  const closeButtonStyle = 'absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/8 rounded-lg backdrop-blur-[2px] cursor-pointer z-10'
  const modalStyle = 'fixed inset-0 p-8 flex items-center justify-center bg-black/80 z-[1000]'
  const imageStyle = 'max-w-full max-h-full'

  return createPortal(
    <div className={modalStyle} onClick={handleBackdropClick}>
      <img
        alt='preview image'
        src={imageSrc}
        className={imageStyle}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className={closeButtonStyle}
        onClick={handleCloseClick}
      >
        <CloseOutlined className='w-4 h-4 text-white' />
      </div>
    </div>,
    document.body,
  )
}

export default ImageModalPortal
