'use client'
import { useState } from 'react'
import { useUsers } from '@/hooks/useUsers'
import type { User } from '@/types'
import {
  Plus, Loader2, Shield, Search, MoreHorizontal, Pencil, Trash2, Mail, KeyRound,
} from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase-client'
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
import { UserAvatar } from '@/components/ui/UserAvatar'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'
import { FormError } from '@/components/ui/FormError'

type UserForm = { nome: string; email: string; perfil: string; ativo: boolean }
const EMPTY_USER: UserForm = { nome: '', email: '', perfil: 'Usuário', ativo: true }

export default function UsuariosPage() {
  // Gate de admin já é aplicado em app/(app)/admin/layout.tsx via AdminGuard
  const { users, addUser, updateUser, deleteUser } = useUsers()
  const [search, setSearch] = useState('')
  const [filterPerfil, setFilterPerfil] = useState('all')
  const [modal, setModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })
  const [form, setForm] = useState<UserForm>(EMPTY_USER)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const openNew = () => { setForm(EMPTY_USER); setModal({ open: true, user: null }); setError('') }
  const openEdit = (u: User) => {
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo })
    setModal({ open: true, user: u }); setError('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try {
      if (modal.user) {
        await updateUser(modal.user.id, { nome: form.nome, perfil: form.perfil as any, ativo: form.ativo })
        toast.success('Usuário atualizado')
      } else {
        // Onboarding sem senha: o e-mail de definição é enviado automaticamente no hook
        const { passwordResetSent } = await addUser({
          nome: form.nome,
          email: form.email,
          perfil: form.perfil as User['perfil'],
          ativo: form.ativo,
        })
        if (passwordResetSent) {
          toast.success('Usuário criado', `E-mail enviado para ${form.email.toLowerCase().trim()} definir a senha.`)
        } else {
          toast.warning('Usuário criado', 'O e-mail de definição de senha não pôde ser enviado.')
        }
      }
      setModal({ open: false, user: null })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  /**
   * Reenviar e-mail de definição de senha. Útil quando:
   * - O usuário não recebeu o e-mail inicial
   * - O link expirou (Firebase: 1 hora de validade)
   * - O e-mail caiu no spam e o usuário pediu reenvio
   *
   * Segurança: usa sendPasswordResetEmail do Firebase Auth — gera token
   * one-time, time-limited, HTTPS only. O admin não vê e nunca toca na
   * senha do usuário; ele apenas dispara o e-mail.
   */
  const handleResendEmail = async (u: User) => {
    try {
      await sendPasswordResetEmail(auth, u.email, {
        url: `${window.location.origin}/redefinir-senha`,
        handleCodeInApp: true,
      })
      toast.success('E-mail reenviado', `Link de definição de senha enviado para ${u.email}.`)
    } catch (err: any) {
      toast.error('Falha ao reenviar e-mail', err.message || 'Verifique a conexão e tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir usuário?',
      description: 'O usuário perderá acesso ao sistema. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteUser(id)
      toast.success('Usuário excluído')
    } catch (err: any) {
      toast.error('Erro ao excluir usuário', err.message || 'Tente novamente')
    }
  }

  // Filtro por busca + perfil
  const filtered = users.filter(u => {
    if (filterPerfil !== 'all' && u.perfil !== filterPerfil) return false
    if (!search) return true
    const s = search.toLowerCase()
    return u.nome.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
  })

  return (
    <div>
      {/* Título */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <Shield size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{users.length}</span> {users.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Usuários
          </h1>
          <p className="text-sm text-[#71717A] mt-1.5">
            Gerencie quem tem acesso ao sistema, defina perfis e ative ou desative contas.
          </p>
        </div>
        <MagneticButton
          onClick={openNew}
          className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Novo Usuário
        </MagneticButton>
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
        <Select value={filterPerfil} onValueChange={setFilterPerfil}>
          <SelectTrigger aria-label="Filtrar por função" className="h-9 w-auto min-w-[148px] text-sm border-[#E4E4E7] bg-white">
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
      <div className="bg-white border border-[#EDEEF1] rounded-2xl overflow-hidden shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_64px] gap-0 bg-[#F7F8FA] border-b border-[#E4E4E7] px-4 py-2.5">
          {['Nome', 'E-mail', 'Perfil', 'Status', 'Ações'].map(h => (
            <span key={h} className="text-[0.72rem] font-bold uppercase tracking-wider text-[#71717A]">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyIllustration variant={search ? 'search' : 'users'} size={104} />
            <p className="font-semibold text-[#52525B] mb-1 mt-3">
              {search ? 'Nenhum usuário encontrado' : 'Sem usuários cadastrados'}
            </p>
            <p className="text-[0.8125rem] text-[#A1A1AA] max-w-sm">
              {search
                ? 'Ajuste o termo de busca ou crie um novo usuário.'
                : 'Convide membros da equipe — eles receberão um e-mail para definir a própria senha.'}
            </p>
            <button
              onClick={openNew}
              className="mt-5 h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} /> {search ? 'Adicionar usuário' : 'Convidar primeiro usuário'}
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
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => openEdit(u)} className="gap-2 cursor-pointer">
                        <Pencil size={13} />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleResendEmail(u)}
                        className="gap-2 cursor-pointer"
                      >
                        <KeyRound size={13} />
                        Reenviar e-mail de senha
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
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[0.78rem] text-[#1E3A8A]">
                  <Mail size={14} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <span>
                    Será enviado um e-mail para o usuário <b>definir a própria senha</b>.
                    Ele poderá acessar o sistema após clicar no link.
                  </span>
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

            <FormError message={error} />

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
