'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { useTasks } from '@/hooks/useTasks'
import { useNotifications } from '@/hooks/useNotifications'
import { STATUSES } from '@/types'
import { getInitials } from '@/types'
import { Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { IconTooltip } from '@/components/ui/tooltip'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const SIDEBAR_WIDTH = 220

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { tasks } = useTasks()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Atalhos globais (G D → Dashboard, G L → Lista, etc)
  useKeyboardShortcuts()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    if (!userOpen) return
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userOpen])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-[#71717A] text-sm">Carregando...</p>
      </div>
    )
  }

  const delayedCount = tasks.filter(t => t.status === STATUSES.DELAYED).length

  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <Sidebar
        delayedCount={delayedCount}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Header — hamburger em mobile + notificações + bloco de usuário */}
      <header
        className="fixed top-0 right-0 left-0 md:left-[220px] h-14 z-40 flex items-center justify-between gap-1 px-4 sm:px-5 bg-background/95 backdrop-blur-sm border-b border-border"
      >
        {/* Hamburger — só em mobile (md:hidden) */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-[#3F3F46] hover:bg-[#F4F4F5] transition-colors cursor-pointer border-0 bg-transparent"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
        {/* Spacer pra empurrar bloco direito em telas md+ */}
        <div className="hidden md:block" />

        {/* Bloco direito: notificações + usuário */}
        <div className="flex items-center gap-1">
        {/* Notificações — agora ao lado do bloco do usuário */}
        <div ref={notifRef} className="relative">
          <IconTooltip label={unreadCount > 0 ? `${unreadCount} notificações` : 'Notificações'} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-[#71717A] hover:text-[#111111]"
              onClick={() => setNotifOpen(o => !o)}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </IconTooltip>

          {/* Dropdown notificações */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 w-80 rounded-[var(--radius)] border border-border bg-card z-50 overflow-hidden"
                style={{ boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-sm">Notificações</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-[0.72rem] text-primary font-medium bg-transparent border-none cursor-pointer hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                <div className="max-h-[340px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#A1A1AA] text-sm">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`px-4 py-3 border-b border-border cursor-pointer flex gap-2.5 items-start transition-colors hover:bg-muted ${
                          n.lida ? 'bg-transparent' : 'bg-primary/[0.03]'
                        }`}
                      >
                        <div className="pt-1.5 flex-shrink-0 w-2">
                          {!n.lida && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[0.82rem] mb-0.5 truncate ${n.lida ? 'font-normal' : 'font-medium'}`}>
                            {n.titulo}
                          </div>
                          <div className="text-[0.75rem] text-[#71717A] mb-1 line-clamp-2">
                            {n.mensagem}
                          </div>
                          <div className="text-[0.68rem] text-[#A1A1AA]">
                            {new Date(n.criado_em).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bloco de usuário */}
        {user && (
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen(o => !o)}
              className="flex items-center gap-2 h-8 px-2 rounded-lg border-0 bg-transparent cursor-pointer hover:bg-[#F7F8FA] transition-colors"
            >
              {/* Avatar */}
              <UserAvatar user={user} size={28} />

              {/* Nome + Perfil */}
              <div className="text-left hidden sm:block">
                <div className="text-[0.8rem] font-semibold text-[#111111] leading-none">{firstName}</div>
                <div className="text-[0.68rem] text-[#71717A] leading-none mt-0.5">{user.perfil}</div>
              </div>
              <ChevronDown size={13} className={`text-[#A1A1AA] transition-transform ${userOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown usuário */}
            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-[#E4E4E7] bg-white z-50 overflow-hidden"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                >
                  {/* Info do usuário */}
                  <div className="px-4 py-3 border-b border-[#E4E4E7]">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={user} size={32} />
                      <div className="min-w-0">
                        <div className="text-[0.82rem] font-semibold text-[#111111] truncate">{user.name}</div>
                        <div className="text-[0.72rem] text-[#71717A] truncate">{user.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* Perfil */}
                  <div className="p-1">
                    <button
                      onClick={() => { setUserOpen(false); router.push('/perfil') }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#3F3F46] hover:bg-[#F7F8FA] transition-colors cursor-pointer border-0 bg-transparent text-left"
                    >
                      <User size={14} className="text-[#A1A1AA]" />
                      Meu Perfil
                    </button>
                  </div>

                  <div className="h-px bg-[#E4E4E7] mx-2" />

                  {/* Sair */}
                  <div className="p-1">
                    <button
                      onClick={async () => { await signOut(); router.replace('/login') }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer border-0 bg-transparent text-left"
                    >
                      <LogOut size={14} />
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      </header>

      {/* Conteúdo principal — ml-0 em mobile, 220px em md+ */}
      <main
        className="min-h-screen transition-all pt-14 flex-1 flex flex-col min-w-0 ml-0 md:ml-[220px]"
      >
        <div className="p-6 flex-1 max-w-[1600px] mx-auto w-full">
          {/*
            Page transition apenas em opacidade — translate/filter criam
            containing block (transform/filter) que QUEBRA o drag-and-drop
            do Kanban (clones com position:fixed acompanham o ancestor com
            transform em vez do viewport). Fade puro é seguro.

            Em /kanban a transição é desligada por completo para evitar
            qualquer overhead durante drag.
          */}
          {pathname === '/kanban' ? (
            children
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  )
}
