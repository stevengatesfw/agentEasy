'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ModelAdjustPage = () => {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/modelAdjust/finetuneManager')
  }, [router])
  
  return null
}

export default ModelAdjustPage

