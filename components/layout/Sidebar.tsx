'use client'
import { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ClipboardList, LayoutGrid,
  GanttChart, FileBarChart2, Settings,
  Users, Tag, X, FolderKanban, Sun, Moon,
} from 'lucide-react'
import Image from 'next/image'

const BASE_NAV = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',        href: '/dashboard' },
  { id: 'lista',      icon: ClipboardList,   label: 'Lista de Tarefas', href: '/lista' },
  { id: 'kanban',     icon: LayoutGrid,      label: 'Kanban',           href: '/kanban' },
  { id: 'gantt',      icon: GanttChart,      label: 'Gantt',            href: '/gantt' },
  { id: 'relatorios', icon: FileBarChart2,   label: 'Relatórios',       href: '/relatorios' },
]

const ADMIN_SUB_NAV = [
  { id: 'admin-usuarios',   icon: Users,        label: 'Usuários',   href: '/admin/usuarios' },
  { id: 'admin-projetos',   icon: FolderKanban, label: 'Projetos',   href: '/admin/projetos' },
  { id: 'admin-categorias', icon: Tag,          label: 'Categorias', href: '/admin/categorias' },
]

export const SIDEBAR_WIDTH = 220

interface SidebarProps {
  delayedCount: number
  /** Em mobile, controla o drawer (em md+ a sidebar é sempre visível) */
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ delayedCount, open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const navItems = useMemo(() =>
    BASE_NAV.map(n =>
      n.id === 'lista' ? { ...n, badge: delayedCount > 0 ? delayedCount : null } : { ...n, badge: null }
    ),
    [delayedCount]
  )

  const isAdmin = user?.perfil === 'Administrador'

  // Fecha drawer ao navegar (mobile UX)
  useEffect(() => {
    if (open) onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Trava scroll do body quando drawer aberto em mobile
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <>
      {/* Backdrop — só aparece em mobile quando drawer está aberto */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed h-screen z-50 flex flex-col bg-white border-r border-[#E4E4E7] overflow-hidden',
          'w-[220px] transition-transform duration-200 ease-out',
          // Mobile: drawer fechado por padrão; abre via prop `open`
          // md+: sempre visível
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
      >
      {/* Botão fechar — só em mobile */}
      <button
        type="button"
        onClick={onClose}
        className="md:hidden absolute top-3 right-3 h-8 w-8 inline-flex items-center justify-center rounded-md text-[#71717A] hover:text-[#0F172A] hover:bg-[#F4F4F5] transition-colors cursor-pointer border-0 bg-transparent z-10"
        aria-label="Fechar menu"
      >
        <X size={16} />
      </button>

      {/* Logo (clicável → Dashboard) */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="flex flex-col items-start px-5 py-4 flex-shrink-0 border-b border-[#E4E4E7] gap-1.5 cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 text-left hover:bg-[#FAFAFA] transition-colors"
        aria-label="Ir para Dashboard"
      >
        <Image
          src="/logo-iab-blue.svg"
          alt="Instituto Alfa e Beto"
          width={136}
          height={40}
          loading="eager"
          className="object-contain object-left block"
        />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#71717A]">
          Controle de Atividades
        </span>
      </button>

      {/* Nav */}
      <nav aria-label="Navegação principal" className="flex-1 py-3 px-2.5 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md border-0',
                'relative cursor-pointer text-left',
                'transition-colors duration-100',
                isActive
                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                  : 'bg-transparent text-[#71717A] hover:bg-[#F7F8FA] hover:text-[#111111]'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute left-0 top-[18%] bottom-[18%] w-[2.5px] bg-[#2563EB] rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <div className="relative flex-shrink-0">
                <Icon size={17} strokeWidth={isActive ? 2 : 1.75} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[0.55rem] w-4 h-4 rounded-full font-bold flex items-center justify-center leading-none">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[0.8125rem] font-medium truncate">{item.label}</span>
            </button>
          )
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="h-px bg-[#E4E4E7] mx-1 my-2" />
            <div className="flex items-center gap-1.5 px-3 py-1 mb-0.5">
              <Settings size={10} className="text-[#A1A1AA] flex-shrink-0" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#71717A] whitespace-nowrap">
                Admin
              </span>
            </div>

            {ADMIN_SUB_NAV.map(sub => {
              const SubIcon = sub.icon
              const isSubActive = pathname === sub.href
              return (
                <button
                  key={sub.id}
                  onClick={() => router.push(sub.href)}
                  title={sub.label}
                  aria-current={isSubActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md border-0',
                    'relative cursor-pointer text-left',
                    'transition-colors duration-100',
                    isSubActive
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'bg-transparent text-[#71717A] hover:bg-[#F7F8FA] hover:text-[#111111]'
                  )}
                >
                  {isSubActive && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute left-0 top-[18%] bottom-[18%] w-[2.5px] bg-[#2563EB] rounded-r-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <SubIcon size={17} strokeWidth={isSubActive ? 2 : 1.75} className="flex-shrink-0" />
                  <span className="text-[0.8125rem] font-medium truncate">{sub.label}</span>
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* Toggle de tema (claro/escuro) */}
      <div className="border-t border-[#E4E4E7] p-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md border-0 cursor-pointer text-left transition-colors duration-100 bg-transparent text-[#71717A] hover:bg-[#F7F8FA] hover:text-[#111111]"
        >
          {theme === 'dark' ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
          <span className="text-[0.8125rem] font-medium">
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </span>
        </button>
      </div>
    </aside>
    </>
  )
}
