'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FirebaseError } from 'firebase/app'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const LOADING_MSGS = ['Autenticando...', 'Verificando perfil...', 'Quase lá...']

const FEATURES = [
  { title: 'Tarefas', desc: 'Organize e priorize' },
  { title: 'Kanban', desc: 'Visualize o fluxo' },
  { title: 'Relatórios', desc: 'Meça resultados' },
]

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!loading) { setMsgIdx(0); return }
    const t1 = setTimeout(() => setMsgIdx(1), 3000)
    const t2 = setTimeout(() => setMsgIdx(2), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      const msg =
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
          ? 'E-mail ou senha incorretos.'
          : code === 'auth/too-many-requests'
            ? 'Muitas tentativas. Tente novamente em alguns minutos.'
            : code === 'auth/user-disabled'
              ? 'Usuário inativo. Procure um administrador.'
              : 'Não foi possível entrar. Tente novamente.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1530] relative overflow-hidden px-6 py-12">
      {/* Background — gradient + blobs sutis */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1530] via-[#0F1E45] to-[#091333]" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.12)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10)_0%,transparent_60%)]" />
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
        className="relative w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 lg:gap-16 items-center"
      >
        {/* Brand */}
        <div className="text-slate-100 max-w-[520px]">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
              <Image
                src="/logo-iab-symbol.svg"
                alt="IAB"
                width={28}
                height={30}
                className="object-contain"
              />
            </div>
            <div>
              <div className="text-[0.95rem] font-bold tracking-tight text-white leading-tight">Instituto Alfa e Beto</div>
              <div className="text-[0.75rem] text-[#94A3B8]">Controle de Atividades</div>
            </div>
          </div>

          <h1 className="text-[2.5rem] lg:text-[2.875rem] font-black tracking-[-0.035em] leading-[1.05] mb-5">
            Organize.<br />
            <span className="text-[#3B82F6]">Execute.</span><br />
            Entregue.
          </h1>
          <p className="text-[#94A3B8] text-[0.95rem] leading-relaxed max-w-[420px] mb-10">
            Plataforma colaborativa para gerenciar projetos, registrar horas e acompanhar resultados da equipe.
          </p>

          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={13} className="text-[#3B82F6]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-semibold text-white">{f.title}</span>
                  <span className="text-[0.8125rem] text-[#94A3B8]">— {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="w-full lg:max-w-[440px]">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]">
            <h2 className="text-[1.5rem] font-bold text-white tracking-tight mb-1">Entrar na conta</h2>
            <p className="text-[#94A3B8] text-sm mb-7">Use suas credenciais corporativas</p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] px-4 py-3 rounded-lg text-[0.85rem] overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[0.78rem] font-semibold text-[#94A3B8] mb-2">E-mail</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className={cn(
                      'w-full pl-10 pr-3.5 h-11 rounded-lg',
                      'bg-white/[0.06] border border-white/10 text-slate-100 text-sm',
                      'outline-none transition-all duration-150',
                      'focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                      'placeholder:text-[#475569]'
                    )}
                    placeholder="seu@alfaebeto.org.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-[0.78rem] font-semibold text-[#94A3B8]">Senha</label>
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
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={cn(
                      'w-full pl-10 pr-11 h-11 rounded-lg',
                      'bg-white/[0.06] border border-white/10 text-slate-100 text-sm',
                      'outline-none transition-all duration-150',
                      'focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                      'placeholder:text-[#475569]'
                    )}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                className={cn(
                  'mt-3 w-full h-11 rounded-lg text-[0.9rem] font-semibold',
                  'flex items-center justify-center gap-2 border-0 cursor-pointer',
                  'transition-all duration-150',
                  loading
                    ? 'bg-[#2563EB]/50 text-white/70 cursor-not-allowed'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)]'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={msgIdx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        {LOADING_MSGS[msgIdx]}
                      </motion.span>
                    </AnimatePresence>
                  </>
                ) : (
                  <>Entrar <ArrowRight size={15} /></>
                )}
              </motion.button>
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
