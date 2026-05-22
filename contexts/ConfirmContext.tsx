'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Confirm dialog premium — substituto do window.confirm() nativo.
 *
 * - Promise-based API: await confirm({ title, ... })
 * - Variantes: 'destructive' (vermelho) | 'default' (azul)
 * - Spring scale-in via framer-motion
 * - Click no backdrop OU tecla ESC = cancelar
 * - Foco automático no botão de confirmação
 *
 * Uso:
 *   const { confirm } = useConfirm()
 *   const ok = await confirm({
 *     title: 'Excluir tarefa?',
 *     description: 'Esta ação não pode ser desfeita.',
 *     confirmText: 'Excluir',
 *     variant: 'destructive',
 *   })
 *   if (ok) await deleteTask(id)
 */

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '' })
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve })
    })
  }, [])

  const handleClose = useCallback((value: boolean) => {
    state.resolve?.(value)
    setState((s) => ({ ...s, open: false, resolve: undefined }))
  }, [state])

  // ESC para cancelar
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose(false)
    if (e.key === 'Enter') handleClose(true)
  }, [handleClose])

  const isDestructive = state.variant === 'destructive'

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state.open && (
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
              onClick={() => handleClose(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.7 }}
              className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] border border-[#EDEEF1] overflow-hidden"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby={state.description ? 'confirm-desc' : undefined}
            >
              {/* Close X */}
              <button
                onClick={() => handleClose(false)}
                className="absolute top-3 right-3 p-1.5 rounded-md text-[#A1A1AA] hover:text-[#0F172A] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>

              <div className="px-6 pt-6 pb-5">
                <div className="flex gap-4 items-start">
                  {/* Ícone */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isDestructive
                        ? 'bg-[#FEF2F2] text-[#DC2626]'
                        : 'bg-[#EFF6FF] text-[#2563EB]'
                    }`}
                  >
                    <AlertTriangle size={18} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <h2
                      id="confirm-title"
                      className="text-[1.0625rem] font-semibold text-[#0F172A] leading-snug tracking-tight"
                    >
                      {state.title}
                    </h2>
                    {state.description && (
                      <p
                        id="confirm-desc"
                        className="mt-1.5 text-[0.875rem] text-[#52525B] leading-relaxed"
                      >
                        {state.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[#FAFAFA] border-t border-[#F4F4F5]">
                <button
                  onClick={() => handleClose(false)}
                  className="h-9 px-4 text-[0.875rem] font-medium text-[#52525B] bg-white border border-[#E4E4E7] rounded-lg hover:bg-[#F4F4F5] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {state.cancelText || 'Cancelar'}
                </button>
                <button
                  ref={confirmBtnRef}
                  autoFocus
                  onClick={() => handleClose(true)}
                  className={`h-9 px-4 text-[0.875rem] font-semibold text-white rounded-lg active:scale-[0.98] transition-all cursor-pointer ${
                    isDestructive
                      ? 'bg-[#DC2626] hover:bg-[#B91C1C] shadow-[0_4px_14px_-4px_rgba(220,38,38,0.45)]'
                      : 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)]'
                  }`}
                >
                  {state.confirmText || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx
}
