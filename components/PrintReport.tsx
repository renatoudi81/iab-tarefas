/**
 * PrintReport — relatório otimizado para PDF/papel.
 *
 * Renderiza um layout LINEAR, sem grids complexos, sem Recharts, sem
 * framer-motion. Usa apenas HTML + barras CSS simples para visualizar
 * proporções. O objetivo é caber TUDO em 1-2 páginas A4 com leitura
 * limpa, parecido com um relatório executivo de PDF.
 *
 * Modo de uso:
 *   <div className="hidden print:block">
 *     <PrintReport stats={stats} users={users} dateFrom={...} ... />
 *   </div>
 *
 * O conteúdo da tela (gráficos Recharts etc.) é escondido em print
 * via `.print:hidden` no Tailwind v4.
 */
import { formatDateBR, formatMinutes, weekdayBR } from '@/types'
import type { Status, Prioridade } from '@/types'

interface UserLite {
  id: string
  nome: string
}

interface PrintReportProps {
  /** Intervalo efetivo computado pelas tarefas/lançamentos analisados.
   *  Mostrado sempre, em formato DD/MM/AAAA → DD/MM/AAAA. */
  effectiveFrom: string
  effectiveTo: string
  /** Se true, o intervalo veio do filtro manual; senão é o range dos dados */
  isFiltered: boolean
  stats: {
    byStatus: { name: Status; value: number; color: string }[]
    byPriority: { name: Prioridade; value: number; color: string }[]
    byCategory: { name: string; total: number; horas: number }[]
    byProject: { name: string; total: number; done: number; horas: number }[]
    byDay: { data: string; totalMin: number; items: { tarefa_id: string; titulo: string; projeto: string; minutos: number }[] }[]
    byChannel: { name: string; total: number }[]
    byPublico: { name: string; total: number }[]
    byUser: {
      user: { id: string; nome: string }
      total: number
      done: number
      hours: number
      pct: number
    }[]
    topAtrasadas: { task: { titulo: string; data_prazo?: string | null; responsavel_id?: string | null }; diasAtraso: number }[]
    orphan: { id: string; titulo: string; categoria: string; status: string; data_prazo?: string | null }[]
    leadTimeMedio: number
    pctAderencia: number
    totalHoras: number
    concluidas: number
    pctConcluidas: number
    pendentes: number
    atrasadas: number
    heatmapData: { label: string; value: number; intensity: number }[]
    plannedVsActual: { name: string; Estimado: number; Gasto: number }[]
  }
  users: UserLite[]
  totalTasks: number
  dateFrom: string
  dateTo: string
  filterLabel: string // "Todos os usuários" ou nome do filtrado
}

