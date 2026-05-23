'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

/**
 * Sistema de toasts global — padrão Linear/Vercel/Sonner.
 *
 * - Slide+fade do topo-direito via spring
 * - Auto-dismiss configurável (default 4s)
 * - Stack vertical (mais recente em cima)
 * - 4 variantes: success | error | info | warning
 *
 * Uso:
 *   const { toast } = useToast()
 *   toast.success('Tarefa criada')
 *   toast.error('Falhou', 'Detalhes opcionais')
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  /** Texto do botão (ex: "Atualizar agora", "Desfazer") */
  label: string
  /** Callback acionado ao clicar */
  onClick: () => void
}

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  duration?: number
  /** Ação opcional renderizada como botão dentro do toast */
  action?: ToastAction
}

interface ToastContextValue {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  toast: {
    success: (title: string, description?: string, duration?: number) => void
    error: (title: string, description?: string, duration?: number) => void
    info: (title: string, description?: string, duration?: number) => void
    warning: (title: string, description?: string, duration?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((data: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = data.duration ?? 4000
    setToasts((prev) => [{ id, ...data }, ...prev].slice(0, 5))
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  const value = useMemo<ToastContextValue>(() => ({
    toasts,
    push,
    dismiss,
    toast: {
      success: (title, description, duration) => push({ variant: 'success', title, description, duration }),
      error: (title, description, duration) => push({ variant: 'error', title, description, duration: duration ?? 6000 }),
      info: (title, description, duration) => push({ variant: 'info', title, description, duration }),
      warning: (title, description, duration) => push({ variant: 'warning', title, description, duration }),
    },
  }), [toasts, push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ElementType; iconColor: string; ring: string }> = {
  success: { icon: CheckCircle2, iconColor: 'text-[#16A34A]', ring: 'ring-[#16A34A]/15' },
  error:   { icon: AlertCircle,  iconColor: 'text-[#DC2626]', ring: 'ring-[#DC2626]/15' },
  info:    { icon: Info,         iconColor: 'text-[#2563EB]', ring: 'ring-[#2563EB]/15' },
  warning: { icon: AlertTriangle,iconColor: 'text-[#D97706]', ring: 'ring-[#D97706]/15' },
}

function ToastViewport() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[300] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))] pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const cfg = VARIANT_STYLES[t.variant]
          const Icon = cfg.icon
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, mass: 0.6 }}
              className={`pointer-events-auto flex gap-3 items-start bg-white rounded-xl border border-[#EDEEF1] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] px-4 py-3 ring-1 ${cfg.ring}`}
            >
              <Icon size={18} className={`${cfg.iconColor} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-[0.875rem] font-semibold text-[#0F172A] leading-tight">{t.title}</div>
                {t.description && (
                  <div className="text-[0.78rem] text-[#52525B] leading-snug mt-0.5">{t.description}</div>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                    className={`mt-2 inline-flex items-center text-[0.78rem] font-semibold px-2.5 py-1 rounded-md cursor-pointer border-0 transition-colors ${cfg.iconColor} hover:bg-[#F4F4F5]`}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[#A1A1AA] hover:text-[#0F172A] transition-colors flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md hover:bg-[#F4F4F5] cursor-pointer"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
