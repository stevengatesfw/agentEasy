import React from 'react'
import AppList from '@/app/components/app-hub/app-list'

const AppListPage = async () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1F36',
      padding: '20px 0',
    }}>
      <AppList />
    </div>
  )
}

export default AppListPage
