'use client'
import React, { useRef, useState } from 'react'
import { Input, Modal, Upload } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useKeyPress } from 'ahooks'
import Image from 'next/image'
import styles from './chat.module.scss'
import { API_PREFIX } from '@/app-specs'
import { getKeyboardKeyCodeBySystem } from '@/app/components/taskStream/utils'
import { ssePost } from '@/infrastructure/api/base'
import BytesPreview from '@/app/components/taskStream/elements/_foundation/components/form/field-item/preview/bytes-preview'
import HoverGuide from '@/app/components/base/hover-tip-pro'
import Icon from '@/app/components/base/iconFont'
import AnswerIcon from '@/public/logo/logo2small.png'
import RobotDefaultIcon from '@/public/logo/logo2small.png'

const ChatModal = (props: any) => {
  const { visible, onOk, onCancel, agentId = '1', modelName } = props
  const selfRef = useRef<any>({ result: '', streamSegment: null })
  const [detailData, setDetailData] = useState<any>({})
  const [chatList, setChatList] = useState<any[]>([])
  const [questionText, setQuestionText] = useState('')
  const [fileUrl, setFileUrl] = useState()
  const [fileList, setFileList] = useState<any[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | undefined>()
  const [showLogic, setShowLogic] = useState<boolean | undefined>()
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

  const updateAnswer = ({ userQuestion, files }) => {
    selfRef.current.streamSegment = [
      { content: userQuestion, from_who: 'user', files: files || [] },
      { content: '', __useStream: true, from_who: 'lazyllm' },
    ]
    setQuestionText('')
    setChatList(prev => [
      ...(prev || []),
      ...selfRef.current.streamSegment,
    ])
    setShowLogic(true)
  }
  const sendQuestion = () => {
    const isUploading = (fileList || []).some((f: any) => f?.status === 'uploading')
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

    // 上传未完成时禁止发送，否则后端会收到空 files -> inputs required
    if (isUploading)
      return

    if (!questionText && files.length === 0)
      return

    // 会话里附件展示：优先用本地 blob 预览（避免用容器内路径导致图片显示不全/不显示）
    const uiFiles: any[] = []
    try {
      const f0: any = (fileList || [])[0]
      if (f0?.originFileObj) {
        const blobUrl = URL.createObjectURL(f0.originFileObj)
        uiFiles.push(blobUrl)
      }
    }
    catch {
      // ignore
    }
    updateAnswer({ userQuestion: questionText, files: uiFiles.length ? uiFiles : files })
    const reqData: any = {
      inputs: [questionText],
      files,
    }
    // 发送后立即清空输入/附件，避免“附件一直残留在聊天窗”
    setQuestionText('')
    setFileUrl(undefined)
    setFileList([])
    selfRef.current.result = ''
    setDetailData({ ...detailData, result: selfRef.current.result, chatId: agentId, isStreaming: true })
    ssePost(`/infer-service/test/${agentId}/run`, {
      body: reqData,
    },
    {
      isAgent: true,
      onData: (message: string, isFirstMessage: boolean, moreInfo) => {
        const conclusionAreaEle = document.getElementById('agentRecordEle')
        if (conclusionAreaEle) {
          selfRef.current.result = selfRef.current.result + message
          setDetailData({ ...detailData, result: selfRef.current.result, chatId: agentId, isStreaming: true })
          conclusionAreaEle.scrollTop = 99999999
        }
      },
      onChunk: (chunk: any) => {
        if (selfRef.current.streamSegment) {
          selfRef.current.result = (selfRef.current.result || '') + chunk.data
          const [userQuestionData, answerData] = selfRef.current.streamSegment || []
          setChatList([
            ...(chatList || []),
            userQuestionData,
            { ...answerData, content: selfRef.current.result, __useStream: true, from_who: 'lazyllm' },
          ])
          setDetailData(prev => ({ ...prev, result: selfRef.current.result }))
        }
      },
      onFinish: (finish: any) => {
        if (selfRef.current.streamSegment) {
          const [userQuestionData, answerData] = selfRef.current.streamSegment || []
          // 兼容后端多种返回结构：
          // - event=result: data 可能直接是字符串
          // - event=finish: data 可能是 {status, outputs} 或 {status, error}
          // - event=stop: 可能只有停止信号
          const raw = finish?.data
          // failed 时只展示 simple_error，别把整段 traceback 代码刷出来
          const failedMsg = raw?.status === 'failed'
            ? (raw?.error?.simple_error || raw?.error?.message || '执行失败')
            : undefined
          const finalContent
            = failedMsg
              ?? raw?.outputs
              ?? raw?.raw
              ?? raw?.query
              ?? raw?.answer
              ?? (typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : '')
          setChatList([
            ...(chatList || []),
            userQuestionData,
            { ...answerData, content: finalContent, __useStream: false, from_who: 'lazyllm' },
          ])
          selfRef.current.streamSegment = null
          selfRef.current.result = ''
          setDetailData({ ...detailData, result: finalContent, chatId: agentId, isStreaming: false })
        }
      },
      onError: (msg: string, code?: string) => {
        setDetailData({ ...detailData, result: msg || '网络错误，请稍后再试', chatId: agentId, isStreaming: false })
      },
    })
  }

  const fileChange = (res) => {
    if (res?.file?.status === 'removed')
      setFileUrl(undefined)
    else
      setFileUrl(res?.file?.response?.file_path)
    setFileList(res?.fileList || [])
  }

  const handlePreview = async (file: any) => {
    try {
      // 优先本地预览（originFileObj），无需依赖后端静态文件服务
      if (file?.originFileObj) {
        const url = URL.createObjectURL(file.originFileObj)
        setPreviewSrc(url)
        setPreviewOpen(true)
        return
      }
      // 兜底：如果存在可用 url，则直接打开
      const url = file?.url || file?.thumbUrl
      if (url) {
        setPreviewSrc(url)
        setPreviewOpen(true)
      }
    }
    catch {
      // ignore
    }
  }

  useKeyPress(`${getKeyboardKeyCodeBySystem('ctrl')}.enter`, () => {
    sendQuestion()
  }, { exactMatch: true, useCapture: true })

  const handleOk = () => {
    setDetailData({})
    setChatList([])
    onOk()
  }
  const closeModal = () => {
    setDetailData({})
    setChatList([])
    onCancel()
  }
  return (
    <Modal okText='关闭' width={1022} title={`模型测试: ${modelName}`} open={visible} onOk={handleOk} onCancel={closeModal}>
      <div className={styles.agentTestPage}>
        <div className={styles.agentApp}>
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
                          if (!item)
                            return null
                          const isAnswer = (item.from_who || 'user') === 'lazyllm'
                          const isLazyllm = (item.from_who || 'user') === 'lazyllm'
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
                              <div className={styles.chatRole}>{isLazyllm ? 'LCAgent' : '您'}</div>
                              <div className={styles.chatWord}>
                                {((showLogic && isLazyllm && index === chatList.length - 1) || item.__useStream)
                                  ? (detailData?.result
                                    ? <div
                                      dangerouslySetInnerHTML={{ __html: detailData.result?.split('\\n').map(v => (`<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`)).join('') || '' }}
                                    />
                                    : <div className={styles.dots}>
                                      正在回答
                                      <span>.</span>
                                      <span>.</span>
                                      <span>.</span>
                                    </div>)
                                  : <div
                                    dangerouslySetInnerHTML={{ __html: item.content?.split('\\n').map(v => (`<p>${v?.replace('\r', '').replace(/\s/g, '&nbsp;') || ''}</p>`)).join('') || '' }}
                                  />}
                                {
                                  item?.files?.length > 0 && <div className={styles.chatBytes}>
                                    <BytesPreview
                                      value={(item.files || [])
                                        .map((f: any) => (typeof f === 'string' ? f : (f?.value || '')))
                                        .filter((v: string) => !!v)}
                                    />
                                  </div>
                                }
                              </div>
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
                <div className={styles.agentOperate}>
                  <div className={styles.operateBtn}>
                    <Upload
                      maxCount={1}
                      name='file'
                      action={`${API_PREFIX}/files/upload`}
                      onChange={fileChange}
                      onPreview={handlePreview}
                      fileList={fileList}
                      showUploadList={{ showRemoveIcon: true, showPreviewIcon: true }}
                      className='agent-app-upload'
                      disabled={detailData.isStreaming}
                      multiple={false}
                    >
                      <Icon type="icon-wenjianshangchuan" style={{ fontSize: '26px', color: '#262626' }} />
                    </Upload>
                  </div>
                  <div onClick={sendQuestion} className={`${styles.operateBtn} ${detailData.isStreaming ? styles.operateDisabled : ''}`} id="sendBtnEle">
                    <HoverGuide
                      popupContent={'按 Enter 或 Ctrl + Enter 快捷发送，Shift + Enter 换行'}
                    >
                      <Icon type="icon-fasong" style={{ fontSize: '22px', color: '#262626' }} />
                    </HoverGuide>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        open={previewOpen}
        footer={null}
        title="附件预览"
        onCancel={() => {
          setPreviewOpen(false)
          // 释放 blob url
          if (previewSrc?.startsWith('blob:'))
            URL.revokeObjectURL(previewSrc)
          setPreviewSrc(undefined)
        }}
      >
        {previewSrc
          ? <img src={previewSrc} style={{ width: '100%' }} alt="preview" />
          : null}
      </Modal>
    </Modal>
  )
}

export default ChatModal
