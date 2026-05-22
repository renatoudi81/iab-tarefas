'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ClipboardList, LayoutGrid,
  GanttChart, FileBarChart2, Settings, AlertCircle,
  Users, Tag,
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
  { id: 'admin-usuarios',   icon: Users, label: 'Usuários',   href: '/admin/usuarios' },
  { id: 'admin-categorias', icon: Tag,   label: 'Categorias', href: '/admin/categorias' },
]

export const SIDEBAR_WIDTH = 220

interface SidebarProps {
  delayedCount: number
}

export default function Sidebar({ delayedCount }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const navItems = useMemo(() =>
    BASE_NAV.map(n =>
      n.id === 'lista' ? { ...n, badge: delayedCount > 0 ? delayedCount : null } : { ...n, badge: null }
    ),
    [delayedCount]
  )

  const isAdmin = user?.perfil === 'Administrador'

  return (
    <aside
      className="fixed h-screen z-50 flex flex-col bg-white border-r border-[#E4E4E7] overflow-hidden"
      style={{ width: SIDEBAR_WIDTH }}
    >
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
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#A1A1AA]">
          Controle de Atividades
        </span>
      </button>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              title={item.label}
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
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#A1A1AA] whitespace-nowrap">
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
    </aside>
  )
}
