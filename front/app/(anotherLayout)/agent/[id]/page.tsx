'use client'
import { Button, Popconfirm, message } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { DeleteOutlined, MenuOutlined } from '@ant-design/icons'
import AgentChatBox from './agent-chat-box'
import styles from './page.module.scss'
import { useAgentContext } from '@/shared/hooks/agent-context'
import { deleteAgentSession } from '@/infrastructure/api/agent'

const SideBar = (
  { detailData, createEvent, chatSelect, agentHistoryList }:
  { detailData: any; createEvent: any; chatSelect: any; agentHistoryList: any }) => {
  return <div className={styles.agentSidebar}>
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Button type='primary' onClick={createEvent} style={{ width: '80%' }} disabled={detailData.isStreaming}>新建对话</Button>
    </div>
    <div className={styles.agentHistory}>
      <div className={styles.agentTopics} onClick={chatSelect}>
        {
          agentHistoryList?.map((item, index) => {
            return (
              <div
                key={index}
                data-id={item.sessionid}
                className={`${styles.chatTitle} ${detailData.chatId === item.sessionid ? styles.chatActive : ''}`}
                onClick={chatSelect}
              >
                <span className={styles.chatTitleText}>{item.title}</span>
                <Popconfirm
                  title="删除该会话？"
                  description="删除后无法恢复"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={async (e) => {
                    e?.stopPropagation()
                    try {
                      await deleteAgentSession({ appId: detailData.appId, sessionid: item.sessionid })
                      message.success('已删除')
                      // 如果删除的是当前会话，清空右侧
                      if (detailData.chatId === item.sessionid) {
                        createEvent()
                      }
                      // 刷新列表
                      detailData.refresh?.()
                    }
                    catch {
                      // 错误提示由 base.ts 的 Toast 统一处理
                    }
                  }}
                  onPopupClick={(e) => e.stopPropagation()}
                >
                  <DeleteOutlined
                    className={styles.chatTitleDelete}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            )
          })
        }
      </div>
    </div>
  </div>
}

const AgentPage = (req) => {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const chatboxRef = useRef<{ clearChat: () => void; setShowLogic: (showLogic: boolean) => void; setChatId: (chatId: string) => void }>(null)
  const { agentHistoryList, getAgentToken, getAgentHistorys, agentToken } = useAgentContext()
  const agentId = req.params.id
  const detailData = {
    chatId: currentChatId,
    isStreaming: false,
    appId: agentId,
    refresh: () => getAgentHistorys({ appId: agentId }),
  }

  const chatSelect = (event) => {
    const chatId = event.target.getAttribute('data-id')
    if (!chatId)
      return

    setCurrentChatId(chatId)
    chatboxRef.current?.setChatId(chatId)
    chatboxRef.current?.setShowLogic(false)
    setMobileSidebarOpen(false)
  }

  const createEvent = () => {
    setCurrentChatId(undefined)
    chatboxRef.current?.clearChat()
    setMobileSidebarOpen(false)
  }

  const handleChatIdChange = (chatId: string | undefined) => {
    setCurrentChatId(chatId)
  }

  const sidebar = (
    <SideBar
      agentHistoryList={agentHistoryList}
      chatSelect={chatSelect}
      createEvent={createEvent}
      detailData={detailData}
    />
  )

  useEffect(() => {
    // 每次进入都走 init：用平台 Authorization 绑定账号，并在需要时触发迁移
    // 不再使用 agent_token_<appId>，避免旧游客 token 把历史“锁死”为空
    getAgentToken({ appId: agentId })
  }, [agentId, getAgentToken])

  useEffect(() => {
    if (!agentToken)
      return
    getAgentHistorys({ appId: agentId })
  }, [agentToken, agentId, getAgentHistorys])

  return (
    <div className={styles.agentShell}>
      <div className={styles.mobileTopBar}>
        <Button icon={<MenuOutlined />} onClick={() => setMobileSidebarOpen(true)}>
          历史记录
        </Button>
      </div>

      {/* 桌面侧边栏 */}
      <div className={styles.desktopSidebar}>
        {sidebar}
      </div>

      {/* 移动端侧边栏抽屉 */}
      {mobileSidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setMobileSidebarOpen(false)}>
          <div className={styles.sidebarPanel} onClick={e => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      <AgentChatBox
        ref={chatboxRef}
        agentId={agentId}
        sidebar={null}
        currentChatId={currentChatId}
        onChatIdChange={handleChatIdChange}
      />
    </div>
  )
}

export default AgentPage
