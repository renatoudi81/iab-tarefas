/**
 * PrintDashboard — versão para PDF/papel do Dashboard.
 *
 * Mostra os MESMOS graficos da tela (Recharts: AreaChart de criadas/concluidas
 * e BarChart de horas), com dimensoes fixas em pixels — assim renderiza
 * mesmo dentro de um container `display:none` (que vira `display:block`
 * via @media print). Sem ResponsiveContainer (que precisa medir o DOM e
 * falha em containers ocultos).
 *
 * Compartilha o CSS `.print-report` (globals.css) — basta usar a mesma
 * classe; o @media print esconde a tela e mostra esse componente.
 */
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'
import { formatDateBR, formatNumberBR } from '@/types'
import type { Task, User } from '@/types'

// Largura fixa pra renderizar em A4 retrato (190mm de conteudo util com
// margens 10mm). 720px @ 96dpi = ~190mm. Altura segue o padrao da tela.
const CHART_WIDTH = 720
const CHART_HEIGHT = 220

interface UserLite { id: string; nome: string }

interface UpcomingItem { id: string; titulo: string; data_prazo: string | null; status: string }
interface OverdueItem { task: Pick<Task, 'titulo' | 'data_prazo' | 'responsavel_id'>; diasAtraso: number }

interface PrintDashboardProps {
  dateFrom: string
  dateTo: string
  filterLabel: string // ex.: "Todos os usuários" ou nome
  projectLabel: string // ex.: "Todos os projetos" ou nome
  metrics: {
    tasksInPeriod: number
    hoursInPeriod: string
    delayedTasks: number
    productivity: string
    donePct: number
    doneCount: number
    velocity: number
    statusCount: Record<string, number>
    upcoming: UpcomingItem[]
    topOverdue: OverdueItem[]
  }
  chartData: { label: string; Criadas: number; Concluídas: number; Horas: number }[]
  users: UserLite[] | User[]
}

const STATUS_ORDER = ['Atrasada', 'Em andamento', 'Aguardando', 'Pendente', 'Concluída'] as const
const STATUS_COLOR: Record<string, string> = {
  'Atrasada': '#DC2626',
  'Em andamento': '#2563EB',
  'Aguardando': '#F59E0B',
  'Pendente': '#71717A',
  'Concluída': '#15803D',
}

