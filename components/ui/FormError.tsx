'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

/**
 * Caixa de erro inline para formulários.
 * Fade-in + slide quando aparece, fade-out quando some.
 *
 * Uso:
 *   <FormError message={saveError} />
 *
 * Aparece só quando `message` for truthy.
 */

interface Props {
  message?: string | null
  className?: string
}

export function FormError({ message, className = '' }: Props) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C]">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span className="text-[0.8125rem] leading-relaxed">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
