'use client'
import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { FolderKanban, Plus, Search, Trash2, MoreHorizontal, Pencil, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'
import { getCategoryColor } from '@/lib/category-color'

export default function ProjetosPage() {
  // Gate de admin já é aplicado em app/(app)/admin/layout.tsx via AdminGuard
  const { projects, addProject, updateProject, deleteProject } = useProjects()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; id: string | null; nome: string }>({ open: false, id: null, nome: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const openNew = () => setModal({ open: true, id: null, nome: '' })
  const openEdit = (id: string, nome: string) => setModal({ open: true, id, nome })

  const filtered = projects
    .filter(p => !search || p.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = modal.nome.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      if (modal.id) {
        await updateProject(modal.id, trimmed)
        toast.success('Projeto atualizado')
      } else {
        await addProject(trimmed)
        toast.success('Projeto criado')
      }
      setModal({ open: false, id: null, nome: '' })
    } catch (err: any) {
      toast.error('Erro ao salvar projeto', err.message || 'Tente novamente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Título */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <FolderKanban size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{projects.length}</span> {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Projetos
          </h1>
          <p className="text-sm text-[#71717A] mt-1.5">
            Agrupe tarefas por projeto — o nível mais alto da organização, acima das categorias.
          </p>
        </div>
        <MagneticButton
          onClick={openNew}
          className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Novo Projeto
        </MagneticButton>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
          <Input
            type="text"
            className="pl-9 h-9 text-sm border-[#E4E4E7]"
            placeholder="Buscar projeto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[#EDEEF1] rounded-2xl overflow-hidden shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
        <div className="grid grid-cols-[1fr_64px] bg-[#F7F8FA] border-b border-[#E4E4E7] px-4 py-2.5">
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">Nome</span>
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyIllustration variant={search ? 'search' : 'category'} size={104} />
            <p className="font-semibold text-[#52525B] mb-1 mt-3">
              {search ? 'Nenhum projeto encontrado' : 'Sem projetos cadastrados'}
            </p>
            <p className="text-[0.8125rem] text-[#71717A] max-w-sm">
              {search
                ? 'Ajuste o termo de busca para encontrar o projeto desejado.'
                : 'Projetos são o nível mais alto de organização — comece criando o primeiro.'}
            </p>
            {!search && (
              <button
                onClick={openNew}
                className="mt-5 h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} /> Criar primeiro projeto
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map(p => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_64px] items-center px-4 py-3 border-b border-[#F4F4F5] hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: getCategoryColor(p.nome).hex }}
                  />
                  <span className="text-sm font-medium text-[#111111]">{p.nome}</span>
                </div>

                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Ações para projeto "${p.nome}"`}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F7F8FA] text-[#71717A] transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEdit(p.id, p.nome)} className="gap-2 cursor-pointer">
                        <Pencil size={13} />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Excluir "${p.nome}"?`,
                            description: 'Projetos usados por tarefas existentes não podem ser excluídos.',
                            confirmText: 'Excluir',
                            variant: 'destructive',
                          })
                          if (!ok) return
                          try {
                            await deleteProject(p.id)
                            toast.success('Projeto excluído')
                          } catch (err: any) {
                            toast.error('Erro ao excluir projeto', err.message || 'Tente novamente')
                          }
                        }}
                        className="gap-2 cursor-pointer text-[#DC2626] focus:text-[#DC2626] focus:bg-[#FEF2F2]"
                      >
                        <Trash2 size={13} />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog novo / editar projeto */}
      <Dialog open={modal.open} onOpenChange={open => { if (!open) setModal({ open: false, id: null, nome: '' }) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{modal.id ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome-proj">Nome *</Label>
              <Input
                id="nome-proj"
                required
                autoFocus
                value={modal.nome}
                onChange={e => setModal(m => ({ ...m, nome: e.target.value }))}
                placeholder="Ex.: Prontuário Municipal, SAEB, Formação 2026..."
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModal({ open: false, id: null, nome: '' })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