export function PrintDashboard({
  dateFrom, dateTo, filterLabel, projectLabel, metrics, chartData, users,
}: PrintDashboardProps) {
  const generatedAt = new Date()
  const periodLabel = `${formatDateBR(dateFrom)} a ${formatDateBR(dateTo)}`
  const totalTasksPeriodo = metrics.tasksInPeriod

  // Resolve nome do responsavel por id (pra Top atrasadas)
  const userNome = (id?: string | null) => {
    if (!id) return '—'
    const u = users.find((x) => x.id === id)
    return u?.nome || '—'
  }

  return (
    <div className="print-report">
      {/* Cabecalho */}
      <header className="pr-header">
        <div>
          <h1>Dashboard — Visão Geral</h1>
          <p className="pr-sub">Instituto Alfa e Beto · Produtividade e indicadores do período</p>
        </div>
        <div className="pr-meta">
          <div><strong>Período:</strong> {periodLabel}</div>
          <div><strong>Projeto:</strong> {projectLabel}</div>
          <div><strong>Usuário:</strong> {filterLabel}</div>
          <div>
            <strong>Gerado em:</strong>{' '}
            {generatedAt.toLocaleDateString('pt-BR')}{' '}
            {generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <table className="pr-kpis">
        <tbody>
          <tr>
            <td>
              <div className="pr-kpi-label">Tarefas no período</div>
              <div className="pr-kpi-value">{metrics.tasksInPeriod}</div>
              <div className="pr-kpi-hint">criadas no intervalo</div>
            </td>
            <td>
              <div className="pr-kpi-label">Horas registradas</div>
              <div className="pr-kpi-value">{metrics.hoursInPeriod}</div>
              <div className="pr-kpi-hint">tempo total lançado</div>
            </td>
            <td>
              <div className="pr-kpi-label">Velocidade</div>
              <div className="pr-kpi-value">{formatNumberBR(metrics.velocity)}</div>
              <div className="pr-kpi-hint">concluídas / semana</div>
            </td>
            <td>
              <div className="pr-kpi-label">Tarefas atrasadas</div>
              <div className="pr-kpi-value">{metrics.delayedTasks}</div>
              <div className="pr-kpi-hint">{metrics.delayedTasks === 0 ? 'nenhuma' : 'requer atenção'}</div>
            </td>
            <td>
              <div className="pr-kpi-label">Produtividade</div>
              <div className="pr-kpi-value">{metrics.productivity}</div>
              <div className="pr-kpi-hint">{metrics.doneCount} de {metrics.tasksInPeriod} concluídas</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Distribuicao por status */}
      {totalTasksPeriodo > 0 && (
        <section className="pr-section">
          <h2>Distribuição por status</h2>
          <DistroBars
            items={STATUS_ORDER.map((s) => ({
              label: s,
              value: metrics.statusCount[s] || 0,
              color: STATUS_COLOR[s],
            })).filter((s) => s.value > 0)}
            total={totalTasksPeriodo}
          />
        </section>
      )}

      {/* Produtividade no periodo — MESMO grafico da tela (AreaChart) */}
      {chartData.length > 0 && (
        <section className="pr-section">
          <h2>Produtividade no período</h2>
          <p className="pr-section-sub">Tarefas criadas vs concluídas por semana (Dom–Sáb)</p>
          <div className="pr-chart">
            <AreaChart width={CHART_WIDTH} height={CHART_HEIGHT} data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="pr-grad-concluidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pr-grad-criadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Area isAnimationActive={false} type="monotone" dataKey="Concluídas" stroke="#16A34A" strokeWidth={2} fill="url(#pr-grad-concluidas)" dot={{ r: 2, fill: '#16A34A', strokeWidth: 0 }} />
              <Area isAnimationActive={false} type="monotone" dataKey="Criadas" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 2" fill="url(#pr-grad-criadas)" dot={{ r: 2, fill: '#2563EB', strokeWidth: 0 }} />
            </AreaChart>
            <div className="pr-chart-legend">
              <span><span className="pr-dot" style={{ background: '#16A34A' }} /> Concluídas</span>
              <span><span className="pr-dot" style={{ background: '#2563EB' }} /> Criadas</span>
            </div>
          </div>
        </section>
      )}

      {/* Horas trabalhadas — MESMO grafico da tela (BarChart) */}
      {chartData.some((b) => b.Horas > 0) && (
        <section className="pr-section">
          <h2>Horas trabalhadas</h2>
          <p className="pr-section-sub">Por semana (Dom–Sáb)</p>
          <div className="pr-chart">
            <BarChart width={CHART_WIDTH} height={CHART_HEIGHT} data={chartData} margin={{ top: 22, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} />
              <Bar isAnimationActive={false} dataKey="Horas" fill="#7C3AED" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={28}>
                <LabelList
                  dataKey="Horas"
                  position="top"
                  formatter={(value) => {
                    const n = Number(value)
                    return n > 0 ? `${formatNumberBR(n)}h` : ''
                  }}
                  fill="#0F172A"
                  fontSize={10}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </div>
        </section>
      )}

      {/* Proximos vencimentos */}
      {metrics.upcoming.length > 0 && (
        <section className="pr-section">
          <h2>Próximos vencimentos</h2>
          <p className="pr-section-sub">Tarefas com prazo nos próximos 7 dias</p>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Status</th>
                <th className="num">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {metrics.upcoming.map((t) => (
                <tr key={t.id}>
                  <td>{t.titulo}</td>
                  <td>{t.status}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {t.data_prazo ? formatDateBR(t.data_prazo) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Atencao urgente */}
      {metrics.topOverdue.length > 0 && (
        <section className="pr-section">
          <h2>Atenção urgente</h2>
          <p className="pr-section-sub">Top tarefas atrasadas (mais antigas primeiro)</p>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th className="num">Prazo</th>
                <th className="num">Dias em atraso</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topOverdue.map((o, i) => (
                <tr key={i}>
                  <td>{o.task.titulo}</td>
                  <td>{userNome(o.task.responsavel_id)}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {o.task.data_prazo ? formatDateBR(o.task.data_prazo) : '—'}
                  </td>
                  <td className="num" style={{ color: '#B91C1C', fontWeight: 700 }}>
                    {o.diasAtraso}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

/* ─────────────── helpers visuais ─────────────── */

/** Barras horizontais empilhadas (proporção entre categorias) */
function DistroBars({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return null
  return (
    <div className="pr-distro">
      <div className="pr-distro-bar">
        {items.map((it) => {
          const pct = (it.value / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={it.label}
              className="pr-distro-seg"
              style={{ width: `${pct}%`, background: it.color }}
              title={`${it.label}: ${it.value}`}
            />
          )
        })}
      </div>
      <div className="pr-distro-legend">
        {items.map((it) => {
          const pct = total > 0 ? Math.round((it.value / total) * 100) : 0
          return (
            <div key={it.label} className="pr-distro-item">
              <span className="pr-distro-dot" style={{ background: it.color }} />
              <strong>{it.label}</strong>
              <span>{it.value} ({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

