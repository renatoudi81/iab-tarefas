'use client'
import { MotionConfig } from 'framer-motion'

/**
 * Wrapper que respeita `prefers-reduced-motion` em TODAS as animações
 * framer-motion do app. Reduz movimento para usuários com a preferência
 * de acessibilidade ativa (WCAG 2.3.3 Animation from Interactions).
 *
 * - reducedMotion="user" → segue a preferência do SO/navegador
 * - Animações permanecem para usuários que não sinalizam preferência
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
