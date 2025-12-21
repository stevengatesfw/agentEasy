'use client'
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Button, Input, Modal, Popconfirm, Upload } from 'antd'
import { DeleteOutlined, EditOutlined, RedoOutlined, UserOutlined } from '@ant-design/icons'
import { useKeyPress } from 'ahooks'
import Image from 'next/image'
import { v4 as uuidV4 } from 'uuid'
import copy from 'copy-to-clipboard'
import { message } from 'antd/lib'
import styles from './index.module.scss'
import { API_PREFIX } from '@/app-specs'
import { getKeyboardKeyCodeBySystem } from '@/app/components/taskStream/utils'
import { useAgentContext } from '@/shared/hooks/agent-context'
import { ssePost } from '@/infrastructure/api/base'
import { chatFeedback, deleteAgentTurn, getChatDetail } from '@/infrastructure/api/agent'
import BytesPreview from '@/app/components/taskStream/elements/_foundation/components/form/field-item/preview/bytes-preview'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import Icon from '@/app/components/base/iconFont'
import MarkdownRenderer from '@/app/components/base/markdown-renderer'
import AnswerIcon from '@/public/logo/logo2small.png'
import RobotDefaultIcon from '@/public/logo/logo2small.png'

const AgentChatBox = ({ agentId, sidebar, draft, currentChatId, onChatIdChange }: {
  agentId?: string
  sidebar?: React.ReactElement
  draft?: boolean
  currentChatId?: string
  onChatIdChange?: (chatId: string | undefined) => void
}, ref) => {
  const selfRef = useRef<any>({ result: '', streamSegment: null })
  const { agentToken, getAgentToken, getAgentHistorys } = useAgentContext()
  const [detailData, setDetailData] = useState<any>({})
  const [chatList, setChatList] = useState<any>([])
  const [questionText, setQuestionText] = useState('')
  const [fileUrl, setFileUrl] = useState()
  const [refreshHistoryTag, setRefreshHistoryTag] = useState(new Date().getTime())
  const [showLogic, setShowLogic] = useState<boolean | undefined>()
  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingTurn, setEditingTurn] = useState<number | null>(null)
  const [editingOriginText, setEditingOriginText] = useState<string>('')
  useEffect(() => {
    // token 与 sessions 由 page.tsx 统一管理，这里不再做任何 token/历史的副作用
  }, [agentToken, agentId])

  // 不再写入 agent_token_<appId>，避免与“绑定平台账号”的策略冲突

  const _processContent = (content: string) => {
    if (!content)
      return ''
    return content.split('\\n').map((v) => {
      const markdownMatch = v.match(/!\[.*?\]\((http[^)]+)\)/)
      if (markdownMatch) {
        const url = markdownMatch[1]
        const unprocessedText = v.slice(v.indexOf(')') + 1).trim()
        return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />${unprocessedText ? `<p>${unprocessedText.replace(/\s/g, '&nbsp;')}</p>` : ''}`
      }
      if (v.trim().startsWith('![')) {
        const urlMatch = v.match(/\[(.*?)\]\((.*?)\)/)
        if (urlMatch) {
          const url = urlMatch[2]
          const unprocessedText = v.slice(v.indexOf(')') + 1).trim()
          return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />${unprocessedText ? `<p>${unprocessedText.replace(/\s/g, '&nbsp;')}</p>` : ''}`
        }
      }
      return `<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`
    }).join('')
  }

  const updateAnswer = ({ userQuestion }) => {
    selfRef.current.streamSegment = [
      { content: userQuestion },
      { content: '', __useStream: true, from_who: 'lazyllm' },
    ]
    setQuestionText('')
    setChatList(prevList => [
      ...prevList,
      ...selfRef.current.streamSegment,
    ])
    setShowLogic(true)
  }

  useEffect(() => {
    if (detailData.chatId && !detailData.isStreaming) {
      getChatDetail({ url: `conversation/${agentId}/history`, options: { params: { sessionid: detailData.chatId } } }).then((res) => {
        const resList = res?.data || []
        // 智能合并：如果服务器返回的消息数量少于当前 chatList，说明服务器还没保存完整
        // 此时保留本地 chatList，不覆盖
        setChatList(prevChatList => {
          // 如果服务器返回的消息数量少于本地，且本地有消息，说明服务器数据不完整
          if (resList.length < prevChatList.length && prevChatList.length > 0) {
            // 检查最后一条消息是否是AI消息且有内容
            const lastLocalMsg = prevChatList[prevChatList.length - 1]
            const lastServerMsg = resList[resList.length - 1]
            
            // 如果本地最后一条是AI消息且有内容，而服务器没有或内容为空，保留本地
            if (lastLocalMsg && lastLocalMsg.from_who === 'lazyllm' && lastLocalMsg.content) {
              if (!lastServerMsg || lastServerMsg.from_who !== 'lazyllm' || !lastServerMsg.content) {
                // 服务器数据不完整，保留本地状态
                return prevChatList
              }
            }
          }
          
          // 服务器数据完整，使用服务器数据
          return resList
        })
      })
    }
  }, [detailData.chatId, detailData.isStreaming, agentId, refreshHistoryTag])

  useEffect(() => {
    if (currentChatId !== detailData.chatId)
      setDetailData(prev => ({ ...prev, chatId: currentChatId }))
  }, [currentChatId])

  const currentTurnNumber = useMemo(() => {
    const conclusionAreaEle = document.getElementById('agentRecordEle')
    if (conclusionAreaEle) {
      setTimeout(() => {
        conclusionAreaEle.scrollTop = 99999999
      }, 10)
    }

    return chatList?.slice(-1)[0]?.turn_number
  }, [chatList])
  const inputChange = (e) => {
    setQuestionText(e.target.value);
    (document.getElementById('agentTextArea') as HTMLElement).scrollTop = 99999
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 按 Enter 键发送消息（不按 Shift）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!detailData.isStreaming && (questionText || fileUrl)) {
        sendQuestion()
      }
    }
    // Shift + Enter 换行（默认行为，不需要处理）
  }

  const handleErrorModalClose = () => {
    setErrorModalVisible(false)
    setErrorMessage('')
  }

  const showErrorModal = (message: string) => {
    setErrorMessage(message)
    setErrorModalVisible(true)
  }

  const sendQuestion = () => {
    const files = !fileUrl
      ? []
      : [
        {
          id: 'START_DEFAULT_FILE',
          value: fileUrl,
          type: 'file',
        },
      ]

    if (detailData.isStreaming)
      return

    if (!questionText && files.length === 0)
      return

    updateAnswer({ userQuestion: questionText })
    const { chatId, turn_number } = detailData || {}
    const reqData: any = {
      appId: agentId,
      sessionid: chatId || uuidV4(),
      inputs: [questionText],
      turn_number: turn_number ? turn_number + 1 : currentTurnNumber ? currentTurnNumber + 1 : 1,
      files,
    }

    if (draft)
      reqData.mode = 'draft'

    selfRef.current.result = ''
    // 用函数式更新避免闭包中的 detailData 把 isStreaming 状态“写回去”
    setDetailData(prev => ({ ...prev, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true }))
    ssePost(`/conversation/${agentId}/run`,
      {
        body: reqData,
      },
      {
        isAgent: true,
        onFinish: (params: any) => {
          const { data, event } = params || {}
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          // 注意：不要依赖 DOM 是否已挂载来更新结果；首个 chunk 很可能在渲染完成前到达
          // 关键：后端通常会先发 event=result（答案字符串），再发 event=finish（包含同样的 outputs）
          // 为避免重复，这里仅在“流中完全没收到内容”时，才用 finish.outputs 兜底填充结果。
          if (event === 'finish' && data && data.status === 'succeeded') {
            const outputs = data.outputs
            const hasStreamContent = typeof selfRef.current.result === 'string' && selfRef.current.result.trim().length > 0
            if (!hasStreamContent && outputs) {
              selfRef.current.result = String(outputs)
              setDetailData(prev => ({ ...prev, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true }))
            }
          }
          else if (data && data.error) {
            const errorMsg = data.error || '请求处理失败'
            showErrorModal(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
            setDetailData(prev => ({ ...prev, chatId: reqData.sessionid, isStreaming: false }))
          }
          if (conclusionAreaEle)
            conclusionAreaEle.scrollTop = 99999999

          // 处理流式对话结束
          if (selfRef.current.streamSegment) {
            const [_userQuestionData, answerData] = selfRef.current.streamSegment
            const processContent = (content) => {
              if (!content)
                return ''
              const lines = content.split('\\n')
              return lines.map((line) => {
                const markdownMatch = line.match(/!\[.*?\]\((http[^)]+)\)/)
                if (markdownMatch)
                  return `<img src="${markdownMatch[1]}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`

                if (line.trim().startsWith('http')) {
                  const url = line.trim().split(' ')[0]
                  return `<img src="${url}" alt="Chat content" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`
                }
                return line
              }).join('\\n')
            }

            // 关键：updateAnswer 已经插入了「用户问题 + AI占位(__useStream=true)」
            // onFinish 这里不应再次 append 同一轮问答，否则会出现“一问一答”重复两次
            // 改为：更新占位的那条 AI 消息内容，并把 __useStream 置为 false
            setChatList((prevChatList) => {
              const next = prevChatList.map(item => ({
                ...item,
                content: item.content ? processContent(item.content) : item.content,
              }))

              for (let i = next.length - 1; i >= 0; i--) {
                const item = next[i]
                if (item?.__useStream) {
                  next[i] = { ...answerData, ...item, content: processContent(selfRef.current.result), __useStream: false }
                  break
                }
              }

              return next
            })
            selfRef.current.streamSegment = null
            setDetailData(prev => ({
              ...prev,
              result: selfRef.current.result,
              chatId: reqData.sessionid,
              isStreaming: false,
            }))
            getAgentHistorys({ appId: agentId })
          }
          else {
            // 兜底：即使没有 streamSegment（异常/中断），也必须结束“正在回答”，否则无法发送下一条
            setDetailData(prev => ({ ...prev, chatId: reqData.sessionid, isStreaming: false }))
          }
        },
        onData: (message: string, _isFirstMessage: boolean, _moreInfo: any) => {
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          selfRef.current.result = selfRef.current.result + message
          setDetailData(prev => ({ ...prev, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true }))
          if (conclusionAreaEle)
            conclusionAreaEle.scrollTop = 99999999
        },
        onChunk: (params) => {
          const conclusionAreaEle = document.getElementById('agentRecordEle')
          selfRef.current.result = selfRef.current.result + params.data
          setDetailData(prev => ({ ...prev, result: selfRef.current.result, chatId: reqData.sessionid, isStreaming: true }))
          if (conclusionAreaEle)
            conclusionAreaEle.scrollTop = 99999999
        },

        onError: (msg: string, _code?: string) => {
          showErrorModal(msg || '网络请求失败，请稍后重试')
          setDetailData(prev => ({ ...prev, chatId: reqData.sessionid, isStreaming: false }))
        },
      })
  }

  const refreshCurrentSession = () => {
    if (!detailData.chatId)
      return
    setRefreshHistoryTag(new Date().getTime())
  }

  const canOperateUserTurn = (turnNumber?: number) => {
    if (!detailData.chatId || detailData.isStreaming)
      return false
    // 允许编辑/删除任意一轮（更符合你说的“单条会话可编辑/删除”）
    return !!turnNumber
  }

  const handleEditUserTurn = (item: any) => {
    if (!canOperateUserTurn(item?.turn_number))
      return
    setEditingTurn(item.turn_number)
    setEditingOriginText(item.content || '')
    setQuestionText(item.content || '')
  }

  const handleCancelEdit = () => {
    setEditingTurn(null)
    setEditingOriginText('')
  }

  const handleDeleteTurn = async (turnNumber: number) => {
    if (!detailData.chatId)
      return
    await deleteAgentTurn({ appId: agentId, sessionid: detailData.chatId, turn_number: turnNumber })
    refreshCurrentSession()
  }

  const handleResendEdited = async () => {
    if (!detailData.chatId || editingTurn == null)
      return
    await handleDeleteTurn(editingTurn)
    handleCancelEdit()
    sendQuestion()
  }

  const clearChat = () => {
    selfRef.current.streamSegment = null
    selfRef.current.result = ''
    setDetailData({})
    setChatList([])
    setQuestionText('')
    setFileUrl(undefined)
    handleCancelEdit()
    onChatIdChange?.(undefined)
  }
  const setChatId = (chatId: string) => {
    if (detailData.isStreaming || !chatId)
      return

    setDetailData(prev => ({ ...prev, chatId }))
    setShowLogic(false)
    onChatIdChange?.(chatId)
  }

  const handleCopy = (content: string) => {
    if (!content)
      return
    const textToCopy = content.replace(/\\n/g, '\n')
    copy(textToCopy)
    message.success('复制成功')
  }

  const fileChange = (res) => {
    if (res?.file?.status === 'removed')
      setFileUrl(undefined)
    else
      setFileUrl(res?.file?.response?.file_path)
  }

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.enter`, () => {
    sendQuestion()
  }, { exactMatch: true, useCapture: true })

  const evaluateEvent = ({ chatItem, targetValue }) => {
    const { chatId } = detailData || {}
    const { is_satisfied, id } = chatItem || {}
    if ((targetValue && is_satisfied) || (!targetValue && is_satisfied === false))
      return
    chatFeedback({
      appId: agentId,
      sessionid: chatId,
      speak_id: id,
      is_satisfied: targetValue,
      user_feedback: '',
    }).then((_res) => {
      setRefreshHistoryTag(new Date().getTime())
      message.success('评价成功')
    })
  }

  useImperativeHandle(ref, () => {
    return {
      clearChat,
      setShowLogic,
      setChatId,
    }
  })

  return (
    <div className={styles.agentPage}>
      <div className={styles.agentApp}>
        {sidebar}
        <div className={styles.agentChatbox}>
          <div className={styles.agentView}>
            <div className={styles.agentArea}>
              {
                !detailData.chatId
                  ? <div className={styles.agentDefault}>
                    <div>
                      <div className={styles.defaultIcon}>
                        <Image src={RobotDefaultIcon} alt="" />
                      </div>
                      <div className={styles.defaultText}>
                        您好，我是您的专属客服，很高兴为您服务！
                      </div>
                    </div>
                  </div>
                  : <div className={styles.agentRecord} id='agentRecordEle'>
                    {
                      chatList?.map((item, index) => {
                        const isAnswer = item.from_who === 'lazyllm'
                        const isLazyllm = item.from_who === 'lazyllm'
                        const canOperate = !isLazyllm && canOperateUserTurn(item.turn_number)
                        return <div key={index} className={`${styles.chatRow} ${isAnswer ? styles.chatAnswer : styles.chatQuestion}`}>
                          <div>
                            {isAnswer
                              ? <div className={styles.answerIcon}>
                                <Image src={AnswerIcon} alt="" />
                              </div>
                              : <div className={styles.questionIcon}>
                                <UserOutlined style={{ fontSize: '20px', color: 'rgb(14, 93, 216)' }} />
                              </div>}
                          </div>
                          <div className={styles.chatContent}>
                            <div className={styles.chatRoleRow}>
                              <div className={styles.chatRole}>{isLazyllm ? 'LCAgent' : 'You'}</div>
                              {!isLazyllm && (
                                <div className={styles.userActions}>
                                  <HoverGuide popupContent={canOperate ? '编辑此条' : '回答生成中，暂不可编辑/删除'}>
                                    <Button
                                      size="small"
                                      type="text"
                                      disabled={!canOperate}
                                      icon={<EditOutlined />}
                                      onClick={() => handleEditUserTurn(item)}
                                    />
                                  </HoverGuide>
                                  <Popconfirm
                                    title="删除这一轮对话？"
                                    description="将删除本轮的提问与回答"
                                    okText="删除"
                                    cancelText="取消"
                                    onConfirm={() => handleDeleteTurn(item.turn_number)}
                                  >
                                    <Button
                                      size="small"
                                      type="text"
                                      disabled={!canOperate}
                                      icon={<DeleteOutlined />}
                                    />
                                  </Popconfirm>
                                </div>
                              )}
                            </div>

                            <div className={styles.chatWord}>
                              {((showLogic && isLazyllm && index === chatList.length - 1) || item.__useStream)
                                ? (detailData?.result
                                  ? <MarkdownRenderer content={detailData.result} />
                                  // ? <div dangerouslySetInnerHTML={{ __html: processContent(detailData.result) }} />
                                  : <div className={styles.dots}>
                                    正在回答
                                    <span>.</span>
                                    <span>.</span>
                                    <span>.</span>
                                  </div>)
                              //  : <div dangerouslySetInnerHTML={{ __html: processContent(item.content) }} />}
                                : <MarkdownRenderer content={item.content || ''} />}
                              {
                                item?.files?.length > 0 && <div className={styles.chatBytes}>
                                  <BytesPreview value={item.files} />
                                </div>
                              }
                            </div>

                            {isLazyllm && !detailData.isStreaming && <div className={styles.evaluate}>
                              <div className={styles.options}>
                                <HoverGuide popupContent="复制内容">
                                  <Icon
                                    type="icon-fuzhi"
                                    style={{ fontSize: '20px', color: '#999', marginRight: '15px', cursor: 'pointer' }}
                                    onClick={() => handleCopy(item.content || detailData.result)}
                                  />
                                </HoverGuide>
                                <Icon
                                  type={item.is_satisfied ? 'icon-dianzan-click' : 'icon-dianzan'}
                                  style={{ fontSize: '20px', color: item.is_satisfied ? 'rgb(14,93,216)' : '#999', marginRight: '15px', cursor: 'pointer' }}
                                  onClick={() => evaluateEvent({ chatItem: item, targetValue: true })}
                                />
                                <Icon
                                  type={item.is_satisfied === false ? 'icon-budianzan-click' : 'icon-budianzan'}
                                  style={{ fontSize: '20px', color: item.is_satisfied === false ? 'rgb(14,93,216)' : '#999', cursor: 'pointer' }}
                                  onClick={() => evaluateEvent({ chatItem: item, targetValue: false })}
                                />
                              </div>
                            </div>}
                          </div>
                        </div>
                      })
                    }
                  </div>
              }
            </div>
          </div>
          <div className={styles.agentInput}>
            <div className={styles.inputCell}>
              <Input.TextArea
                style={{
                  height: '100%',
                  paddingBottom: '56px',
                  fontSize: '18px',
                  color: '#262626',
                  border: '1px solid #d3d7dd',
                  borderRadius: '12px',
                }}
                placeholder='请输入您的问题'
                value={questionText}
                onChange={inputChange}
                onKeyDown={handleKeyDown}
                id='agentTextArea'
              />
              {editingTurn != null && (
                <div className={styles.editingBar}>
                  <div className={styles.editingTip}>正在编辑上一条消息</div>
                  <div className={styles.editingActions}>
                    <Button
                      size="small"
                      onClick={() => {
                        setQuestionText(editingOriginText)
                        handleCancelEdit()
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<RedoOutlined />}
                      onClick={handleResendEdited}
                      disabled={detailData.isStreaming}
                    >
                      保存并重发
                    </Button>
                  </div>
                </div>
              )}
              <div className={styles.agentOperate}>
                <div className={styles.operateBtn}>
                  {/* <Icon type="icon-wenjianshangchuan" style={{ fontSize: '22px', color: '#F00' }} /> */}
                  <Upload
                    maxCount={1}
                    name='file'
                    action={`${API_PREFIX}/files/upload`}
                    onChange={fileChange}
                    className='agent-app-upload'
                    disabled={detailData.isStreaming}
                    multiple={true}
                  >
                    {/* <Button icon={<Icon type="icon-wenjianshangchuan" style={{ fontSize: '22px', color: '#F00' }} />}>上传</Button> */}
                    <Icon type="icon-wenjianshangchuan" style={{ fontSize: '26px', color: '#262626' }} />
                  </Upload>
                </div>
                <div onClick={sendQuestion} className={`${styles.operateBtn} ${detailData.isStreaming ? styles.operateDisabled : ''}`} id="sendBtnEle">
                  <HoverGuide
                    popupContent={'按 Enter 发送，Shift + Enter 换行'}
                  >
                    <Icon type="icon-fasong" style={{ fontSize: '22px', color: '#262626' }} />
                  </HoverGuide>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误弹窗 */}
      <Modal
        title="错误提示"
        open={errorModalVisible}
        onOk={handleErrorModalClose}
        onCancel={handleErrorModalClose}
        okText="确定"
        cancelButtonProps={{ style: { display: 'none' } }}
        centered
        width={480}
      >
        <div style={{ padding: '20px 0', fontSize: '16px', lineHeight: '1.6' }}>
          {errorMessage}
        </div>
      </Modal>

      {/* <PermitCheck value='AUTH_0002'>
            <div>
              <Button type='primary' onClick={handleCreate}>创建文档</Button>
            </div>
          </PermitCheck> */}
    </div>
  )
}

export default forwardRef(AgentChatBox)
