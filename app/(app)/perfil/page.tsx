'use client'
import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { auth } from '@/lib/firebase-client'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { apiFetch } from '@/lib/api-fetch'
import { useSWRConfig } from 'swr'
import { getInitials } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Loader2, Check, Eye, EyeOff, Lock, User as UserIcon,
  Mail, Shield, CheckCircle2, AlertTriangle, Palette, Camera, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resizeAndCropImage } from '@/lib/image-utils'
import { useRef } from 'react'

const AVATAR_COLORS = [
  '#2563EB', '#0EA5E9', '#06B6D4', '#10B981',
  '#22C55E', '#EAB308', '#F97316', '#EF4444',
  '#EC4899', '#A855F7', '#6366F1', '#64748B',
]

function evaluatePassword(pwd: string) {
  return {
    length: pwd.length >= 8,
    letter: /[a-zA-Z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  }
}
function strengthLabel(score: number) {
  if (score <= 1) return { label: 'Fraca', color: '#EF4444' }
  if (score === 2) return { label: 'Razoável', color: '#F59E0B' }
  if (score === 3) return { label: 'Boa', color: '#3B82F6' }
  return { label: 'Forte', color: '#22C55E' }
}

export default function PerfilPage() {
  const { user } = useAuth()
  const { mutate: swrMutate } = useSWRConfig()

  if (!user) return null

  return (
    <div className="max-w-3xl">
      {/* Header — padrão Kanban/Lista (mb-6) */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
            <UserIcon size={11} strokeWidth={2.5} />
            {user.perfil}
          </span>
        </div>
        <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
          Meu Perfil
        </h1>
        <p className="text-[#71717A] text-sm mt-1.5">
          Gerencie suas informações pessoais, foto e senha de acesso ao sistema.
        </p>
      </div>

      <div className="grid gap-5">
        <PerfilInfoCard user={user} onSaved={() => swrMutate('/api/users')} />
        <PerfilFotoCard user={user} onSaved={() => swrMutate('/api/users')} />
        <PerfilSenhaCard userEmail={user.email} />
      </div>
    </div>
  )
}

// ============================================================
// CARD 1 — Informações da conta
// ============================================================
function PerfilInfoCard({
  user, onSaved,
}: { user: { id: string; name: string; email: string; perfil: string }; onSaved: () => void }) {
  const [nome, setNome] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const changed = nome.trim() !== user.name && nome.trim().length > 0

  const handleSave = async () => {
    if (!changed || saving) return
    setSaving(true); setError(''); setSuccess(false)
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      setSuccess(true)
      onSaved()
      setTimeout(() => setSuccess(false), 2500)
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card icon={<UserIcon size={16} className="text-[#2563EB]" />} title="Informações da conta">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-label="Nome"
            className="w-full h-10 px-3 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#111111] outline-none transition-colors focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
          />
        </div>

        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5">E-mail <ReadOnlyBadge /></span>
          </Label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
            <input
              type="email"
              value={user.email}
              readOnly
              aria-label="E-mail (somente leitura)"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#52525B] cursor-not-allowed"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>
            <span className="inline-flex items-center gap-1.5">Perfil <ReadOnlyBadge /></span>
          </Label>
          <div className="relative">
            <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
            <input
              type="text"
              value={user.perfil}
              readOnly
              aria-label="Perfil de acesso (somente leitura)"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-sm text-[#52525B] cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <FormFooter
        error={error}
        success={success && 'Nome atualizado'}
        button={
          <button
            onClick={handleSave}
            disabled={!changed || saving}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
              !changed || saving
                ? 'bg-[#E4E4E7] text-[#71717A] cursor-not-allowed'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer'
            )}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        }
      />
    </Card>
  )
}

// ============================================================
// CARD 2 — Foto do perfil (com fallback de cor)
// ============================================================
function PerfilFotoCard({
  user, onSaved,
}: {
  user: { id: string; name: string; avatar_color: string; avatar_url: string | null }
  onSaved: () => void
}) {
  const [color, setColor] = useState(user.avatar_color)
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.avatar_url)
  const [savingColor, setSavingColor] = useState(false)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const colorChanged = color !== user.avatar_color
  const hasPhoto = !!photoUrl

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 2500)
  }

  const persist = async (payload: Record<string, unknown>): Promise<boolean> => {
    setError('')
    try {
      const res = await apiFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')
      onSaved()
      return true
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar')
      return false
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reupload do mesmo arquivo
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 10 MB antes da compressão.')
      return
    }

    setSavingPhoto(true); setError('')
    try {
      const dataUrl = await resizeAndCropImage(file, 256, 0.85)
      const ok = await persist({ avatar_url: dataUrl })
      if (ok) {
        setPhotoUrl(dataUrl)
        flash('Foto atualizada')
      }
    } catch (e: any) {
      setError(e.message || 'Falha ao processar a imagem')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    setSavingPhoto(true)
    const ok = await persist({ avatar_url: null })
    if (ok) {
      setPhotoUrl(null)
      flash('Foto removida')
    }
    setSavingPhoto(false)
  }

  const handleSaveColor = async () => {
    if (!colorChanged) return
    setSavingColor(true)
    const ok = await persist({ avatar_color: color })
    if (ok) flash('Cor atualizada')
    setSavingColor(false)
  }

  return (
    <Card icon={<Camera size={16} className="text-[#2563EB]" />} title="Foto do perfil">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Preview grande */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{
              // color-mix garante contraste 4.5:1 do texto branco sobre qualquer avatar_color
              background: photoUrl ? 'transparent' : `color-mix(in srgb, ${color} 68%, #000)`,
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Foto do perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">{getInitials(user.name)}</span>
            )}
            {savingPhoto && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 size={20} className="text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={savingPhoto}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border',
                savingPhoto
                  ? 'border-[#E4E4E7] text-[#71717A] cursor-not-allowed'
                  : 'border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] text-[#3F3F46] cursor-pointer'
              )}
            >
              <Camera size={12} />
              {hasPhoto ? 'Trocar' : 'Enviar foto'}
            </button>

            {hasPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={savingPhoto}
                className="h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#FEF2F2] hover:border-[#FCA5A5] text-[#DC2626] transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
                Remover
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Selecionar arquivo de avatar"
          />
        </div>

        {/* Color picker — fallback quando não tem foto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={13} className="text-[#71717A]" />
            <span className="text-[0.78rem] font-semibold text-[#52525B]">
              Cor de fundo das iniciais
            </span>
            {hasPhoto && (
              <span className="text-[0.65rem] text-[#71717A] uppercase tracking-wide ml-1">
                (usada quando não há foto)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Selecionar cor ${c}`}
                className={cn(
                  'w-8 h-8 rounded-full transition-all cursor-pointer relative',
                  color === c ? 'ring-2 ring-offset-2 ring-[#2563EB] scale-105' : 'hover:scale-105'
                )}
                style={{ background: c }}
              >
                {color === c && (
                  <Check size={14} className="text-white absolute inset-0 m-auto" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>

          {colorChanged && (
            <button
              onClick={handleSaveColor}
              disabled={savingColor}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                savingColor
                  ? 'bg-[#E4E4E7] text-[#71717A] cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer'
              )}
            >
              {savingColor ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Salvar cor
            </button>
          )}
        </div>
      </div>

      <FormFooter
        error={error}
        success={success}
        button={null}
      />
    </Card>
  )
}

// ============================================================
// CARD 3 — Alterar senha (com reautenticação)
// ============================================================
function PerfilSenhaCard({ userEmail }: { userEmail: string }) {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const criteria = useMemo(() => evaluatePassword(newPwd), [newPwd])
  const score = [criteria.length, criteria.letter, criteria.number, criteria.symbol].filter(Boolean).length
  const strong = strengthLabel(score)
  const newValid = criteria.length && criteria.letter && criteria.number
  const matches = newPwd.length > 0 && newPwd === confirmPwd
  const canSave = currentPwd.length > 0 && newValid && matches && !saving

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true); setError(''); setSuccess(false)

    if (currentPwd === newPwd) {
      setError('A nova senha não pode ser igual à atual.')
      setSaving(false)
      return
    }

    try {
      const fbUser = auth.currentUser
      if (!fbUser || !fbUser.email) throw new Error('Sessão inválida')

      // 1) Reautentica com a senha atual (security best practice)
      const credential = EmailAuthProvider.credential(fbUser.email, currentPwd)
      await reauthenticateWithCredential(fbUser, credential)

      // 2) Atualiza pra nova senha
      await updatePassword(fbUser, newPwd)

      setSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'A senha atual está incorreta.'
          : code === 'auth/weak-password'
            ? 'Nova senha muito fraca.'
            : code === 'auth/too-many-requests'
              ? 'Muitas tentativas. Aguarde alguns minutos.'
              : 'Não foi possível alterar a senha. Tente novamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card icon={<Lock size={16} className="text-[#2563EB]" />} title="Alterar senha">
      <form onSubmit={handleSave} className="grid gap-4">
        <PasswordField
          id="current"
          label="Senha atual"
          value={currentPwd}
          onChange={setCurrentPwd}
          show={showCurrent}
          onToggle={() => setShowCurrent(v => !v)}
          autoComplete="current-password"
        />

        <PasswordField
          id="new"
          label="Nova senha"
          value={newPwd}
          onChange={setNewPwd}
          show={showNew}
          onToggle={() => setShowNew(v => !v)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />

        {/* Barra de força */}
        <AnimatePresence>
          {newPwd.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: -8 }}
              animate={{ opacity: 1, height: 'auto', marginTop: -4 }}
              exit={{ opacity: 0, height: 0, marginTop: -8 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1 rounded-full bg-[#F0F0F2] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: strong.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 4) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <span className="text-[0.72rem] font-medium" style={{ color: strong.color }}>
                  {strong.label}
                </span>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem]">
                <CriteriaItem ok={criteria.length} label="Pelo menos 8 caracteres" />
                <CriteriaItem ok={criteria.letter} label="Contém letra" />
                <CriteriaItem ok={criteria.number} label="Contém número" />
                <CriteriaItem ok={criteria.symbol} label="Símbolo (opcional)" optional />
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <PasswordField
          id="confirm"
          label="Confirmar nova senha"
          value={confirmPwd}
          onChange={setConfirmPwd}
          show={showConfirm}
          onToggle={() => setShowConfirm(v => !v)}
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          error={confirmPwd.length > 0 && !matches ? 'As senhas não coincidem' : ''}
        />

        <FormFooter
          error={error}
          success={success && 'Senha alterada com sucesso'}
          button={
            <button
              type="submit"
              disabled={!canSave}
              className={cn(
                'h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                !canSave
                  ? 'bg-[#E4E4E7] text-[#71717A] cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer'
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Alterar senha
            </button>
          }
        />
      </form>
    </Card>
  )
}

// ============================================================
// Helpers visuais
// ============================================================
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] overflow-hidden transition-shadow hover:shadow-[0_12px_36px_-12px_rgba(37,99,235,0.15)]">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F4F4F5]">
        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-[0.92rem] font-semibold text-[#111111] tracking-[-0.01em]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[0.78rem] font-semibold text-[#52525B] mb-1.5">{children}</label>
}

function ReadOnlyBadge() {
  return <span className="text-[0.65rem] font-medium text-[#71717A] uppercase tracking-wide">somente leitura</span>
}

function FormFooter({
  error, success, button,
}: { error: string; success: string | boolean; button: React.ReactNode }) {
  const showMsg = !!(error || success)
  if (!showMsg && !button) return null
  return (
    <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-[#F4F4F5]">
      <AnimatePresence>
        {showMsg && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={cn(
              'flex items-center gap-1.5 text-[0.82rem] mr-auto',
              error ? 'text-[#DC2626]' : 'text-[#16A34A]'
            )}
          >
            {error ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            <span>{error || success}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {button}
    </div>
  )
}

function PasswordField({
  id, label, value, onChange, show, onToggle, autoComplete, placeholder, error,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; autoComplete?: string; placeholder?: string; error?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
        <input
          id={id}
          required
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className={cn(
            'w-full h-10 pl-9 pr-10 rounded-lg border text-sm text-[#111111] outline-none transition-colors',
            error
              ? 'border-[#DC2626]/50 focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]'
              : 'border-[#E4E4E7] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]'
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-[#71717A] hover:text-[#52525B] hover:bg-[#F4F4F5] transition-colors bg-transparent border-0 cursor-pointer"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[0.72rem] text-[#DC2626]">{error}</p>}
    </div>
  )
}

function CriteriaItem({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <CheckCircle2
        size={12}
        className={cn('flex-shrink-0', ok ? 'text-[#22C55E]' : optional ? 'text-[#D4D4D8]' : 'text-[#71717A]')}
      />
      <span className={cn(ok ? 'text-[#52525B]' : 'text-[#71717A]')}>{label}</span>
    </li>
  )
}
