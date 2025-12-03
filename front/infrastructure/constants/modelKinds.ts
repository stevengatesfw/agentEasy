// 与后端完全一致的模型类别定义
// 参考：agentEasy/back/src/parts/models_hub/model_list.py 中的 model_kinds
export const MODEL_KINDS = {
  localLLM: { value: 'localLLM', label: '大模型' },
  OnlineLLM: { value: 'OnlineLLM', label: '大模型' },
  Embedding: { value: 'Embedding', label: '向量模型' },
  reranker: { value: 'reranker', label: '重排序' },
  VQA: { value: 'VQA', label: '视觉问答' },
  SD: { value: 'SD', label: '文生图' },
  TTS: { value: 'TTS', label: '文字转语音' },
  STT: { value: 'STT', label: '语音转文字' },
  OCR: { value: 'OCR', label: '文字识别' },
} as const

// 本地模型类别列表（用于新建本地模型）
export const LOCAL_MODEL_KINDS = [
  MODEL_KINDS.VQA,
  MODEL_KINDS.SD,
  MODEL_KINDS.TTS,
  MODEL_KINDS.STT,
  MODEL_KINDS.Embedding,
  MODEL_KINDS.localLLM,
  MODEL_KINDS.reranker,
  MODEL_KINDS.OCR,
]

// 在线模型类别列表（用于新建在线模型）
export const ONLINE_MODEL_KINDS = [
  MODEL_KINDS.OnlineLLM,
  MODEL_KINDS.Embedding,
  MODEL_KINDS.reranker,
]

// 推理服务模型类别列表（用于新建推理任务）
export const INFERENCE_MODEL_KINDS = [
  MODEL_KINDS.localLLM,
  MODEL_KINDS.Embedding,
  MODEL_KINDS.TTS,
  MODEL_KINDS.STT,
  MODEL_KINDS.reranker,
  MODEL_KINDS.VQA,
  MODEL_KINDS.SD,
  MODEL_KINDS.OCR,
]

// 模型库筛选类别列表（用于列表筛选）
export const FILTER_MODEL_KINDS = [
  MODEL_KINDS.VQA,
  MODEL_KINDS.SD,
  MODEL_KINDS.TTS,
  MODEL_KINDS.STT,
  MODEL_KINDS.Embedding,
  MODEL_KINDS.localLLM,
  MODEL_KINDS.reranker,
  MODEL_KINDS.OCR,
]

