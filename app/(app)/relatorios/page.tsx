'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { STATUSES, STATUS_COLORS, PRIORITY_COLORS, formatMinutes, formatDateBR } from '@/types'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { ChartDataTable } from '@/components/ui/ChartDataTable'
import { PrintReport } from '@/components/PrintReport'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Printer, AlertTriangle, Users, Tag, Clock,
  Download, PieChart as PieChartIcon, BarChart2,
  ListChecks, TrendingUp, Activity, CheckCircle2, FolderKanban,
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Progress } from '@/components/ui/progress'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { cn } from '@/lib/utils'

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const datum = payload[0]
  return (
    <div className="rounded-lg bg-[#0F172A] text-white px-3 py-2 text-[0.78rem] shadow-[0_10px_30px_-12px_rgba(37,99,235,0.45)]">
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: datum.payload?.color || datum.fill }}
        />
        <span className="font-medium">{datum.name || datum.dataKey}</span>
      </div>
      <div className="font-bold text-[0.92rem] tabular-nums mt-0.5">{datum.value}</div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section: card-container reutilizável com sombra tintada de azul (não preta genérica)
// ──────────────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  iconColor = '#2563EB',
  iconBg = '#EFF6FF',
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  icon?: React.ElementType
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={
        'bg-white rounded-2xl border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] overflow-hidden transition-shadow hover:shadow-[0_12px_36px_-12px_rgba(37,99,235,0.15)] ' +
        className
      }
    >
      <header className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F4F5]">
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            <Icon size={15} style={{ color: iconColor }} strokeWidth={2} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[0.92rem] text-[#111111] leading-tight tracking-[-0.01em]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[0.72rem] text-[#71717A] mt-0.5 leading-tight">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// KPI card — destaca números no topo do relatório
// ──────────────────────────────────────────────────────────────────────
function Kpi({
  icon: Icon,
  label,
  value,
  numericValue,
  suffix = '',
  hint,
  accentColor = '#2563EB',
  accentBg = '#EFF6FF',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  numericValue?: number
  suffix?: string
  hint?: string
  accentColor?: string
  accentBg?: string
}) {
  const numeric = numericValue ?? (typeof value === 'number' ? value : NaN)
  const animatable = !isNaN(numeric)
  return (
    <SpotlightCard
      color={accentColor}
      className="bg-white rounded-2xl border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] transition-all hover:shadow-[0_14px_36px_-12px_rgba(37,99,235,0.18)] hover:-translate-y-0.5"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-[0.72rem] font-medium text-[#71717A] uppercase tracking-wider leading-tight">
            {label}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: accentBg }}
          >
            <Icon size={15} style={{ color: accentColor }} strokeWidth={2} />
          </div>
        </div>
        <div className="text-[1.875rem] font-mono font-bold text-[#0F172A] leading-none tabular-nums tracking-[-0.02em]">
          {animatable ? (
            <AnimatedCounter
              value={numeric}
              suffix={suffix}
              decimals={suffix === 'h' ? 1 : 0}
            />
          ) : (
            value
          )}
        </div>
        {hint && <div className="text-[0.72rem] text-[#71717A] mt-2">{hint}</div>}
      </div>
    </SpotlightCard>
  )
}

