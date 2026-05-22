'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard, ClipboardList, LayoutGrid, GanttChart,
  FileBarChart2, Users, Tag, User, LogOut, Search,
  Settings, Plus, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTasks } from '@/hooks/useTasks'

/**
 * Command Palette estilo Linear/Vercel — abre com ⌘K / Ctrl+K.
 *
 * Navega rapidamente entre páginas, busca tarefas e expõe ações.
 * cmdk lida com keyboard navigation, fuzzy search e a11y.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { tasks } = useTasks()

  const isAdmin = user?.perfil === 'Administrador'

  // ⌘K / Ctrl+K para abrir
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  if (!user) return null

  return (
    <>
      {/* Overlay com backdrop blur */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Menu"
        className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[15vh]"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <div className="relative w-full max-w-[600px] bg-white rounded-2xl shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] border border-[#EDEEF1] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F4F4F5]">
            <Search size={16} className="text-[#A1A1AA]" />
            <Command.Input
              placeholder="Buscar páginas, tarefas, ações..."
              className="flex-1 bg-transparent border-0 outline-none text-[0.92rem] text-[#0F172A] placeholder:text-[#A1A1AA]"
            />
            <kbd className="hidden md:inline-flex items-center gap-1 text-[0.65rem] font-mono text-[#71717A] bg-[#F4F4F5] border border-[#E4E4E7] px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-[0.85rem] text-[#A1A1AA]">
              Nada encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação" className="[&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[#71717A] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2">
              <PaletteItem icon={LayoutDashboard} label="Ir para Dashboard" shortcut="G D" onSelect={() => go('/dashboard')} />
              <PaletteItem icon={ClipboardList} label="Ir para Lista de Tarefas" shortcut="G L" onSelect={() => go('/lista')} />
              <PaletteItem icon={LayoutGrid} label="Ir para Kanban" shortcut="G K" onSelect={() => go('/kanban')} />
              <PaletteItem icon={GanttChart} label="Ir para Gantt" shortcut="G G" onSelect={() => go('/gantt')} />
              <PaletteItem icon={FileBarChart2} label="Ir para Relatórios" shortcut="G R" onSelect={() => go('/relatorios')} />
            </Command.Group>

            {isAdmin && (
              <Command.Group heading="Administração" className="[&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[#71717A] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:mt-2">
                <PaletteItem icon={Users} label="Gerenciar usuários" onSelect={() => go('/admin/usuarios')} />
                <PaletteItem icon={Tag} label="Gerenciar categorias" onSelect={() => go('/admin/categorias')} />
              </Command.Group>
            )}

            <Command.Group heading="Conta" className="[&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[#71717A] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:mt-2">
              <PaletteItem icon={User} label="Meu perfil" onSelect={() => go('/perfil')} />
              <PaletteItem
                icon={LogOut}
                label="Sair"
                destructive
                onSelect={async () => { setOpen(false); await signOut(); router.replace('/login') }}
              />
            </Command.Group>

            {tasks.length > 0 && (
              <Command.Group heading="Tarefas recentes" className="[&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-[#71717A] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:mt-2">
                {tasks.slice(0, 6).map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`tarefa ${t.titulo} ${t.categoria} ${t.id}`}
                    onSelect={() => go('/lista')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[0.875rem] text-[#3F3F46] aria-selected:bg-[#F4F4F5] aria-selected:text-[#0F172A]"
                  >
                    <span className="text-[0.65rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0 tabular-nums tracking-tight">
                      #{t.id.slice(-5).toUpperCase()}
                    </span>
                    <span className="truncate flex-1">{t.titulo}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[#F4F4F5] bg-[#FAFAFA] text-[0.7rem] text-[#71717A]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="font-mono bg-white border border-[#E4E4E7] px-1.5 rounded text-[0.65rem]">↑↓</kbd>
                navegar
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="font-mono bg-white border border-[#E4E4E7] px-1.5 rounded text-[0.65rem]">↵</kbd>
                selecionar
              </span>
            </div>
            <span className="font-mono">⌘K</span>
          </div>
        </div>
      </Command.Dialog>
    </>
  )
}

function PaletteItem({
  icon: Icon, label, onSelect, shortcut, destructive,
}: {
  icon: React.ElementType
  label: string
  onSelect: () => void
  shortcut?: string
  destructive?: boolean
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-[0.875rem] ' +
        (destructive
          ? 'text-[#DC2626] aria-selected:bg-[#FEF2F2] aria-selected:text-[#DC2626]'
          : 'text-[#3F3F46] aria-selected:bg-[#F4F4F5] aria-selected:text-[#0F172A]')
      }
    >
      <Icon size={15} className={destructive ? 'text-[#DC2626]' : 'text-[#71717A]'} />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="font-mono text-[0.65rem] bg-[#F4F4F5] border border-[#E4E4E7] px-1.5 py-0.5 rounded text-[#71717A]">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  )
}
