'use client'

import React from 'react'
import styles from './page.module.scss'

const DocumentCenterPage = () => {
  // 帮助文档功能已暂时禁用
  // const renderDocumentFrame = () => {
  //   return (
  //     <iframe src={`${window.location.origin}/console/api/doc/view`} />
  //   )
  // }

  return (
    <div className={styles.outerWrap}>
      <div className={styles.docWrap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#666' }}>帮助文档功能暂时不可用</h2>
          <p style={{ fontSize: '16px', color: '#999' }}>该功能正在维护中，敬请期待</p>
        </div>
        {/* {renderDocumentFrame()} */}
      </div>
    </div>
  )
}

export default DocumentCenterPage
