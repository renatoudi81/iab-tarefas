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

const PALETTE = [
  '#2563EB', // blue
  '#16A34A', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#0EA5E9', // sky
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F97316', // orange
  '#0891B2', // cyan
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
