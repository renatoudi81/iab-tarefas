'use client'
import { motion, useScroll, useSpring } from 'framer-motion'

/**
 * Barra fina no topo da tela mostrando progresso do scroll vertical.
 * Padrão SaaS premium (Linear, Vercel, Stripe Docs).
 *
 * - useScroll: tracking nativo do framer-motion (zero re-renders)
 * - useSpring: suaviza a animação (não pula direto)
 * - fixed top-0 z-100 — fica sobre tudo, abaixo do grain overlay
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[99] origin-left bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#2563EB]"
      style={{ scaleX }}
    />
  )
}
