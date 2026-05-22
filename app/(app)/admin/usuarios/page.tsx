'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { redirect } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUsers } from '@/hooks/useUsers'
import { getInitials } from '@/types'
import type { User } from '@/types'
import {
  Plus, Loader2, Shield, Search, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/ui/UserAvatar'

type UserForm = { nome: string; email: string; senha: string; perfil: string; ativo: boolean }
const EMPTY_USER: UserForm = { nome: '', email: '', senha: '', perfil: 'Usuário', ativo: true }

export default function UsuariosPage() {
  const { user: authUser } = useAuth()
  const { users, addUser, updateUser, deleteUser } = useUsers()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })
  const [form, setForm] = useState<UserForm>(EMPTY_USER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (authUser && authUser.perfil !== 'Administrador') redirect('/dashboard')

  const openNew = () => { setForm(EMPTY_USER); setModal({ open: true, user: null }); setError('') }
  const openEdit = (u: User) => {
    setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, ativo: u.ativo })
    setModal({ open: true, user: u }); setError('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try {
      if (modal.user) await updateUser(modal.user.id, { nome: form.nome, perfil: form.perfil as any, ativo: form.ativo })
      else await addUser({ ...form } as any)
      setModal({ open: false, user: null })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuário? Esta ação não pode ser desfeita.')) return
    try {
      await deleteUser(id)
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + (err.message || 'tente novamente'))
    }
  }

  // Filtro por busca (tabs são só UI por enquanto)
  const filtered = users.filter(u =>
    !search || u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Título */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Usuários</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Novo Usuário
        </button>
      </div>

      {/* Toolbar: busca + filtros */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
          <Input
            type="text"
            className="pl-9 h-9 text-sm border-[#E4E4E7]"
            placeholder="Buscar usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="h-9 w-auto min-w-[148px] text-sm border-[#E4E4E7] bg-white">
            <SelectValue placeholder="Todas as funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="Usuário">Usuário</SelectItem>
            <SelectItem value="Administrador">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_64px] gap-0 bg-[#F7F8FA] border-b border-[#E4E4E7] px-4 py-2.5">
          {['Nome', 'E-mail', 'Perfil', 'Status', 'Ações'].map(h => (
            <span key={h} className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#A1A1AA] gap-2">
            <p className="text-sm">Nenhum usuário encontrado</p>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] text-[#3F3F46] text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer mt-1"
            >
              <Plus size={13} strokeWidth={2.5} /> Adicionar usuário
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map(u => (
              <div
                key={u.id}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_64px] gap-0 items-center px-4 py-3 border-b border-[#F4F4F5] hover:bg-[#FAFAFA] transition-colors"
              >
                {/* Nome */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar user={u} size={32} />
                  <div className="flex items-center gap-1.5 font-semibold text-sm text-[#111111] truncate">
                    {u.nome}
                    {u.perfil === 'Administrador' && <Shield size={12} className="text-[#2563EB] flex-shrink-0" />}
                  </div>
                </div>

                {/* E-mail */}
                <span className="text-sm text-[#71717A] truncate">{u.email}</span>

                {/* Perfil */}
                <span className="inline-flex items-center text-[0.72rem] font-medium px-2.5 py-0.5 rounded-md bg-[#F4F4F5] text-[#52525B] w-fit">
                  {u.perfil}
                </span>

                {/* Status */}
                {u.ativo ? (
                  <span className="inline-flex items-center bg-[#16A34A] text-white rounded-full px-3 py-0.5 text-xs font-medium w-fit">
                    Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-[#DC2626] text-white rounded-full px-3 py-0.5 text-xs font-medium w-fit">
                    Inativo
                  </span>
                )}

                {/* Ações */}
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F7F8FA] text-[#71717A] transition-colors cursor-pointer border-0 bg-transparent">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => openEdit(u)} className="gap-2 cursor-pointer">
                        <Pencil size={13} />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(u.id)}
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

      {/* Dialog */}
      <Dialog open={modal.open} onOpenChange={open => { if (!open) setModal({ open: false, user: null }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modal.user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" required value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo" />
            </div>

            {!modal.user && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" required type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@alfaebeto.org.br" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="senha">Senha inicial *</Label>
                  <Input id="senha" required type="password" minLength={6} value={form.senha}
                    onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                    placeholder="Mínimo 6 caracteres" />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Perfil</Label>
                <Select value={form.perfil} onValueChange={val => setForm(p => ({ ...p, perfil: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Usuário">Usuário</SelectItem>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.ativo ? 'true' : 'false'} onValueChange={val => setForm(p => ({ ...p, ativo: val === 'true' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-[#DC2626] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#DC2626]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModal({ open: false, user: null })}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