export function PrintReport({
  stats, users, totalTasks, dateFrom, dateTo, effectiveFrom, effectiveTo, isFiltered, filterLabel,
}: PrintReportProps) {
  const generatedAt = new Date()
  // Intervalo: sempre concreto. Se o usuário filtrou manualmente, mostra
  // o filtro escolhido; caso contrário, mostra o range natural dos dados.
  const fromLabel = effectiveFrom ? formatDateBR(effectiveFrom) : '—'
  const toLabel = effectiveTo ? formatDateBR(effectiveTo) : '—'
  const periodLabel = `${fromLabel} a ${toLabel}`
  const periodSubLabel = isFiltered
    ? '(filtro aplicado pelo usuário)'
    : '(intervalo total dos dados analisados)'
  // Evita warning de unused (mantidos por compat de assinatura)
  void dateFrom; void dateTo;

  return (
    <div className="print-report">
      {/* Cabeçalho */}
      <header className="pr-header">
        <div>
          <h1>Controle de Atividades</h1>
          <p className="pr-sub">Instituto Alfa e Beto · Relatório de tarefas</p>
        </div>
        <div className="pr-meta">
          <div><strong>Período:</strong> {periodLabel}</div>
          <div className="pr-meta-sub">{periodSubLabel}</div>
          <div><strong>Usuário:</strong> {filterLabel}</div>
          <div><strong>Gerado em:</strong> {generatedAt.toLocaleDateString('pt-BR')} {generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </header>

      {/* KPIs em 1 linha (tabela pra alinhamento robusto em print) */}
      <table className="pr-kpis">
        <tbody>
          <tr>
            <td>
              <div className="pr-kpi-label">Total de tarefas</div>
              <div className="pr-kpi-value">{totalTasks}</div>
              <div className="pr-kpi-hint">{stats.pendentes} pendentes · {stats.atrasadas} atrasadas</div>
            </td>
            <td>
              <div className="pr-kpi-label">Concluídas</div>
              <div className="pr-kpi-value">{stats.concluidas}</div>
              <div className="pr-kpi-hint">{stats.pctConcluidas}% do total</div>
            </td>
            <td>
              <div className="pr-kpi-label">Horas registradas</div>
              <div className="pr-kpi-value">{stats.totalHoras}h</div>
              <div className="pr-kpi-hint">Tempo investido</div>
            </td>
            <td>
              <div className="pr-kpi-label">Aderência</div>
              <div className="pr-kpi-value">{stats.pctAderencia}%</div>
              <div className="pr-kpi-hint">Dentro do estimado</div>
            </td>
            <td>
              <div className="pr-kpi-label">Lead time médio</div>
              <div className="pr-kpi-value">{stats.leadTimeMedio}</div>
              <div className="pr-kpi-hint">dias por tarefa</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Distribuição por status */}
      {stats.byStatus.length > 0 && (
        <section className="pr-section">
          <h2>Distribuição por status</h2>
          <DistroBars items={stats.byStatus.map(s => ({ label: s.name, value: s.value, color: s.color }))} total={totalTasks} />
        </section>
      )}

      {/* Distribuição por prioridade */}
      {stats.byPriority.length > 0 && (
        <section className="pr-section">
          <h2>Distribuição por prioridade</h2>
          <DistroBars items={stats.byPriority.map(p => ({ label: p.name, value: p.value, color: p.color }))} total={totalTasks} />
        </section>
      )}

      {/* Projetos (tabela) */}
      {stats.byProject.length > 0 && (
        <section className="pr-section">
          <h2>Tarefas por projeto</h2>
          <table className="pr-table">
            <thead>
              <tr><th>Projeto</th><th className="num">Tarefas</th><th className="num">Concluídas</th><th className="num">Horas</th></tr>
            </thead>
            <tbody>
              {stats.byProject.map(p => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="num">{p.total}</td>
                  <td className="num">{p.done}</td>
                  <td className="num">{p.horas}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Tarefas executadas por dia (timesheet) */}
      {stats.byDay.length > 0 && (
        <section className="pr-section">
          <h2>Tarefas executadas por dia</h2>
          <table className="pr-table">
            <thead>
              <tr><th>Projeto</th><th>Chamado</th><th className="num">Tempo</th></tr>
            </thead>
            {stats.byDay.map(dia => (
              <tbody key={dia.data}>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 700, background: '#F4F4F5' }}>
                    {formatDateBR(dia.data)} · {weekdayBR(dia.data)}
                  </td>
                  <td className="num" style={{ fontWeight: 700, background: '#F4F4F5' }}>{formatMinutes(dia.totalMin)}</td>
                </tr>
                {dia.items.map(r => (
                  <tr key={r.tarefa_id}>
                    <td>{r.projeto}</td>
                    <td>{r.titulo}</td>
                    <td className="num">{formatMinutes(r.minutos)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
      )}

      {/* Origem dos chamados */}
      {(stats.byChannel.length > 0 || stats.byPublico.length > 0) && (
        <section className="pr-section">
          <h2>Origem dos chamados</h2>
          <table className="pr-table">
            <thead>
              <tr><th>Tipo</th><th>Valor</th><th className="num">Qtd</th></tr>
            </thead>
            <tbody>
              {stats.byPublico.map(p => (
                <tr key={`pub-${p.name}`}><td>Público</td><td>{p.name}</td><td className="num">{p.total}</td></tr>
              ))}
              {stats.byChannel.map(c => (
                <tr key={`ch-${c.name}`}><td>Canal</td><td>{c.name}</td><td className="num">{c.total}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Categorias (tabela) */}
      {stats.byCategory.length > 0 && (
        <section className="pr-section">
          <h2>Tarefas por categoria</h2>
          <table className="pr-table">
            <thead>
              <tr><th>Categoria</th><th className="num">Tarefas</th><th className="num">Horas</th></tr>
            </thead>
            <tbody>
              {stats.byCategory.map(c => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="num">{c.total}</td>
                  <td className="num">{c.horas}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Produtividade por usuário */}
      {stats.byUser.length > 0 && (
        <section className="pr-section">
          <h2>Produtividade por usuário</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th className="num">Tarefas</th>
                <th className="num">Concluídas</th>
                <th className="num">Conclusão</th>
                <th className="num">Horas</th>
              </tr>
            </thead>
            <tbody>
              {stats.byUser.map(u => (
                <tr key={u.user.id}>
                  <td>{u.user.nome}</td>
                  <td className="num">{u.total}</td>
                  <td className="num">{u.done}</td>
                  <td className="num">{u.pct}%</td>
                  <td className="num">{u.hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Previsto vs Realizado por usuário */}
      {stats.plannedVsActual.length > 0 && (
        <section className="pr-section">
          <h2>Estimado vs Realizado (horas)</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th className="num">Estimado</th>
                <th className="num">Gasto</th>
                <th className="num">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {stats.plannedVsActual.map(p => {
                const diff = p.Gasto - p.Estimado
                return (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="num">{p.Estimado}h</td>
                    <td className="num">{p.Gasto}h</td>
                    <td className="num" style={{ color: diff > 0 ? '#B91C1C' : '#15803D' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}h
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Tarefas atrasadas */}
      {stats.topAtrasadas.length > 0 && (
        <section className="pr-section">
          <h2>Tarefas mais atrasadas</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th className="num">Prazo</th>
                <th className="num">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {stats.topAtrasadas.map(({ task, diasAtraso }, i) => {
                const resp = users.find(u => u.id === task.responsavel_id)
                return (
                  <tr key={i}>
                    <td>{task.titulo}</td>
                    <td>{resp?.nome || '—'}</td>
                    <td className="num">{task.data_prazo ? formatDateBR(task.data_prazo) : '—'}</td>
                    <td className="num" style={{ color: '#B91C1C', fontWeight: 700 }}>{diasAtraso} dias</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Tarefas órfãs */}
      {stats.orphan.length > 0 && (
        <section className="pr-section">
          <h2>Tarefas sem responsável ({stats.orphan.length})</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Categoria</th>
                <th>Status</th>
                <th className="num">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {stats.orphan.slice(0, 10).map(t => (
                <tr key={t.id}>
                  <td>{t.titulo}</td>
                  <td>{t.categoria || '—'}</td>
                  <td>{t.status}</td>
                  <td className="num">{t.data_prazo ? formatDateBR(t.data_prazo) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.orphan.length > 10 && (
            <p className="pr-note">+ {stats.orphan.length - 10} outras tarefas órfãs.</p>
          )}
        </section>
      )}

      {/* Atividade por dia da semana (textual) */}
      {stats.heatmapData.some(d => d.value > 0) && (
        <section className="pr-section">
          <h2>Atividade por dia da semana ({fromLabel} a {toLabel})</h2>
          <table className="pr-table">
            <thead>
              <tr>
                {stats.heatmapData.map(d => <th key={d.label} className="num">{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                {stats.heatmapData.map(d => (
                  <td key={d.label} className="num" style={{ fontWeight: d.value > 0 ? 700 : 400 }}>
                    {d.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <footer className="pr-footer">
        Relatório gerado automaticamente · iab-tarefas.vercel.app
      </footer>
    </div>
  )
}

/* ─── DistroBars ─────────────────────────────────────────────────────
   Barras horizontais empilhadas em uma única linha. Cada item ocupa
   um % proporcional do total. Mostra label, valor e %.
*/
function DistroBars({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="pr-distro">
      <div className="pr-distro-bar">
        {items.map(it => (
          <span
            key={it.label}
            className="pr-distro-seg"
            style={{ width: `${(it.value / Math.max(1, total)) * 100}%`, background: it.color }}
            title={`${it.label}: ${it.value}`}
          />
        ))}
      </div>
      <ul className="pr-distro-legend">
        {items.map(it => (
          <li key={it.label}>
            <span className="pr-distro-dot" style={{ background: it.color }} />
            <span className="pr-distro-label">{it.label}</span>
            <span className="pr-distro-value">{it.value}</span>
            <span className="pr-distro-pct">({Math.round((it.value / Math.max(1, total)) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
