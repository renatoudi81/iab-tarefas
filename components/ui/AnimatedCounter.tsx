'use client'
import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform, animate, motion } from 'framer-motion'

interface AnimatedCounterProps {
  /** Valor final do contador (número). Pra valores formatados, use `formatter` */
  value: number
  /** Duração da animação em segundos. Default: 1.2 */
  duration?: number
  /** Função opcional para formatar o número (ex: `(n) => n.toFixed(1) + 'h'`) */
  formatter?: (n: number) => string
  /** Casas decimais. Ignorado se formatter for fornecido. Default: 0 */
  decimals?: number
  /** Sufixo simples (ex: 'h', '%'). Ignorado se formatter for fornecido */
  suffix?: string
  /** Prefixo simples (ex: 'R$ '). Ignorado se formatter for fornecido */
  prefix?: string
  /** Classes Tailwind aplicadas ao span */
  className?: string
}

/**
 * Conta de 0 até `value` ao montar (ou quando `value` muda).
 * Usa useMotionValue + animate (fora do React render cycle) — zero re-renders.
 *
 * Skill design-taste-frontend: NÃO usa React.useState pra contínuas/animadas.
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
  formatter,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => {
    if (formatter) return formatter(latest)
    // Formato pt-BR: virgula decimal e ponto de milhar
    const formatted = latest.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return prefix + formatted + suffix
  })
  const previousValue = useRef(0)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: () => {
        previousValue.current = motionValue.get()
      },
    })
    return controls.stop
  }, [value, duration, motionValue])

  return <motion.span className={className}>{rounded}</motion.span>
}
