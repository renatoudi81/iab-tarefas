'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { redirect } from 'next/navigation'
import { useCategories } from '@/hooks/useCategories'
import { Tag, Plus, Search, Trash2, MoreHorizontal, Pencil } from 'lucide-react'
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

export default function CategoriasPage() {
  const { user } = useAuth()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; id: string | null; nome: string }>({ open: false, id: null, nome: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const openNew = () => setModal({ open: true, id: null, nome: '' })
  const openEdit = (id: string, nome: string) => setModal({ open: true, id, nome })

  if (user && user.perfil !== 'Administrador') redirect('/dashboard')

  const filtered = categories
    .filter(c => !search || c.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = modal.nome.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      if (modal.id) {
        await updateCategory(modal.id, trimmed)
        toast.success('Categoria atualizada')
      } else {
        await addCategory(trimmed)
        toast.success('Categoria criada')
      }
      setModal({ open: false, id: null, nome: '' })
    } catch (err: any) {
      toast.error('Erro ao salvar categoria', err.message || 'Tente novamente')
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
              <Tag size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{categories.length}</span> {categories.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Categorias
          </h1>
          <p className="text-sm text-[#71717A] mt-1.5 max-w-[58ch]">
            Organize as tarefas por área de atuação — Marketing, Financeiro, Jurídico e mais.
          </p>
        </div>
        <MagneticButton
          onClick={openNew}
          className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Nova Categoria
        </MagneticButton>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
          <Input
            type="text"
            className="pl-9 h-9 text-sm border-[#E4E4E7]"
            placeholder="Buscar categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[#EDEEF1] rounded-2xl overflow-hidden shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_64px] bg-[#F7F8FA] border-b border-[#E4E4E7] px-4 py-2.5">
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">Nome</span>
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-[#F7F8FA] items-center justify-center mb-3">
              <Tag size={24} className="text-[#A1A1AA]" />
            </div>
            <p className="font-semibold text-[#52525B] mb-1">
              {search ? 'Nenhuma categoria encontrada' : 'Sem categorias cadastradas'}
            </p>
            <p className="text-[0.8125rem] text-[#A1A1AA] max-w-sm">
              {search
                ? 'Ajuste o termo de busca para encontrar a categoria desejada.'
                : 'Categorias organizam suas tarefas por área — comece criando a primeira.'}
            </p>
            {!search && (
              <button
                onClick={openNew}
                className="mt-5 h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} /> Criar primeira categoria
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map(c => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_64px] items-center px-4 py-3 border-b border-[#F4F4F5] hover:bg-[#FAFAFA] transition-colors"
              >
                {/* Nome */}
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#D4D4D8]" />
                  <span className="text-sm font-medium text-[#111111]">{c.nome}</span>
                </div>

                {/* Ações */}
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F7F8FA] text-[#71717A] transition-colors cursor-pointer border-0 bg-transparent">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => openEdit(c.id, c.nome)}
                        className="gap-2 cursor-pointer"
                      >
                        <Pencil size={13} />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Excluir "${c.nome}"?`,
                            description: 'Categorias usadas por tarefas existentes não podem ser excluídas.',
                            confirmText: 'Excluir',
                            variant: 'destructive',
                          })
                          if (!ok) return
                          try {
                            await deleteCategory(c.id)
                            toast.success('Categoria excluída')
                          } catch (err: any) {
                            toast.error('Erro ao excluir categoria', err.message || 'Tente novamente')
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

      {/* Dialog nova / editar categoria */}
      <Dialog open={modal.open} onOpenChange={open => { if (!open) setModal({ open: false, id: null, nome: '' }) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{modal.id ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome-cat">Nome *</Label>
              <Input
                id="nome-cat"
                required
                autoFocus
                value={modal.nome}
                onChange={e => setModal(m => ({ ...m, nome: e.target.value }))}
                placeholder="Ex.: Marketing, Financeiro, Jurídico..."
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModal({ open: false, id: null, nome: '' })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
