'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
      <p className="text-[#71717A] text-sm">Carregando...</p>
    </div>
  )
}
