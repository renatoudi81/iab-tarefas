'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/lib/firebase-client'
import {
  Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import AuthLayout from '@/components/auth/AuthLayout'
import Link from 'next/link'

type State =
  | { kind: 'verifying' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'ready'; email: string }
  | { kind: 'submitting'; email: string }
  | { kind: 'done' }

// ---------------- Critérios de força ----------------
function evaluatePassword(pwd: string) {
  return {
    length: pwd.length >= 8,
    letter: /[a-zA-Z]/.test(pwd),
    number: /\d/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  }
}
function scoreOf(pwd: string) {
  const c = evaluatePassword(pwd)
  return [c.length, c.letter, c.number, c.symbol].filter(Boolean).length
}
function strengthLabel(score: number) {
  if (score <= 1) return { label: 'Fraca', color: '#EF4444' }
  if (score === 2) return { label: 'Razoável', color: '#F59E0B' }
  if (score === 3) return { label: 'Boa', color: '#3B82F6' }
  return { label: 'Forte', color: '#22C55E' }
}

// ---------------- Page com Suspense (useSearchParams) ----------------
export default function Page() {
  return (
    <Suspense fallback={<AuthLayout title="Carregando..."><div className="h-20" /></AuthLayout>}>
      <RedefinirSenhaContent />
    </Suspense>
  )
}

function RedefinirSenhaContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { signIn } = useAuth()
  const code = params.get('oobCode')
  const mode = params.get('mode')

  const [state, setState] = useState<State>({ kind: 'verifying' })
  const [pwd, setPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const criteria = useMemo(() => evaluatePassword(pwd), [pwd])
  const score = useMemo(() => scoreOf(pwd), [pwd])
  const strong = strengthLabel(score)
  const valid = criteria.length && criteria.letter && criteria.number
  const matches = pwd.length > 0 && pwd === confirmPwd

  // Verifica o código de redefinição assim que a página carrega
  useEffect(() => {
    if (mode !== 'resetPassword' || !code) {
      setState({ kind: 'invalid', reason: 'Link inválido. Solicite um novo no fluxo de "Esqueci minha senha".' })
      return
    }
    verifyPasswordResetCode(auth, code)
      .then((email) => setState({ kind: 'ready', email }))
      .catch((err) => {
        const fbCode = err instanceof FirebaseError ? err.code : ''
        const reason =
          fbCode === 'auth/expired-action-code'
            ? 'Este link expirou. Solicite um novo no fluxo de "Esqueci minha senha".'
            : fbCode === 'auth/invalid-action-code'
              ? 'Link inválido ou já utilizado. Solicite um novo.'
              : 'Não foi possível verificar este link.'
        setState({ kind: 'invalid', reason })
      })
  }, [code, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state.kind !== 'ready') return
    if (!valid || !matches) return
    setSubmitError('')
    setState({ kind: 'submitting', email: state.email })
    try {
      await confirmPasswordReset(auth, code!, pwd)
      // Auto-login após reset bem-sucedido — UX melhor e seguro porque
      // o usuário acabou de provar que controla o e-mail (link único usado).
      // Usa o signIn do AuthContext: ele controla `loading` corretamente
      // para evitar race condition com o redirect do (app)/layout.
      try {
        await signIn(state.email, pwd)
      } catch {
        // Se o auto-login falhar (caso raro), seguimos pro /login mesmo assim
      }
      setState({ kind: 'done' })
      setTimeout(() => router.replace('/dashboard'), 1500)
    } catch (err) {
      const fbCode = err instanceof FirebaseError ? err.code : ''
      setSubmitError(
        fbCode === 'auth/expired-action-code'
          ? 'Este link expirou. Solicite outro.'
          : fbCode === 'auth/invalid-action-code'
            ? 'Este link já foi utilizado. Solicite outro.'
            : fbCode === 'auth/weak-password'
              ? 'Senha muito fraca. Use ao menos 8 caracteres com letras e números.'
              : 'Não foi possível redefinir a senha. Tente novamente.'
      )
      setState({ kind: 'ready', email: state.email })
    }
  }

  // ---- Estado: verificando link ----
  if (state.kind === 'verifying') {
    return (
      <AuthLayout title="Verificando link...">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={26} className="animate-spin text-[#3B82F6]" />
        </div>
      </AuthLayout>
    )
  }

  // ---- Estado: link inválido ----
  if (state.kind === 'invalid') {
    return (
      <AuthLayout title="Link inválido">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#EF4444]/15 flex items-center justify-center mb-5">
            <AlertCircle size={28} className="text-[#F87171]" />
          </div>
          <p className="text-[#CBD5E1] text-[0.92rem] leading-relaxed mb-6">
            {state.reason}
          </p>
          <Link
            href="/esqueci-senha"
            className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[0.9rem] font-semibold flex items-center justify-center gap-2 transition-colors shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)]"
          >
            Solicitar novo link <ArrowRight size={15} />
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ---- Estado: senha alterada com sucesso ----
  if (state.kind === 'done') {
    return (
      <AuthLayout title="Senha atualizada">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#16A34A]/15 flex items-center justify-center mb-5">
            <ShieldCheck size={28} className="text-[#22C55E]" />
          </div>
          <p className="text-[#CBD5E1] text-[0.92rem] leading-relaxed mb-6">
            Sua nova senha foi salva. Estamos entrando na sua conta...
          </p>
          <div className="flex items-center gap-2 text-[#94A3B8] text-[0.85rem]">
            <Loader2 size={14} className="animate-spin" />
            Redirecionando para o dashboard
          </div>
        </div>
      </AuthLayout>
    )
  }

  // ---- Estado: ready ou submitting (mostra form) ----
  const submitting = state.kind === 'submitting'

  return (
    <AuthLayout
      title="Definir nova senha"
      subtitle={`Para ${state.email}`}
    >
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] px-4 py-3 rounded-lg text-[0.85rem] overflow-hidden"
          >
            {submitError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Senha */}
        <div>
          <label htmlFor="pwd" className="block text-[0.78rem] font-semibold text-[#94A3B8] mb-2">
            Nova senha
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            <input
              id="pwd"
              required
              autoFocus
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              className={cn(
                'w-full pl-10 pr-11 h-11 rounded-lg',
                'bg-white/[0.06] border border-white/10 text-slate-100 text-sm',
                'outline-none transition-all duration-150',
                'focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                'placeholder:text-[#475569]'
              )}
              placeholder="Mínimo 8 caracteres"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#64748B] cursor-pointer flex items-center justify-center w-7 h-7 rounded hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Barra de força */}
          <AnimatePresence>
            {pwd.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
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

                {/* Checklist */}
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem]">
                  <CriteriaItem ok={criteria.length} label="Pelo menos 8 caracteres" />
                  <CriteriaItem ok={criteria.letter} label="Contém letra" />
                  <CriteriaItem ok={criteria.number} label="Contém número" />
                  <CriteriaItem ok={criteria.symbol} label="Símbolo (opcional)" optional />
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirmar senha */}
        <div>
          <label htmlFor="confirm" className="block text-[0.78rem] font-semibold text-[#94A3B8] mb-2">
            Confirmar senha
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            <input
              id="confirm"
              required
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className={cn(
                'w-full pl-10 pr-11 h-11 rounded-lg',
                'bg-white/[0.06] border text-slate-100 text-sm',
                'outline-none transition-all duration-150',
                confirmPwd.length > 0 && !matches
                  ? 'border-[#EF4444]/50 focus:border-[#EF4444]/80 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
                  : 'border-white/10 focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                'placeholder:text-[#475569]'
              )}
              placeholder="Repita a senha"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#64748B] cursor-pointer flex items-center justify-center w-7 h-7 rounded hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmPwd.length > 0 && !matches && (
            <p className="mt-1.5 text-[0.72rem] text-[#F87171]">As senhas não coincidem.</p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={!valid || !matches || submitting}
          whileHover={valid && matches && !submitting ? { scale: 1.01 } : {}}
          whileTap={valid && matches && !submitting ? { scale: 0.99 } : {}}
          className={cn(
            'mt-3 w-full h-11 rounded-lg text-[0.9rem] font-semibold',
            'flex items-center justify-center gap-2 border-0 cursor-pointer',
            'transition-all duration-150',
            !valid || !matches || submitting
              ? 'bg-[#2563EB]/40 text-white/60 cursor-not-allowed'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)]'
          )}
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Salvando...
            </>
          ) : (
            <>Salvar nova senha <ArrowRight size={15} /></>
          )}
        </motion.button>
      </form>
    </AuthLayout>
  )
}

function CriteriaItem({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <CheckCircle2
        size={12}
        className={cn(
          'flex-shrink-0',
          ok ? 'text-[#22C55E]' : optional ? 'text-[#475569]' : 'text-[#64748B]'
        )}
      />
      <span className={cn(ok ? 'text-[#CBD5E1]' : 'text-[#64748B]')}>{label}</span>
    </li>
  )
}
