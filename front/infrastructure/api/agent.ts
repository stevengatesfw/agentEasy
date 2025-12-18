import type { Fetcher } from 'swr'
import { del, get, post } from './base'
import type { BaseResponse } from '@/core/data/common'

export const getAgentSessions = ({ appId }) => {
  // 必须带 TempToken（isAgent=true），否则会用 Authorization 导致与 run() 的 from_who 不一致，刷新后历史为空
  return get(`conversation/${appId}/sessions`, {}, { isAgent: true })
}

export const getAgentInit = ({ appId }) => {
  // 设备维度：带 TempToken（isAgent=true），后端会直接复用；没有则后端生成并返回
  return get(`conversation/${appId}/init`, {}, { isAgent: true })
}

export const getChatDetail: Fetcher<Promise<BaseResponse>, { url: string; options: { params: any } }> = ({ url, options }) =>
  get<BaseResponse>(url, options, { isAgent: true })

export const chatFeedback: Fetcher<any, any> = ({ appId, ...others }) => {
  return post<any>(`/conversation/${appId}/feedback`, { body: others }, { isAgent: true })
}

export const deleteAgentSession = ({ appId, sessionid }) => {
  return del(`/conversation/${appId}/sessions/${sessionid}`, {}, { isAgent: true })
}

export const deleteAgentTurn = ({ appId, sessionid, turn_number }) => {
  return del(`/conversation/${appId}/sessions/${sessionid}/turns/${turn_number}`, {}, { isAgent: true })
}
