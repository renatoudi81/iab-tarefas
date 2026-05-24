/**
 * Cor derivada do nome da categoria via hash determinístico.
 *
 * - Mesma categoria → sempre a mesma cor (sem flicker entre re-renders)
 * - Sem persistência: nada gravado no Firestore, nada para migrar
 * - Categoria renomeada → ganha nova cor automaticamente
 *
 * Paleta calibrada com cores saturadas mas legíveis sobre texto branco
 * (bg cheio) E sobre texto colorido (bg 8% opacity).
 */

// Paleta calibrada com versões -700/-800 das cores Tailwind:
// garante contraste 4.5:1 do texto sobre o bg 12% opacity (acessibilidade WCAG AA).
const PALETTE = [
  '#1D4ED8', // blue-700
  '#15803D', // green-700
  '#B45309', // amber-700
  '#6D28D9', // violet-700
  '#BE185D', // pink-700
  '#0369A1', // sky-700
  '#0F766E', // teal-700
  '#4338CA', // indigo-700
  '#C2410C', // orange-700
  '#155E75', // cyan-800
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0 // converte para int32
  }
  return Math.abs(h)
}

export interface CategoryColor {
  hex: string    // cor sólida (border, dot, texto sobre bg claro)
  bg: string     // bg 12% opacity (pill com texto colorido sobre fundo claro)
  bgSolid: string // bg cheio (pill com texto branco)
}

export function getCategoryColor(name: string | null | undefined): CategoryColor {
  // Fallback neutro para nome vazio/nulo
  if (!name || !name.trim()) {
    return { hex: '#71717A', bg: '#F4F4F5', bgSolid: '#71717A' }
  }
  const idx = hashString(name.trim().toLowerCase()) % PALETTE.length
  const hex = PALETTE[idx]
  return {
    hex,
    // hex + alpha hex (1F = ~12% opacity); usado em pills claros
    bg: hex + '1F',
    bgSolid: hex,
  }
}