export default function RelatoriosPage() {
  const { tasks: allTasks, isLoading, isInitialLoad } = useTasks()
  const { entries: allEntries } = useTimeEntries()
  const { users } = useUsers()
  const { categories } = useCategories()
  const { projects } = useProjects()
  const { user: authUser } = useAuth()

  const isAdmin = authUser?.perfil === 'Administrador'

  // Filtro por usuário — apenas admin pode escolher; outros perfis sempre veem o próprio
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const effectiveUserId = isAdmin ? filterUserId : (authUser?.id || 'all')

  // Filtro por período — aplica em todas as métricas do Relatório
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Aplica filtros em cadeia: usuário → projeto → período. Pra tasks, considera
  // sobreposição com o período (não exige estar 100% dentro).
  const tasks = useMemo(() => {
    let arr = allTasks
    if (effectiveUserId !== 'all') {
      arr = arr.filter(t => t.responsavel_id === effectiveUserId)
    }
    if (filterProject !== 'all') {
      arr = arr.filter(t => t.projeto_id === filterProject)
    }
    if (dateFrom || dateTo) {
      arr = arr.filter(t => {
        // Usa data_prazo como referência principal; tarefas sem prazo
        // só entram se NÃO há range definido
        if (!t.data_prazo) return false
        if (dateFrom && t.data_prazo < dateFrom) return false
        if (dateTo && t.data_prazo > dateTo) return false
        return true
      })
    }
    return arr
  }, [allTasks, effectiveUserId, dateFrom, dateTo])

  const entries = useMemo(() => {
    let arr = allEntries
    if (effectiveUserId !== 'all') {
      arr = arr.filter(e => e.usuario_id === effectiveUserId)
    }
    if (dateFrom || dateTo) {
      arr = arr.filter(e => {
        if (!e.data) return false
        if (dateFrom && e.data < dateFrom) return false
        if (dateTo && e.data > dateTo) return false
        return true
      })
    }
    return arr
  }, [allEntries, effectiveUserId, dateFrom, dateTo])

  const stats = useMemo(() => {
    const byStatus = Object.values(STATUSES)
      .map((s) => ({
        name: s,
        value: tasks.filter((t) => t.status === s).length,
        color: STATUS_COLORS[s],
      }))
      .filter((s) => s.value > 0)

    const byUser = users
      .map((u) => {
        const userTasks = tasks.filter((t) => t.responsavel_id === u.id)
        const userEntries = entries.filter((e) => e.usuario_id === u.id)
        // Mesma estratégia: prioriza lançamentos; fallback no tempo_gasto_total
        const minFromEntries = userEntries.reduce((s, e) => s + e.duracao, 0)
        const minFromTasks = userTasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
        const totalMin = minFromEntries > 0 ? minFromEntries : minFromTasks
        const done = userTasks.filter((t) => t.status === 'Concluída').length
        return {
          user: u,
          total: userTasks.length,
          done,
          hours: Math.round((totalMin / 60) * 10) / 10,
          pct: userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0,
        }
      })
      .filter((u) => u.total > 0)
      .sort((a, b) => b.done - a.done)

    const byCategory = categories
      .map((c) => {
        const catTasks = tasks.filter((t) => t.categoria === c.nome)
        const minFromEntries = entries
          .filter((e) => catTasks.some((t) => t.id === e.tarefa_id))
          .reduce((s, e) => s + e.duracao, 0)
        const minFromTasks = catTasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
        const totalMin = minFromEntries > 0 ? minFromEntries : minFromTasks
        return {
          name: c.nome,
          total: catTasks.length,
          horas: Math.round((totalMin / 60) * 10) / 10,
        }
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)

    const byProject = projects
      .map((p) => {
        const projTasks = tasks.filter((t) => t.projeto_id === p.id)
        const minFromEntries = entries
          .filter((e) => projTasks.some((t) => t.id === e.tarefa_id))
          .reduce((s, e) => s + e.duracao, 0)
        const minFromTasks = projTasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
        const totalMin = minFromEntries > 0 ? minFromEntries : minFromTasks
        const done = projTasks.filter((t) => t.status === 'Concluída').length
        return {
          name: p.nome,
          total: projTasks.length,
          done,
          horas: Math.round((totalMin / 60) * 10) / 10,
        }
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)

    const exceeded = tasks.filter(
      (t) =>
        t.tempo_estimado > 0 &&
        t.tempo_gasto_total > t.tempo_estimado &&
        t.status !== 'Concluída',
    )

    // Horas totais: prioriza time_entries (mais granular); cai pro
    // tempo_gasto_total das tarefas quando não há lançamentos (campo
    // editado direto no modal). Garante que o card nunca mostra 0h
    // quando o usuário registrou tempo de alguma forma.
    const minutesFromEntries = entries.reduce((s, e) => s + e.duracao, 0)
    const minutesFromTasks = tasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
    const minutesTotal = minutesFromEntries > 0 ? minutesFromEntries : minutesFromTasks
    const totalHoras = Math.round((minutesTotal / 60) * 10) / 10
    const concluidas = tasks.filter((t) => t.status === 'Concluída').length
    const pctConcluidas =
      tasks.length > 0 ? Math.round((concluidas / tasks.length) * 100) : 0
    const pendentes = tasks.filter((t) => t.status !== 'Concluída').length
    const atrasadas = tasks.filter((t) => t.status === 'Atrasada').length

    /* ─── Métricas adicionais ──────────────────────────────────── */

    // Distribuição de prioridades
    const byPriority = (['Crítica', 'Alta', 'Média', 'Baixa'] as const)
      .map((p) => ({
        name: p,
        value: tasks.filter((t) => t.prioridade === p).length,
        color: PRIORITY_COLORS[p],
      }))
      .filter((p) => p.value > 0)

    // Previsto vs Realizado por responsável (chart de barras lado a lado)
    const plannedVsActual = users
      .map((u) => {
        const userTasks = tasks.filter((t) => t.responsavel_id === u.id)
        const estimado = userTasks.reduce((s, t) => s + (t.tempo_estimado || 0), 0)
        const gasto = userTasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
        return {
          name: u.nome.split(' ')[0],
          Estimado: Math.round((estimado / 60) * 10) / 10,
          Gasto: Math.round((gasto / 60) * 10) / 10,
        }
      })
      .filter((u) => u.Estimado > 0 || u.Gasto > 0)
      .sort((a, b) => b.Gasto - a.Gasto)
      .slice(0, 8)

    // Top 5 tarefas mais atrasadas (mais antigas no status Atrasada)
    const today = new Date().toISOString().split('T')[0]
    const topAtrasadas = tasks
      .filter((t) => t.status === 'Atrasada' && t.data_prazo)
      .map((t) => {
        const ms = new Date(today).getTime() - new Date(t.data_prazo!).getTime()
        return { task: t, diasAtraso: Math.floor(ms / 86400000) }
      })
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 5)

    // Tempo médio de conclusão (dias entre data_inicio e data_conclusao)
    const concluidasComDatas = tasks.filter(
      (t) => t.status === 'Concluída' && t.data_inicio && t.data_conclusao
    )
    const leadTimes = concluidasComDatas.map((t) => {
      const ms = new Date(t.data_conclusao!).getTime() - new Date(t.data_inicio!).getTime()
      return Math.max(0, ms / 86400000)
    })
    const leadTimeMedio = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((s, x) => s + x, 0) / leadTimes.length * 10) / 10
      : 0

    // Aderência ao estimado (% de tarefas concluídas dentro do tempo previsto)
    const concluidasComEstimativa = tasks.filter(
      (t) => t.status === 'Concluída' && t.tempo_estimado > 0
    )
    const dentroDoPrevisto = concluidasComEstimativa.filter(
      (t) => t.tempo_gasto_total <= t.tempo_estimado
    ).length
    const pctAderencia = concluidasComEstimativa.length > 0
      ? Math.round((dentroDoPrevisto / concluidasComEstimativa.length) * 100)
      : 0

    // ──── Tarefas órfãs (sem responsável atribuído)
    const orphan = tasks.filter((t) => !t.responsavel_id)

    // ──── Burndown: concluídas acumuladas vs criadas acumuladas no período
    // Determina o range: usa dateFrom/dateTo se setado; senão data mais antiga
    // até hoje. Limita a 60 pontos pra não sobrecarregar o chart.
    const datesAll = tasks
      .map((t) => t.criado_em?.slice(0, 10))
      .filter(Boolean) as string[]
    const oldestDate = datesAll.length > 0 ? datesAll.sort()[0] : ''
    const burnStart = dateFrom || oldestDate
    const burnEnd = dateTo || new Date().toISOString().split('T')[0]
    const burndownData: { label: string; Criadas: number; Concluídas: number }[] = []
    if (burnStart && burnEnd && burnStart <= burnEnd) {
      const startMs = new Date(burnStart + 'T00:00:00').getTime()
      const endMs = new Date(burnEnd + 'T00:00:00').getTime()
      const totalDays = Math.min(60, Math.round((endMs - startMs) / 86400000) + 1)
      const stepDays = Math.max(1, Math.ceil(((endMs - startMs) / 86400000 + 1) / totalDays))
      let acc = 0, accDone = 0
      // Para acumular, contamos quantas tasks foram criadas/concluídas até cada data
      for (let i = 0; i < totalDays; i++) {
        const dms = startMs + i * stepDays * 86400000
        if (dms > endMs) break
        const ds = new Date(dms).toISOString().split('T')[0]
        const [, mm, dd] = ds.split('-')
        acc = tasks.filter(t => (t.criado_em || '').slice(0, 10) <= ds).length
        accDone = tasks.filter(t => t.status === 'Concluída' && (t.data_conclusao || '') <= ds).length
        burndownData.push({ label: `${dd}/${mm}`, Criadas: acc, Concluídas: accDone })
      }
    }

    // ──── Heatmap atividade por dia da semana
    // Eixo X: dia da semana (Dom..Sáb). Valor: nº de tarefas criadas
    // naquele dia da semana, DENTRO do intervalo selecionado (dateFrom/
    // dateTo). Se não há filtro, usa todo o range natural dos dados.
    const heatmapData = (() => {
      const counts: number[] = [0, 0, 0, 0, 0, 0, 0] // dom..sab
      tasks.forEach((t) => {
        const created = t.criado_em?.slice(0, 10)
        if (!created) return
        if (dateFrom && created < dateFrom) return
        if (dateTo && created > dateTo) return
        const d = new Date(created + 'T00:00:00').getDay()
        counts[d]++
      })
      const max = Math.max(1, ...counts)
      const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      return labels.map((label, i) => ({
        label,
        value: counts[i],
        intensity: counts[i] / max,
      }))
    })()

    return {
      byStatus,
      byUser,
      byCategory,
      byProject,
      byPriority,
      plannedVsActual,
      topAtrasadas,
      leadTimeMedio,
      pctAderencia,
      exceeded,
      orphan,
      burndownData,
      heatmapData,
      totalHoras,
      concluidas,
      pctConcluidas,
      pendentes,
      atrasadas,
    }
  }, [tasks, entries, users, categories, projects, dateFrom, dateTo])

  const handleExportCSV = () => {
    const rows = [
      ['Título', 'Status', 'Prioridade', 'Categoria', 'Responsável', 'Prazo', 'Tempo Estimado (min)', 'Tempo Gasto (min)'],
      ...tasks.map((t) => {
        const resp = users.find((u) => u.id === t.responsavel_id)
        return [
          t.titulo, t.status, t.prioridade, t.categoria, resp?.nome || '',
          formatDateBR(t.data_prazo), String(t.tempo_estimado), String(t.tempo_gasto_total),
        ]
      }),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tarefas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }

  if (isInitialLoad || (isLoading && tasks.length === 0)) {
    return <RelatoriosSkeleton />
  }

  const filterLabel = effectiveUserId === 'all'
    ? 'Todos os usuários'
    : (users.find(u => u.id === effectiveUserId)?.nome || 'Usuário')

  // Intervalo efetivo pro PDF: se o usuário filtrou, usa o filtro;
  // senão calcula o range natural dos dados (criado_em mais antigo → hoje).
  const todayStrLocal = new Date().toISOString().split('T')[0]
  const isFiltered = !!(dateFrom || dateTo)
  let effectiveFrom = dateFrom
  let effectiveTo = dateTo || todayStrLocal
  if (!effectiveFrom) {
    const oldest = tasks
      .map(t => (t.criado_em || '').slice(0, 10))
      .filter(Boolean)
      .sort()[0]
    effectiveFrom = oldest || todayStrLocal
  }

  return (
    <>
      {/* PrintReport — versão otimizada do relatório para PDF/papel.
          Fica oculto na tela (.print-report tem display:none por padrão)
          e SUBSTITUI o conteúdo da tela quando o usuário imprime.
          O CSS @media print esconde body * e mostra apenas .print-report. */}
      <PrintReport
        stats={stats}
        users={users}
        totalTasks={tasks.length}
        dateFrom={dateFrom}
        dateTo={dateTo}
        effectiveFrom={effectiveFrom}
        effectiveTo={effectiveTo}
        isFiltered={isFiltered}
        filterLabel={filterLabel}
      />

    <div className="pb-10">
      {/* ──────────────── Header ──────────────── */}
      {/* Padrão Kanban/Lista/Gantt: header com pílula+h1+subtítulo à esquerda,
          CTAs (Imprimir, Exportar CSV) à direita. Filtros vão em toolbar abaixo. */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <BarChart2 size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{tasks.length}</span> tarefas analisadas
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Relatórios
            {effectiveUserId !== 'all' && (
              <span className="ml-2.5 text-[1rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-lg align-middle">
                {users.find((u) => u.id === effectiveUserId)?.nome || 'Usuário'}
              </span>
            )}
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            {effectiveUserId === 'all'
              ? (isAdmin
                  ? 'Visão geral da equipe — produtividade, distribuição de tarefas e tempo investido.'
                  : 'Suas estatísticas — tarefas atribuídas, tempo gasto e produtividade.')
              : 'Visão filtrada — métricas restritas ao usuário selecionado.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => window.print()}
            className="h-9 flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] active:scale-[0.98] text-[#3F3F46] text-sm font-medium px-3.5 rounded-lg transition-all cursor-pointer"
          >
            <Printer size={13} /> Imprimir
          </button>
          <MagneticButton
            onClick={handleExportCSV}
            className="h-9 inline-flex items-center bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-colors cursor-pointer"
          >
            <Download size={13} strokeWidth={2.5} /> Exportar CSV
          </MagneticButton>
        </div>
      </div>

      {/* Toolbar de filtros — linha separada (padrão Kanban/Lista/Gantt) */}
      {/* data-print-toolbar="hide": removida do PDF gerado via window.print() */}
      <div data-print-toolbar="hide" className="mb-5 flex items-center gap-2 flex-wrap">
        {projects.length > 0 && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger aria-label="Filtrar por projeto" className="h-9 w-[180px] text-sm bg-white">
              <SelectValue placeholder="Projeto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isAdmin && users.length > 1 && (
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger aria-label="Filtrar por usuário" className="h-9 w-[200px] text-sm bg-white">
              <SelectValue placeholder="Filtrar por usuário..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {users
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
        {/* Direita: date range — ml-auto empurra pro final (padrão unificado) */}
        <div className="ml-auto">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* ──────────────── KPIs row ──────────────── */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            icon={ListChecks}
            label="Total de tarefas"
            value={tasks.length}
            hint={`${stats.pendentes} ainda pendentes`}
            accentColor="#2563EB"
            accentBg="#EFF6FF"
          />
          <Kpi
            icon={TrendingUp}
            label="Taxa de conclusão"
            value={`${stats.pctConcluidas}%`}
            numericValue={stats.pctConcluidas}
            suffix="%"
            hint={`${stats.concluidas} de ${tasks.length} concluídas`}
            accentColor="#16A34A"
            accentBg="#F0FDF4"
          />
          <Kpi
            icon={Clock}
            label="Horas registradas"
            value={`${stats.totalHoras}h`}
            numericValue={stats.totalHoras}
            suffix="h"
            hint={`${entries.length} lançamento${entries.length !== 1 ? 's' : ''}`}
            accentColor="#A855F7"
            accentBg="#FAF5FF"
          />
          <Kpi
            icon={AlertTriangle}
            label="Tempo excedido"
            value={stats.exceeded.length}
            hint={
              stats.exceeded.length === 0
                ? 'Tudo dentro do estimado'
                : `${stats.exceeded.length === 1 ? 'tarefa' : 'tarefas'} acima do prazo`
            }
            accentColor="#DC2626"
            accentBg="#FEF2F2"
          />
        </motion.div>

        {/* ──────────────── Status donut + Categorias ──────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6">
          {/* Status donut */}
          <Section
            icon={PieChartIcon}
            title="Distribuição por status"
            subtitle={`${stats.byStatus.length} status com tarefas`}
            iconColor="#2563EB"
            iconBg="#EFF6FF"
          >
            <div className="p-5">
              {stats.byStatus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#71717A] gap-2">
                  <PieChartIcon size={32} className="opacity-30" />
                  <p className="text-sm">Sem tarefas cadastradas</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats.byStatus}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {stats.byStatus.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ChartDataTable
                    caption="Distribuição de tarefas por status"
                    headers={['Status', 'Quantidade']}
                    rows={stats.byStatus.map(s => [s.name, String(s.value)])}
                  />
                  <ul className="flex flex-col gap-2 mt-4">
                    {stats.byStatus.map(({ name, value, color }) => (
                      <li key={name} className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: color }}
                          />
                          <span className="text-[0.85rem] text-[#3F3F46]">{name}</span>
                        </div>
                        <span className="font-semibold text-sm text-[#111111] tabular-nums">
                          {value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Section>

          {/* Categorias */}
          <Section
            icon={Tag}
            title="Tarefas por categoria"
            subtitle={`${stats.byCategory.length} categoria${stats.byCategory.length !== 1 ? 's' : ''} ativa${stats.byCategory.length !== 1 ? 's' : ''}`}
            iconColor="#D97706"
            iconBg="#FFFBEB"
          >
            <div className="p-5">
              {stats.byCategory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#71717A] gap-2">
                  <BarChart2 size={32} className="opacity-30" />
                  <p className="text-sm">Nenhuma categoria com tarefas</p>
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, stats.byCategory.length * 38)}
                >
                  <BarChart
                    data={stats.byCategory}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#A1A1AA' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#71717A' }}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F8FA' }} />
                    <Bar
                      dataKey="total"
                      name="Tarefas"
                      fill="#2563EB"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <ChartDataTable
                caption="Tarefas por categoria"
                headers={['Categoria', 'Tarefas']}
                rows={stats.byCategory.map(c => [c.name, String(c.total)])}
              />
            </div>
          </Section>
        </motion.div>

        {/* ──────────────── Tarefas por projeto ──────────────── */}
        {stats.byProject.length > 0 && (
          <motion.div variants={item}>
            <Section
              icon={FolderKanban}
              title="Tarefas por projeto"
              subtitle={`${stats.byProject.length} projeto${stats.byProject.length !== 1 ? 's' : ''} ativo${stats.byProject.length !== 1 ? 's' : ''}`}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E4E7]">
                    <th className="text-left font-semibold text-[#71717A] text-[0.72rem] uppercase tracking-wider px-5 py-2.5">Projeto</th>
                    <th className="text-right font-semibold text-[#71717A] text-[0.72rem] uppercase tracking-wider px-3 py-2.5">Tarefas</th>
                    <th className="text-right font-semibold text-[#71717A] text-[0.72rem] uppercase tracking-wider px-3 py-2.5">Concluídas</th>
                    <th className="text-right font-semibold text-[#71717A] text-[0.72rem] uppercase tracking-wider px-5 py-2.5">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byProject.map((p) => (
                    <tr key={p.name} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-5 py-3 font-medium text-[#0F172A]">{p.name}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#3F3F46]">{p.total}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#15803D] font-semibold">{p.done}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[#3F3F46]">{p.horas}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </motion.div>
        )}

        {/* ──────────────── Produtividade por usuário ──────────────── */}
        <motion.div variants={item}>
          <Section
            icon={Users}
            title="Produtividade por usuário"
            subtitle={`${stats.byUser.length} ${
              stats.byUser.length === 1 ? 'pessoa com tarefa atribuída' : 'pessoas com tarefas atribuídas'
            }`}
            iconColor="#16A34A"
            iconBg="#F0FDF4"
          >
            <div className="p-5">
              {stats.byUser.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#71717A] gap-2">
                  <Users size={32} className="opacity-30" />
                  <p className="text-sm">Nenhum usuário com tarefas atribuídas</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.byUser.map(({ user, total, done, hours, pct }) => {
                    const pctColor =
                      pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#71717A'
                    const pctBarClass =
                      pct >= 70
                        ? '[&>div]:bg-[#16A34A]'
                        : pct >= 40
                          ? '[&>div]:bg-[#D97706]'
                          : '[&>div]:bg-[#2563EB]'
                    // Von Restorff: o usuário logado aparece destacado com
                    // ring azul + badge "Você" — facilita identificar a si
                    // mesmo no ranking sem precisar varrer todos os nomes
                    const isSelf = authUser?.id === user.id
                    return (
                      <li
                        key={user.id}
                        className={cn(
                          'group flex gap-4 p-4 rounded-xl border bg-white transition-all',
                          isSelf
                            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.22)]'
                            : 'border-[#EDEEF1] hover:border-[#2563EB]/30 hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.18)]',
                        )}
                      >
                        <UserAvatar user={user} size={40} textSize="text-[13px]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="font-semibold text-[0.92rem] text-[#111111] truncate inline-flex items-center gap-2">
                              {user.nome}
                              {isSelf && (
                                <span className="text-[0.62rem] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded">
                                  Você
                                </span>
                              )}
                            </span>
                            <span
                              className="text-[0.78rem] font-bold tabular-nums flex-shrink-0"
                              style={{ color: pctColor }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div className="text-[0.78rem] text-[#71717A] flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2.5">
                            <span className="tabular-nums">
                              <strong className="text-[#111111] font-semibold">{done}</strong>
                              <span className="text-[#71717A]"> / {total}</span> concluídas
                            </span>
                            <span className="text-[#D4D4D8]">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock size={11} className="text-[#71717A]" />
                              {hours}h
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-1.5 ${pctBarClass}`}
                            aria-label={`Conclusão: ${pct}%`}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Section>
        </motion.div>

        {/* ──────────────── Previsto vs Realizado por pessoa ──────────────── */}
        {stats.plannedVsActual.length > 0 && (
          <motion.div variants={item}>
            <Section
              icon={Activity}
              iconColor="#7C3AED"
              iconBg="#F5F3FF"
              title="Previsto vs Realizado"
              subtitle="Comparação de horas estimadas vs efetivamente gastas — por pessoa"
            >
              <div className="p-5" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.plannedVsActual} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Estimado" fill="#7C3AED" fillOpacity={0.45} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Gasto" fill="#7C3AED" fillOpacity={0.95} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="px-5 pb-4 flex items-center gap-4 text-[0.72rem] text-[#71717A]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(124,58,237,0.45)' }} />
                  Estimado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: '#7C3AED' }} />
                  Gasto
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-[#16A34A]" />
                  Aderência ao previsto:{' '}
                  <strong className="text-[#0F172A] tabular-nums">{stats.pctAderencia}%</strong>
                </span>
              </div>
            </Section>
          </motion.div>
        )}

        {/* ──────────────── Top tarefas atrasadas ──────────────── */}
        {stats.topAtrasadas.length > 0 && (
          <motion.div variants={item}>
            <Section
              icon={AlertTriangle}
              iconColor="#DC2626"
              iconBg="#FEF2F2"
              title="Tarefas mais atrasadas"
              subtitle={`${stats.atrasadas} ${stats.atrasadas === 1 ? 'tarefa atrasada no total' : 'tarefas atrasadas no total'} — exibindo as ${stats.topAtrasadas.length} com maior atraso`}
            >
              <ul className="divide-y divide-[#F4F4F5]">
                {stats.topAtrasadas.map(({ task, diasAtraso }) => {
                  const resp = users.find((u) => u.id === task.responsavel_id)
                  return (
                    <li key={task.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
                        <span className="text-[1.05rem] font-mono font-bold tabular-nums text-[#B91C1C]">
                          {diasAtraso}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[0.875rem] text-[#0F172A] truncate">{task.titulo}</div>
                        <div className="text-[0.72rem] text-[#71717A] flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={10} />
                            Prazo: <span className="tabular-nums">{formatDateBR(task.data_prazo)}</span>
                          </span>
                          {resp && (
                            <>
                              <span className="text-[#D4D4D8]">·</span>
                              <span>{resp.nome}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] flex-shrink-0">
                        {diasAtraso === 1 ? '1 dia' : `${diasAtraso} dias`} atraso
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Section>
          </motion.div>
        )}

        {/* ──────────────── Distribuição de prioridades + Tempo médio ──────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prioridades */}
          {stats.byPriority.length > 0 && (
            <Section
              icon={TrendingUp}
              iconColor="#F59E0B"
              iconBg="#FFFBEB"
              title="Distribuição por prioridade"
              subtitle="Volume de tarefas por nível de urgência"
            >
              <div className="p-5">
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#F4F4F5] mb-4">
                  {stats.byPriority.map((p) => {
                    const total = stats.byPriority.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? (p.value / total) * 100 : 0
                    return (
                      <div
                        key={p.name}
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: p.color }}
                        title={`${p.name}: ${p.value}`}
                      />
                    )
                  })}
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {stats.byPriority.map((p) => (
                    <li key={p.name} className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-[0.82rem] text-[#3F3F46] flex-1">{p.name}</span>
                      <span className="text-[0.82rem] font-bold tabular-nums text-[#0F172A]">{p.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* Tempo médio de conclusão */}
          <Section
            icon={Clock}
            iconColor="#2563EB"
            iconBg="#EFF6FF"
            title="Tempo médio de conclusão"
            subtitle="Dias entre data de início e conclusão das tarefas finalizadas"
          >
            <div className="p-5 flex flex-col items-center justify-center text-center">
              <div className="text-[3rem] font-mono font-bold leading-none tabular-nums text-[#0F172A]">
                {stats.leadTimeMedio}
              </div>
              <div className="text-[0.85rem] text-[#71717A] mt-2 mb-4">
                {stats.leadTimeMedio === 1 ? 'dia em média' : 'dias em média'}
              </div>
              <div className="grid grid-cols-2 gap-3 w-full text-left">
                <div className="bg-[#F7F8FA] rounded-lg p-3">
                  <div className="text-[0.65rem] uppercase tracking-wider font-medium text-[#71717A] mb-1">Concluídas</div>
                  <div className="text-[1.4rem] font-mono font-bold tabular-nums text-[#16A34A]">{stats.concluidas}</div>
                </div>
                <div className="bg-[#F7F8FA] rounded-lg p-3">
                  <div className="text-[0.65rem] uppercase tracking-wider font-medium text-[#71717A] mb-1">Aderência</div>
                  <div className="text-[1.4rem] font-mono font-bold tabular-nums text-[#2563EB]">{stats.pctAderencia}%</div>
                </div>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* ──────────────── Burndown ──────────────── */}
        {stats.burndownData.length > 1 && (
          <motion.div variants={item}>
            <Section
              icon={Activity}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              title="Burndown — Criadas vs Concluídas"
              subtitle="Quantidades acumuladas ao longo do tempo. Distância entre as linhas indica backlog em aberto."
            >
              <div className="p-5" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.burndownData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Criadas" fill="#2563EB" fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Concluídas" fill="#16A34A" fillOpacity={0.95} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
                <ChartDataTable
                  caption="Burndown: tarefas criadas e concluídas acumuladas no período"
                  headers={['Data', 'Criadas', 'Concluídas']}
                  rows={stats.burndownData.map(b => [b.label, String(b.Criadas), String(b.Concluídas)])}
                />
              </div>
              <div className="px-5 pb-4 flex items-center gap-4 text-[0.72rem] text-[#71717A]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(37,99,235,0.35)' }} />
                  Criadas (acumulado)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: '#16A34A' }} />
                  Concluídas (acumulado)
                </span>
              </div>
            </Section>
          </motion.div>
        )}

        {/* ──────────────── Heatmap dia da semana ──────────────── */}
        <motion.div variants={item}>
          <Section
            icon={Activity}
            iconColor="#7C3AED"
            iconBg="#F5F3FF"
            title="Atividade por dia da semana"
            subtitle={`Distribuição das tarefas criadas — ${isFiltered ? 'período filtrado' : 'todo o período analisado'}`}
          >
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2" role="group" aria-label={`Tarefas criadas por dia da semana — ${isFiltered ? 'período filtrado' : 'todo o período'}`}>
                {stats.heatmapData.map((d) => (
                  <div key={d.label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[0.65rem] uppercase font-semibold tracking-wider text-[#71717A]" aria-hidden>
                      {d.label}
                    </span>
                    <div
                      role="img"
                      aria-label={`${d.label}: ${d.value} tarefa${d.value !== 1 ? 's' : ''} criada${d.value !== 1 ? 's' : ''}`}
                      tabIndex={0}
                      className="w-full h-16 rounded-md flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
                      style={{
                        background: d.intensity === 0
                          ? '#F7F8FA'
                          : `rgba(124, 58, 237, ${Math.max(0.18, d.intensity)})`,
                      }}
                      title={`${d.label}: ${d.value} tarefa${d.value !== 1 ? 's' : ''}`}
                    >
                      <span
                        className={
                          'text-[1rem] font-mono font-bold tabular-nums ' +
                          (d.intensity > 0.5 ? 'text-white' : 'text-[#0F172A]')
                        }
                      >
                        {d.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-[#71717A]">
                <span>Menos</span>
                {[0.18, 0.35, 0.55, 0.8, 1].map((opacity, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded"
                    style={{ background: `rgba(124, 58, 237, ${opacity})` }}
                    aria-hidden
                  />
                ))}
                <span>Mais</span>
              </div>
              <ChartDataTable
                caption={`Tarefas criadas por dia da semana — ${isFiltered ? `${formatDateBR(effectiveFrom)} a ${formatDateBR(effectiveTo)}` : 'todo o período analisado'}`}
                headers={['Dia da semana', 'Tarefas criadas']}
                rows={stats.heatmapData.map(d => [d.label, String(d.value)])}
              />
            </div>
          </Section>
        </motion.div>

        {/* ──────────────── Tarefas órfãs ──────────────── */}
        {stats.orphan.length > 0 && (
          <motion.div variants={item}>
            <Section
              icon={AlertTriangle}
              iconColor="#F59E0B"
              iconBg="#FFFBEB"
              title="Tarefas sem responsável"
              subtitle={`${stats.orphan.length} ${stats.orphan.length === 1 ? 'tarefa precisa ser atribuída' : 'tarefas precisam ser atribuídas'}`}
            >
              <ul className="divide-y divide-[#F4F4F5]">
                {stats.orphan.slice(0, 10).map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFFBEB] flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={14} className="text-[#D97706]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[0.875rem] text-[#0F172A] truncate">{task.titulo}</div>
                      <div className="text-[0.72rem] text-[#71717A] flex items-center gap-2 mt-0.5">
                        <span>{task.categoria || 'sem categoria'}</span>
                        {task.data_prazo && (
                          <>
                            <span className="text-[#D4D4D8]">·</span>
                            <span className="tabular-nums">prazo {formatDateBR(task.data_prazo)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] flex-shrink-0">
                      {task.status}
                    </span>
                  </li>
                ))}
              </ul>
              {stats.orphan.length > 10 && (
                <div className="px-5 py-2.5 border-t border-[#F4F4F5] text-[0.72rem] text-[#71717A] text-center">
                  E mais {stats.orphan.length - 10} {stats.orphan.length - 10 === 1 ? 'tarefa órfã' : 'tarefas órfãs'}
                </div>
              )}
            </Section>
          </motion.div>
        )}

        {/* ──────────────── Tempo excedido ──────────────── */}
        {stats.exceeded.length > 0 && (
          <motion.div variants={item}>
            <Section
              icon={AlertTriangle}
              title="Tempo excedido"
              subtitle={`${stats.exceeded.length} ${
                stats.exceeded.length === 1
                  ? 'tarefa ultrapassou o tempo estimado'
                  : 'tarefas ultrapassaram o tempo estimado'
              }`}
              iconColor="#DC2626"
              iconBg="#FEF2F2"
            >
              <ul className="divide-y divide-[#F4F4F5]">
                {stats.exceeded.map((task) => {
                  const excess = task.tempo_gasto_total - task.tempo_estimado
                  const pct = Math.round((task.tempo_gasto_total / task.tempo_estimado) * 100)
                  const resp = users.find((u) => u.id === task.responsavel_id)
                  return (
                    <li
                      key={task.id}
                      className="flex justify-between items-center px-5 py-3.5 gap-4 hover:bg-[#FEF2F2]/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[0.65rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded tabular-nums tracking-tight">
                            #{task.id.slice(-5).toUpperCase()}
                          </span>
                          {task.categoria && (
                            <span className="text-[0.65rem] px-1.5 py-[2px] rounded font-medium bg-[#F4F4F5] text-[#52525B] truncate">
                              {task.categoria}
                            </span>
                          )}
                        </div>
                        <div className="text-[0.9rem] font-medium text-[#111111] truncate">
                          {task.titulo}
                        </div>
                        {resp && (
                          <div className="text-[0.78rem] text-[#71717A] mt-0.5">
                            {resp.nome}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[0.9rem] text-[#DC2626] font-bold tabular-nums">
                          {pct}% usado
                        </div>
                        <div className="text-[0.72rem] text-[#71717A] tabular-nums">
                          +{formatMinutes(excess)} excedido
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Section>
          </motion.div>
        )}
      </motion.div>
    </div>
    </>
  )
}

/* ─── Skeleton ──────────────────────────────────────────────── */
function RelatoriosSkeleton() {
  return (
    <div className="pb-10 animate-pulse">
      {/* Header */}
      <div className="flex items-end justify-between mb-7">
        <div className="space-y-2">
          <div className="h-5 w-24 rounded-full bg-[#F4F4F5]" />
          <div className="h-8 w-44 rounded-md bg-[#F4F4F5]" />
          <div className="h-3 w-80 rounded-md bg-[#F4F4F5]" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-[#F4F4F5]" />
      </div>

      {/* KPIs (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#EDEEF1] rounded-2xl p-5 space-y-3"
            style={{ animation: `shimmer 1.6s ease-in-out ${i * 0.1}s infinite`, opacity: 0.6 }}
          >
            <div className="h-3 w-20 rounded bg-[#F4F4F5]" />
            <div className="h-8 w-24 rounded-md bg-[#F4F4F5]" />
            <div className="h-2.5 w-32 rounded bg-[#F4F4F5]" />
          </div>
        ))}
      </div>

      {/* 2 chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white border border-[#EDEEF1] rounded-2xl p-6 space-y-4">
            <div className="h-4 w-40 rounded bg-[#F4F4F5]" />
            <div className="h-3 w-28 rounded bg-[#F4F4F5]" />
            <div className="h-[240px] rounded-lg bg-gradient-to-b from-[#F4F4F5] to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}
