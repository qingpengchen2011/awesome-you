'use client'
import React from 'react'

import { SessionProvider } from 'next-auth/react'
interface Props {
  children: React.ReactNode
}

export function SessionWrapper({ children }: Props) {
  return <SessionProvider >{children}</SessionProvider>
}