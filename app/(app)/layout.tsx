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
import { Sun, Moon, Bell, ChevronDown, LogOut, User, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { IconTooltip } from '@/components/ui/tooltip'

const SIDEBAR_WIDTH = 220

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { tasks } = useTasks()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

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

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <Sidebar delayedCount={delayedCount} />

      {/* Header */}
      <header
        className="fixed top-0 right-0 h-14 z-40 flex items-center justify-between gap-2 px-5 bg-background/95 backdrop-blur-sm border-b border-border transition-all"
        style={{ left: SIDEBAR_WIDTH }}
      >
        {/* Lado esquerdo: busca + notificações + tema */}
        <div className="flex items-center gap-1">
          {/* Botão Buscar (⌘K) */}
          <button
            onClick={() => {
              const isMac = navigator.platform.toUpperCase().includes('MAC')
              const ev = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: isMac,
                ctrlKey: !isMac,
                bubbles: true,
              })
              document.dispatchEvent(ev)
            }}
            className="hidden md:inline-flex items-center gap-2 h-8 px-2.5 mr-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] transition-colors cursor-pointer text-[0.78rem] text-[#71717A]"
            aria-label="Buscar (⌘K)"
          >
            <Search size={13} className="text-[#A1A1AA]" />
            <span>Buscar...</span>
            <kbd className="font-mono text-[0.62rem] bg-white border border-[#E4E4E7] px-1 py-[1px] rounded text-[#71717A] ml-1">
              ⌘K
            </kbd>
          </button>

          {/* Notificações */}
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
                  className="absolute left-0 top-full mt-1.5 w-76 rounded-[var(--radius)] border border-border bg-card z-50 overflow-hidden"
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

          {/* Tema */}
          <IconTooltip label={theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'} side="bottom">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#71717A] hover:text-[#111111]"
            onClick={toggleTheme}
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.span
                  key="moon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Moon size={15} />
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Sun size={15} />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          </IconTooltip>
        </div>

        {/* Lado direito: bloco de usuário */}
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
      </header>

      {/* Conteúdo principal */}
      <main
        className="min-h-screen transition-all pt-14 flex-1 flex flex-col min-w-0"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        <div className="p-6 flex-1 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 22,
                mass: 0.6,
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
