'use client'
import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/lib/firebase-client'
import { Mail, Loader2, ArrowRight, MailCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import AuthLayout from '@/components/auth/AuthLayout'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const startResendCooldown = () => {
    setResendCooldown(30)
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(timer); return 0 }
        return s - 1
      })
    }, 1000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError('')

    const trimmed = email.trim().toLowerCase()
    try {
      await sendPasswordResetEmail(auth, trimmed, {
        // `url` + `handleCodeInApp: true` faz com que o link do e-mail
        // abra direto a nossa página /redefinir-senha (com a UI bonita),
        // em vez da página genérica do Firebase em xxx.firebaseapp.com.
        // O Firebase anexa ?mode=resetPassword&oobCode=... automaticamente.
        url: `${window.location.origin}/redefinir-senha`,
        handleCodeInApp: true,
      })
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      // PRIVACIDADE: NÃO revelamos se o e-mail existe (user enumeration).
      // Só mostramos erro real se for problema técnico claro.
      if (code === 'auth/invalid-email') {
        setError('E-mail inválido.')
        setLoading(false)
        return
      }
      if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos.')
        setLoading(false)
        return
      }
      // user-not-found, network errors etc: tratamos como sucesso silencioso
    }

    setSent(true)
    setLoading(false)
    startResendCooldown()
  }

  if (sent) {
    return (
      <AuthLayout
        title="Verifique seu e-mail"
        backTo={{ href: '/login', label: 'Voltar ao login' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[#16A34A]/15 flex items-center justify-center mb-5">
            <MailCheck size={28} className="text-[#22C55E]" />
          </div>

          <p className="text-[#CBD5E1] text-[0.92rem] leading-relaxed mb-2">
            Se existir uma conta vinculada a este e-mail,
            enviamos um link para redefinir a senha.
          </p>
          <div className="w-full mb-6 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/10">
            <p className="text-[0.82rem] font-mono text-white text-center truncate" title={email}>
              {email}
            </p>
          </div>

          <div className="w-full bg-white/[0.04] border border-white/10 rounded-lg p-4 text-left mb-6">
            <p className="text-[0.78rem] font-semibold text-[#94A3B8] mb-2">Não recebeu o e-mail?</p>
            <ul className="text-[0.78rem] text-[#94A3B8] space-y-1.5 list-disc pl-4">
              <li>Confira a pasta de spam ou lixo eletrônico</li>
              <li>Confira se digitou o e-mail correto</li>
              <li>O link expira em 1 hora</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={(e) => { setSent(false); handleSubmit(e as unknown as React.FormEvent) }}
            className={cn(
              'text-[0.85rem] font-medium transition-colors',
              resendCooldown > 0
                ? 'text-[#475569] cursor-not-allowed'
                : 'text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer'
            )}
          >
            {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail'}
          </button>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      subtitle="Digite seu e-mail para receber o link de redefinição."
      backTo={{ href: '/login', label: 'Voltar ao login' }}
    >
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
          <label htmlFor="email" className="block text-[0.78rem] font-semibold text-[#94A3B8] mb-2">
            E-mail
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              autoFocus
              className={cn(
                'w-full pl-10 pr-3.5 h-11 rounded-lg',
                'bg-white/[0.06] border border-white/10 text-slate-100 text-sm',
                'outline-none transition-all duration-150',
                'focus:border-[#3B82F6]/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
                'placeholder:text-[#475569]'
              )}
              placeholder="seu@alfaebeto.org.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading || !email.trim()}
          whileHover={!loading && email.trim() ? { scale: 1.01 } : {}}
          whileTap={!loading && email.trim() ? { scale: 0.99 } : {}}
          className={cn(
            'mt-3 w-full h-11 rounded-lg text-[0.9rem] font-semibold',
            'flex items-center justify-center gap-2 border-0 cursor-pointer',
            'transition-all duration-150',
            loading || !email.trim()
              ? 'bg-[#2563EB]/40 text-white/60 cursor-not-allowed'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)]'
          )}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>Enviar link <ArrowRight size={15} /></>
          )}
        </motion.button>
      </form>
    </AuthLayout>
  )
}
