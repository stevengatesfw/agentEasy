'use client'

import React, { useState } from 'react'
import { ValueType, formatValueByType } from '../../utils'
import ImagePreviewportal from './components/pic-view-portal'
import { PUBLIC_API_PREFIX } from '@/app-specs'

const FieldItem = ({
  name,
  label,
  value: _value,
  style = {},
  originType,
  placeholder,
  onLoadError,
}) => {
  // 安全地处理 value，支持 base64 图片和文件路径
  let value = formatValueByType(_value, ValueType.String)
  
  // 如果是 base64 格式的图片（data:image/...），直接使用，不进行路径替换
  const isBase64Image = typeof value === 'string' && value.startsWith('data:image/')
  
  if (!isBase64Image && typeof value === 'string') {
    // 只对文件路径进行替换
    value = value.replace('app', 'static')
    // 开发环境下添加前缀（但 base64 图片不需要）
    if (process.env.NODE_ENV === 'development')
      value = `${PUBLIC_API_PREFIX.replace('api', '')}${value}`
  }
  
  const [openPortal, setOpenPortal] = useState<boolean>(false)
  return (
    <React.Fragment>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="w-250 h-250 rounded-lg object-cover cursor-pointer border-[0.5px] border-black/5"
        alt=""
        onError={() => {
          onLoadError && onLoadError(value)
        }}
        src={value}
        onClick={() =>
          setOpenPortal(true)
        }
        style={style}
      />

      {/* 点击图片弹窗展示 */}
      {(openPortal && value) && (
        <ImagePreviewportal
          url={value}
          onCancel={() => setOpenPortal(false)}
        />
      )}
    </React.Fragment>
  )
}
export default React.memo(FieldItem)
