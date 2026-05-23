'use client'
import { useState, useEffect, useId } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FirebaseError } from 'firebase/app'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, CheckCircle2,
  AlertCircle, ShieldCheck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const LOADING_MSGS = ['Autenticando...', 'Verificando perfil...', 'Quase lá...']

const FEATURES = [
  { title: 'Tarefas', desc: 'Organize e priorize' },
  { title: 'Kanban', desc: 'Visualize o fluxo' },
  { title: 'Relatórios', desc: 'Meça resultados' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const emailId = useId()
  const passwordId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const emailValid = !email || EMAIL_RE.test(email.trim())
  const emailError = emailTouched && !emailValid
  const canSubmit = !loading && !success && email.trim() && password && emailValid

  // Rotação das mensagens de carregamento
  useEffect(() => {
    if (!loading) { setMsgIdx(0); return }
    const t1 = setTimeout(() => setMsgIdx(1), 3000)
    const t2 = setTimeout(() => setMsgIdx(2), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [loading])

  // Detecção de Caps Lock — KeyboardEvent.getModifierState é confiável
  // em todos os navegadores modernos. Mostra aviso visual no campo de senha.
  const handlePwdKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      // Mostra estado de sucesso antes do redirect (microinteração premium)
      setSuccess(true)
      setLoading(false)
      // Pequeno delay para o usuário ver a confirmação
      // Após login bem-sucedido, leva direto pro Kanban (visão operacional
      // que o usuário usa no dia-a-dia). Dashboard continua acessível
      // pelo Sidebar / Command Palette / atalho G D.
      setTimeout(() => router.push('/kanban'), 600)
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      const msg =
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
          ? 'E-mail ou senha incorretos.'
          : code === 'auth/too-many-requests'
            ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
            : code === 'auth/user-disabled'
              ? 'Esta conta foi desativada. Entre em contato com um administrador.'
              : code === 'auth/network-request-failed'
                ? 'Sem conexão. Verifique sua internet e tente novamente.'
                : 'Não foi possível entrar. Tente novamente em instantes.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1530] relative overflow-hidden px-6 py-8 sm:py-12">
      {/* Background — gradient + blobs animados sutilmente */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1530] via-[#0F1E45] to-[#091333]" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.14)_0%,transparent_60%)]"
          animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10)_0%,transparent_60%)]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Container central */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10 lg:gap-16 items-center"
      >
        {/* Brand — em mobile fica compacto (só logo + headline curta) */}
        <div className="text-slate-100 max-w-[520px]">
          <div className="flex items-center gap-3 mb-6 sm:mb-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex-shrink-0">
              <Image
                src="/logo-iab-symbol.svg"
                alt="IAB"
                width={28}
                height={30}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="text-[0.95rem] font-bold tracking-tight text-white leading-tight">Instituto Alfa e Beto</div>
              <div className="text-[0.75rem] text-[#94A3B8]">Controle de Atividades</div>
            </div>
          </div>

          {/* Headline + features apenas em telas médias+ pra não inchar o mobile */}
          <div className="hidden sm:block">
            <h1 className="text-[2.5rem] lg:text-[2.875rem] font-black tracking-[-0.035em] leading-[1.05] mb-5">
              Organize.<br />
              <span className="text-[#3B82F6]">Execute.</span><br />
              Entregue.
            </h1>
            <p className="text-[#94A3B8] text-[0.95rem] leading-relaxed max-w-[420px] mb-8">
              Plataforma colaborativa para gerenciar projetos, registrar horas e acompanhar resultados da equipe.
            </p>

            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-[#2563EB]/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={13} className="text-[#3B82F6]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[0.875rem] font-semibold text-white">{f.title}</span>
                    <span className="text-[0.8125rem] text-[#94A3B8]">— {f.desc}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="w-full lg:max-w-[440px]">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 sm:p-8 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]">
            <h2 className="text-[1.5rem] font-bold text-white tracking-tight mb-1">Entrar na conta</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Use suas credenciais corporativas</p>

            {/* Erro — role=alert pra screen readers anunciarem */}
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] px-4 py-3 rounded-lg text-[0.85rem] overflow-hidden flex items-start gap-2"
                >
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* E-mail */}
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-[0.78rem] font-semibold text-[#94A3B8] mb-2"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  <input
                    id={emailId}
                    required
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={emailError || undefined}
                    aria-describedby={emailError ? `${emailId}-err` : undefined}
                    className={cn(
                      'w-full pl-10 pr-3.5 h-11 rounded-lg',
                      'bg-white/[0.06] border text-slate-100 text-sm',
                      'outline-none transition-all duration-150',
                      'placeholder:text-[#475569]',
                      emailError
                        ? 'border-[#EF4444]/60 focus:border-[#EF4444]/80 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]'
                        : 'border-white/10 focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                    )}
                    placeholder="seu@alfaebeto.org.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    disabled={loading || success}
                  />
                </div>
                <AnimatePresence>
                  {emailError && (
                    <motion.p
                      id={`${emailId}-err`}
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-[0.72rem] text-[#FCA5A5] overflow-hidden"
                    >
                      Insira um e-mail válido (ex: nome@dominio.com).
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label htmlFor={passwordId} className="text-[0.78rem] font-semibold text-[#94A3B8]">
                    Senha
                  </label>
                  <Link
                    href="/esqueci-senha"
                    className="text-[0.72rem] font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  <input
                    id={passwordId}
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={cn(
                      'w-full pl-10 pr-11 h-11 rounded-lg',
                      'bg-white/[0.06] border border-white/10 text-slate-100 text-sm',
                      'outline-none transition-all duration-150',
                      'focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                      'placeholder:text-[#475569]',
                    )}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handlePwdKey}
                    onKeyUp={handlePwdKey}
                    onBlur={() => setCapsLock(false)}
                    disabled={loading || success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#64748B] cursor-pointer flex items-center justify-center w-7 h-7 rounded hover:text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Caps Lock warning */}
                <AnimatePresence>
                  {capsLock && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-[0.72rem] text-[#FBBF24] overflow-hidden flex items-center gap-1.5"
                    >
                      <AlertCircle size={11} />
                      Caps Lock está ativado
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Botão entrar / sucesso */}
              <motion.button
                type="submit"
                disabled={!canSubmit && !loading}
                whileHover={canSubmit ? { scale: 1.01 } : {}}
                whileTap={canSubmit ? { scale: 0.99 } : {}}
                className={cn(
                  'mt-3 w-full h-11 rounded-lg text-[0.9rem] font-semibold',
                  'flex items-center justify-center gap-2 border-0',
                  'transition-all duration-150',
                  success
                    ? 'bg-[#16A34A] text-white cursor-default shadow-[0_8px_24px_-6px_rgba(22,163,74,0.5)]'
                    : loading
                      ? 'bg-[#2563EB]/50 text-white/70 cursor-not-allowed'
                      : canSubmit
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] cursor-pointer'
                        : 'bg-[#2563EB]/30 text-white/50 cursor-not-allowed',
                )}
              >
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.span
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Bem-vindo!
                    </motion.span>
                  ) : loading ? (
                    <motion.span
                      key={`loading-${msgIdx}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Loader2 size={15} className="animate-spin" />
                      {LOADING_MSGS[msgIdx]}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      Entrar <ArrowRight size={15} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Trust signal — sinal de transparência sobre segurança */}
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[0.7rem] text-[#64748B]">
                <ShieldCheck size={12} className="text-[#3B82F6]/70" />
                <span>Conexão criptografada · Autenticação Firebase</span>
              </div>
            </form>
          </div>

          <p className="text-center mt-6 text-[0.72rem] text-[#475569]">
            © {new Date().getFullYear()} Instituto Alfa e Beto · Uso exclusivo corporativo
          </p>
        </div>
      </motion.div>
    </div>
  )
}
