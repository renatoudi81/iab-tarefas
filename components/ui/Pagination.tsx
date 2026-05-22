'use client'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente de paginação reutilizável.
 *
 * Mostra: contador "X-Y de Z", botões prev/next + primeiros/últimos
 * e até 5 números de página com elipses inteligentes.
 *
 * Uso:
 *   <Pagination
 *     page={page}
 *     pageSize={20}
 *     total={filtered.length}
 *     onPageChange={setPage}
 *   />
 */

interface Props {
  page: number              // 1-indexed
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Rótulo do item ('tarefas', 'usuários', etc) — usado no contador */
  itemLabel?: string
  className?: string
}

export function Pagination({ page, pageSize, total, onPageChange, itemLabel = 'itens', className }: Props) {
  if (total === 0) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

  const goto = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages))

  const numbers = computeVisibleNumbers(safePage, totalPages)

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-4 py-3 border-t border-[#F4F4F5] bg-white',
      className,
    )}>
      {/* Contador */}
      <div className="text-[0.78rem] text-[#71717A] tabular-nums">
        <span className="font-medium text-[#3F3F46]">{start}</span>
        <span> – </span>
        <span className="font-medium text-[#3F3F46]">{end}</span>
        <span> de </span>
        <span className="font-medium text-[#3F3F46]">{total}</span>
        <span> {itemLabel}</span>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-0.5">
        <NavBtn label="Primeira página" onClick={() => goto(1)} disabled={safePage === 1}>
          <ChevronsLeft size={14} />
        </NavBtn>
        <NavBtn label="Página anterior" onClick={() => goto(safePage - 1)} disabled={safePage === 1}>
          <ChevronLeft size={14} />
        </NavBtn>

        {numbers.map((n, i) =>
          n === '…' ? (
            <span key={`gap-${i}`} className="px-1.5 text-[0.78rem] text-[#A1A1AA] select-none">…</span>
          ) : (
            <button
              key={n}
              onClick={() => goto(n)}
              className={cn(
                'h-8 min-w-[32px] px-2 inline-flex items-center justify-center rounded-md text-[0.78rem] font-medium transition-colors cursor-pointer border tabular-nums',
                n === safePage
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-[0_4px_10px_-4px_rgba(37,99,235,0.45)]'
                  : 'bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#F4F4F5] hover:text-[#0F172A]',
              )}
            >
              {n}
            </button>
          ),
        )}

        <NavBtn label="Próxima página" onClick={() => goto(safePage + 1)} disabled={safePage === totalPages}>
          <ChevronRight size={14} />
        </NavBtn>
        <NavBtn label="Última página" onClick={() => goto(totalPages)} disabled={safePage === totalPages}>
          <ChevronsRight size={14} />
        </NavBtn>
      </div>
    </div>
  )
}

function NavBtn({ children, onClick, disabled, label }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md border border-[#E4E4E7] bg-white text-[#52525B] transition-colors',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#F4F4F5] hover:text-[#0F172A] cursor-pointer',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Decide quais números de página exibir, com elipses.
 * Sempre mostra: primeira, última, atual e ±1.
 *
 * Exemplos:
 *  totalPages=3, page=2  → [1, 2, 3]
 *  totalPages=10, page=1 → [1, 2, 3, '…', 10]
 *  totalPages=10, page=5 → [1, '…', 4, 5, 6, '…', 10]
 *  totalPages=10, page=10→ [1, '…', 8, 9, 10]
 */
function computeVisibleNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const out: (number | '…')[] = [1]

  const left = Math.max(2, page - 1)
  const right = Math.min(totalPages - 1, page + 1)

  if (left > 2) out.push('…')
  for (let i = left; i <= right; i++) out.push(i)
  if (right < totalPages - 1) out.push('…')

  out.push(totalPages)
  return out
}
