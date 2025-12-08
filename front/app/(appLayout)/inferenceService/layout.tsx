'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import IconFont from '@/app/components/base/iconFont'
const menuItems = [
  {
    key: 'platformService',
    label: '推理服务',
    path: '/inferenceService/platform',
    icon: () => <IconFont type="icon-shezhi2" style={{ fontSize: '24px' }}/>,
  },
  {
    key: 'cloudService',
    label: '厂商配置',
    path: '/inferenceService/cloud',
    icon: () => <IconFont type="icon-a-yunduanyunfuwu" style={{ fontSize: '24px' }}/>,
  },
]

const InferenceService = ({ children }) => {
  const [activeMenu, setActiveMenu] = useState<string>('platformService')

  useEffect(() => {
    const path = window.location.pathname
    const activeMenu = menuItems.find(item => item.path === path)?.key
    setActiveMenu(activeMenu || 'platformService')
  }, [])
  return (
    <div className='flex flex-row h-screen' style={{ background: '#1A1F36' }}>
      {/* 侧边栏，科技感风格 */}
      <div 
        className='w-48 flex flex-col min-w-[100px] flex-shrink-0'
        style={{
          background: 'rgba(26, 31, 54, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(0, 212, 255, 0.3)',
        }}
      >
        <div className='flex flex-col py-4'>
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeMenu === item.key

            return (
              <Link href={item.path}
                key={item.key}
                className='flex items-center px-4 py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200'
                style={{
                  background: isActive ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                  color: isActive ? '#00D4FF' : '#CBD5E0',
                  textShadow: isActive ? '0 0 8px rgba(0, 212, 255, 0.7)' : 'none',
                  border: isActive ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.color = '#00D4FF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#CBD5E0'
                  }
                }}
                onClick={() => setActiveMenu(item.key)}
              >
                <div 
                  className='w-5 h-5 mr-3'
                  style={{
                    color: isActive ? '#00D4FF' : '#CBD5E0',
                  }}
                >
                  <IconComponent />
                </div>
                <span 
                  className='font-medium'
                  style={{
                    color: isActive ? '#00D4FF' : '#CBD5E0',
                    textShadow: isActive ? '0 0 8px rgba(0, 212, 255, 0.7)' : 'none',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className='flex-1' style={{ background: '#1A1F36' }}>
        {children}
      </div>
    </div>
  )
}

export default InferenceService
