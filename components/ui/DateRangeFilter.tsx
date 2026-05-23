'use client'
import { cn } from '@/lib/utils'

/**
 * Filtro de período (data início → data fim) padronizado.
 *
 * Layout: pill compacta com 2 inputs nativos type=date separados por uma
 * seta âmbar. Sem labels textuais — o input nativo já mostra o placeholder
 * "dd/mm/aaaa" e o ícone de calendário do browser.
 *
 * Decisões:
 * - Usar input type=date nativo (sem libs externas)
 * - Browser respeita lang="pt-BR" do <html> e exibe DD/MM/AAAA no Chrome/Edge
 * - Separator visual com cor âmbar pra criar identidade do filtro
 *
 * Uso (em qualquer toolbar):
 *   <DateRangeFilter
 *     from={dateFrom}
 *     to={dateTo}
 *     onFromChange={setDateFrom}
 *     onToChange={setDateTo}
 *   />
 */

interface Props {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  className?: string
  /** Mínimo permitido (formato YYYY-MM-DD) — opcional */
  min?: string
  /** Máximo permitido (formato YYYY-MM-DD) — opcional */
  max?: string
}

export function DateRangeFilter({
  from, to, onFromChange, onToChange, className, min, max,
}: Props) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-[#E4E4E7] bg-white',
        'transition-colors',
        'focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]',
        className,
      )}
    >
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        min={min}
        max={to || max}
        className="h-7 w-[130px] border-0 bg-transparent px-1 text-[0.8rem] text-[#0F172A] tabular-nums outline-none focus:outline-none cursor-pointer"
        aria-label="Data inicial"
      />
      <span className="text-[#F59E0B] font-bold text-[0.78rem] select-none" aria-hidden>→</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        min={from || min}
        max={max}
        className="h-7 w-[130px] border-0 bg-transparent px-1 text-[0.8rem] text-[#0F172A] tabular-nums outline-none focus:outline-none cursor-pointer"
        aria-label="Data final"
      />
    </div>
  )
}
