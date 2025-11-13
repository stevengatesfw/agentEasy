import React from 'react'
import type { ReactNode } from 'react'
import { EntryCheckContextProvider } from '@/shared/hooks/permit-context'

const SignInLayout = ({ children }: { children: ReactNode }) => {
  return (
    <EntryCheckContextProvider>
      {children}
    </EntryCheckContextProvider>
  )
}

export const metadata = {
  title: 'LCAgent',
}

export default SignInLayout
