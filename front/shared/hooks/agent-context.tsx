'use client'

import { useRequest } from 'ahooks'
import { createContext, useContext } from 'use-context-selector'
import type { FC, ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { getAgentInit, getAgentSessions } from '@/infrastructure/api/agent'

type AgentContextValue = {
  agentToken: undefined | string
  agentHistoryList: undefined | any[]
  getAgentToken: (payload: any) => void
  getAgentHistorys: (payload: any) => void
}

const AgentContext = createContext<AgentContextValue>({
  agentToken: undefined,
  agentHistoryList: undefined,
  getAgentToken: (payload: any) => { },
  getAgentHistorys: (payload: any) => { },
})

type AgentContextProviderProps = {
  children: ReactNode
}

export const AgentContextProvider: FC<AgentContextProviderProps> = ({ children }) => {
  const { data: resData, run: getAgentHistorys } = useRequest<any, any>(getAgentSessions, { manual: true })
  const { data: tokenData, run: getAgentToken } = useRequest<any, any>(getAgentInit, { manual: true })

  const normalizeToken = (raw?: string) => {
    if (!raw)
      return undefined
    return raw.startsWith('Bearer ') ? raw.slice('Bearer '.length) : raw
  }

  // 刷新后：优先读取本地持久化 token，避免首屏 agentToken=undefined 导致 sessions 不拉取或被覆盖
  const persistedToken = useMemo(() => {
    if (typeof window === 'undefined')
      return undefined
    // 兼容历史：登录用户优先复用 console_token（历史按账号），否则用 agent_token（历史按设备）
    return normalizeToken(localStorage?.getItem('console_token') || localStorage?.getItem('agent_token') || undefined)
  }, [])

  // 持久化 token，确保刷新后 sessions/history/run 使用同一个 TempToken
  useEffect(() => {
    const token = normalizeToken(tokenData?.token)
    if (token)
      localStorage?.setItem('agent_token', token)
  }, [tokenData?.token])

  return (
    <AgentContext.Provider value={{
      agentToken: normalizeToken(tokenData?.token) || persistedToken,
      agentHistoryList: resData?.data,
      getAgentHistorys,
      getAgentToken,
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export const useAgentContext = () => useContext(AgentContext)
