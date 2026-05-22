'use client'
import { motion } from 'framer-motion'

/**
 * Ilustrações SVG inline customizadas para empty states.
 *
 * Cada ilustração:
 * - 100x100 viewBox
 * - Paleta limitada: primary (#2563EB), surfaces neutras
 * - Stroke fino, traços geométricos
 * - Animação sutil de entrada (scale+fade)
 *
 * Variantes:
 *  - 'tasks'    → lista vazia (clipboard com check)
 *  - 'users'    → sem usuários (shield com person)
 *  - 'category' → sem categorias (tags empilhadas)
 *  - 'search'   → busca sem resultado (lupa com X)
 *  - 'calendar' → sem prazos (calendar com sparkle)
 */

type Variant = 'tasks' | 'users' | 'category' | 'search' | 'calendar'

interface Props {
  variant: Variant
  size?: number
}

export function EmptyIllustration({ variant, size = 96 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.6 }}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        {SHAPES[variant]}
      </svg>
    </motion.div>
  )
}

const PRIMARY = '#2563EB'
const PRIMARY_LIGHT = '#EFF6FF'
const SURFACE = '#F4F4F5'
const MUTED = '#A1A1AA'
const BORDER = '#E4E4E7'

const SHAPES: Record<Variant, React.ReactNode> = {
  tasks: (
    <>
      {/* fundo circular suave */}
      <circle cx="50" cy="52" r="38" fill={PRIMARY_LIGHT} />
      {/* clipboard */}
      <rect x="30" y="22" width="40" height="52" rx="6" fill="white" stroke={BORDER} strokeWidth="1.5" />
      <rect x="40" y="18" width="20" height="8" rx="2" fill="white" stroke={MUTED} strokeWidth="1.5" />
      {/* linhas */}
      <rect x="36" y="36" width="20" height="2" rx="1" fill={SURFACE} />
      <rect x="36" y="48" width="28" height="2" rx="1" fill={SURFACE} />
      <rect x="36" y="60" width="16" height="2" rx="1" fill={SURFACE} />
      {/* check */}
      <circle cx="68" cy="62" r="9" fill={PRIMARY} />
      <path d="M64 62l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  users: (
    <>
      <circle cx="50" cy="52" r="38" fill={PRIMARY_LIGHT} />
      {/* shield */}
      <path
        d="M50 22 L72 30 V52 C72 65 62 74 50 78 C38 74 28 65 28 52 V30 L50 22 Z"
        fill="white"
        stroke={BORDER}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* person */}
      <circle cx="50" cy="46" r="6" fill={PRIMARY} />
      <path d="M38 64 C38 56 44 52 50 52 C56 52 62 56 62 64" fill={PRIMARY} />
    </>
  ),
  category: (
    <>
      <circle cx="50" cy="52" r="38" fill={PRIMARY_LIGHT} />
      {/* tag 1 (back) */}
      <path
        d="M30 38 L52 38 L66 52 L52 66 L30 66 Z"
        fill="white"
        stroke={BORDER}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="52" r="3" fill={MUTED} />
      {/* tag 2 (front, primary) */}
      <path
        d="M38 30 L60 30 L74 44 L60 58 L38 58 Z"
        fill={PRIMARY}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="44" r="3" fill="white" />
    </>
  ),
  search: (
    <>
      <circle cx="50" cy="52" r="38" fill={PRIMARY_LIGHT} />
      {/* lupa */}
      <circle cx="45" cy="48" r="18" fill="white" stroke={BORDER} strokeWidth="1.5" />
      <line
        x1="58"
        y1="62"
        x2="72"
        y2="76"
        stroke={MUTED}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* X dentro da lupa */}
      <path
        d="M39 42 L51 54 M51 42 L39 54"
        stroke={PRIMARY}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </>
  ),
  calendar: (
    <>
      <circle cx="50" cy="52" r="38" fill={PRIMARY_LIGHT} />
      {/* calendar */}
      <rect x="26" y="28" width="48" height="46" rx="5" fill="white" stroke={BORDER} strokeWidth="1.5" />
      <rect x="26" y="28" width="48" height="10" rx="5" fill={PRIMARY} />
      {/* anéis */}
      <rect x="34" y="22" width="3" height="12" rx="1.5" fill={MUTED} />
      <rect x="63" y="22" width="3" height="12" rx="1.5" fill={MUTED} />
      {/* grid */}
      <rect x="33" y="46" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="42" y="46" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="51" y="46" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="60" y="46" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="33" y="55" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="42" y="55" width="6" height="5" rx="1" fill={PRIMARY} />
      <rect x="51" y="55" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="60" y="55" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="33" y="64" width="6" height="5" rx="1" fill={SURFACE} />
      <rect x="42" y="64" width="6" height="5" rx="1" fill={SURFACE} />
      {/* sparkle */}
      <path
        d="M76 36 L78 40 L82 42 L78 44 L76 48 L74 44 L70 42 L74 40 Z"
        fill={PRIMARY}
      />
    </>
  ),
}
