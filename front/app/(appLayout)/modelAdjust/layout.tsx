'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './index.module.scss'
import Icon from '@/app/components/base/iconFont'

type ModelAdjustLayoutProps = {
  children: React.ReactNode
}

const ModelAdjustLayout = ({ children }: ModelAdjustLayoutProps) => {
  const [currentType, setCurrentType] = useState('finetune')
  const navigationRouter = useRouter()
  const currentPathname = usePathname()

  useEffect(() => {
    if (currentPathname.includes('datasetManager')) {
      setCurrentType('dataset')
    } else if (currentPathname.includes('scriptManager')) {
      setCurrentType('script')
    } else {
      setCurrentType('finetune')
    }
  }, [currentPathname])

  const processNavigation = (newType: string) => {
    setCurrentType(newType)
    if (newType === 'dataset') {
      navigationRouter.replace('/modelAdjust/datasetManager')
    } else if (newType === 'script') {
      navigationRouter.replace('/modelAdjust/scriptManager')
    } else {
      navigationRouter.replace('/modelAdjust/finetuneManager')
    }
  }

  const renderMenuItem = (type: string, iconType: string, label: string) => {
    const isActive = currentType === type
    
    return (
      <div 
        className={`${styles.menuItem} ${isActive && styles.active}`} 
        onClick={() => processNavigation(type)}
      >
        <div className={styles.icon}>
          <Icon type={iconType} />
        </div>
        <div className={styles.txt}>
          {label}
        </div>
      </div>
    )
  }

  const renderSidebarMenu = () => {
    return (
      <div className={styles.slide}>
        <div className={styles.menu}>
          {renderMenuItem('finetune', 'icon-moxingweidiao', '微调管理')}
          {renderMenuItem('dataset', 'icon-shujujiguanli', '数据集管理')}
          {renderMenuItem('script', 'icon-jiaobenguanli', '脚本管理')}
        </div>
      </div>
    )
  }

  return (
    <div className='page'>
      <div className={styles.container}>
        {renderSidebarMenu()}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default ModelAdjustLayout

