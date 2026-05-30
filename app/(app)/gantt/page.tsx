'use client'
import { useMemo, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, todayStr, formatDateBR,
} from '@/types'
import type { Task, Status } from '@/types'
import {
  GanttChart, AlertTriangle, Clock, AlertCircle, CheckCircle2,
  Activity, TrendingUp, ChevronDown, ChevronRight,
  Users, Tag as TagIcon, Layers, ZoomIn, ZoomOut,
} from 'lucide-react'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { getCategoryColor } from '@/lib/category-color'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import TaskDrawer from '@/components/TaskDrawer'

type ColorBy = 'status' | 'prioridade'
type Granularity = 'week' | 'fortnight' | 'month'
type GroupBy = 'none' | 'responsavel' | 'status' | 'categoria'

// Ordem do mais zoom-in pro mais zoom-out — usada pelos botões +/-
const GRANULARITY_ORDER: Granularity[] = ['week', 'fortnight', 'month']

/**
 * Gera ticks da régua do Gantt conforme granularidade.
 *  - week     → a cada 7 dias, alinhado a segunda
 *  - fortnight→ a cada 14 dias, alinhado a segunda
 *  - month    → 1º dia de cada mês
 */
function getTicks(
  minDate: string,
  maxDate: string,
  granularity: Granularity,
): { label: string; left: number }[] {
  const ticks: { label: string; left: number }[] = []
  const start = new Date(minDate + 'T00:00:00')
  const end = new Date(maxDate + 'T00:00:00')
  const totalMs = end.getTime() - start.getTime() || 1
  const pushTick = (d: Date, label: string) => {
    const left = Math.max(0, (d.getTime() - start.getTime()) / totalMs * 100)
    if (left <= 100) ticks.push({ label, left })
  }

  if (granularity === 'month') {
    const d = new Date(start.getFullYear(), start.getMonth(), 1)
    while (d <= end) {
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      pushTick(d, label.replace('.', '').replace(' de ', '/'))
      d.setMonth(d.getMonth() + 1)
    }
    return ticks
  }

  const stepDays = granularity === 'fortnight' ? 14 : 7
  const d = new Date(start)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  while (d <= end) {
    pushTick(
      d,
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
    )
    d.setDate(d.getDate() + stepDays)
  }
  return ticks
}

function GanttSkeleton() {
  const bars = [
    { offset: 5, width: 35 }, { offset: 20, width: 50 }, { offset: 12, width: 28 },
    { offset: 35, width: 45 }, { offset: 8, width: 60 }, { offset: 28, width: 40 },
  ]
  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="h-5 w-32 bg-[#F4F4F5] rounded-full animate-pulse" />
        <div className="h-8 w-28 bg-[#F4F4F5] rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-[#F4F4F5] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-[#F4F4F5] rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] p-5">
        <div className="flex justify-between mb-4 px-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 w-12 bg-[#F4F4F5] rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {bars.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-28 bg-[#F4F4F5] rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 h-6 bg-[#F7F8FA] rounded-md relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-[#E4E4E7] rounded-md animate-pulse"
                  style={{ left: `${b.offset}%`, width: `${b.width}%`, animationDelay: `${i * 100}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Header KPIs ──────────────────────────────────────────────── */

interface HeaderStatsProps {
  tasks: Task[]
}

function HeaderStats({ tasks }: HeaderStatsProps) {
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'Concluída').length
    const overdue = tasks.filter(t => t.status === 'Atrasada').length
    const inProgress = tasks.filter(t => t.status === 'Em andamento').length
    const pctDone = total > 0 ? Math.round((done / total) * 100) : 0
    const pctOverdue = total > 0 ? Math.round((overdue / total) * 100) : 0
    const avgProgress = total > 0
      ? Math.round(tasks.reduce((s, t) => {
          if (!t.tempo_estimado) return s
          const p = Math.min(100, (t.tempo_gasto_total / t.tempo_estimado) * 100)
          return s + p
        }, 0) / total)
      : 0
    // Distribuição absoluta por status pra barra resumida
    const byStatus: Record<Status, number> = {
      'Atrasada': overdue,
      'Em andamento': inProgress,
      'Aguardando': tasks.filter(t => t.status === 'Aguardando').length,
      'Pendente': tasks.filter(t => t.status === 'Pendente').length,
      'Concluída': done,
    }
    return { total, done, overdue, inProgress, pctDone, pctOverdue, avgProgress, byStatus }
  }, [tasks])

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <StatCard
        icon={GanttChart}
        label="Tarefas"
        value={stats.total}
        hint="no período"
        color="#2563EB"
      />
      <StatCard
        icon={CheckCircle2}
        label="Concluído"
        value={`${stats.pctDone}%`}
        hint={`${stats.done} de ${stats.total}`}
        color="#16A34A"
      />
      <StatCard
        icon={AlertCircle}
        label="Atrasado"
        value={`${stats.pctOverdue}%`}
        hint={`${stats.overdue} ${stats.overdue === 1 ? 'tarefa' : 'tarefas'}`}
        color="#DC2626"
        pulse={stats.overdue > 0}
      />
      <StatCard
        icon={TrendingUp}
        label="Progresso médio"
        value={`${stats.avgProgress}%`}
        hint="tempo gasto/estimado"
        color="#7C3AED"
      />
      <StatusDistribution byStatus={stats.byStatus} total={stats.total} />
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, hint, color, pulse,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint: string
  color: string
  pulse?: boolean
}) {
  return (
    <div className="bg-white border border-[#EDEEF1] rounded-xl px-4 py-3 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.68rem] font-medium text-[#71717A] uppercase tracking-wider">{label}</span>
        <div className="relative">
          {pulse && (
            <span
              className="absolute inset-0 rounded-md animate-ping opacity-50"
              style={{ background: color + '30' }}
            />
          )}
          <div
            className="relative w-7 h-7 rounded-md inline-flex items-center justify-center"
            style={{ background: color + '15' }}
          >
            <Icon size={14} style={{ color }} strokeWidth={2.2} />
          </div>
        </div>
      </div>
      <div className="text-[1.4rem] font-mono font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ color: pulse ? color : '#0F172A' }}>
        {value}
      </div>
      <div className="text-[0.68rem] text-[#71717A] mt-1">{hint}</div>
    </div>
  )
}

function StatusDistribution({ byStatus, total }: { byStatus: Record<Status, number>; total: number }) {
  const order: Status[] = ['Atrasada', 'Em andamento', 'Aguardando', 'Pendente', 'Concluída']
  return (
    <div className="bg-white border border-[#EDEEF1] rounded-xl px-4 py-3 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.06)] col-span-2 md:col-span-1">
      <div className="text-[0.68rem] font-medium text-[#71717A] uppercase tracking-wider mb-2.5">Distribuição</div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#F4F4F5]">
        {order.map((s) => {
          const n = byStatus[s]
          if (n === 0 || total === 0) return null
          const pct = (n / total) * 100
          return (
            <div
              key={s}
              className="h-full transition-all"
              style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
              title={`${STATUS_LABELS[s]}: ${n}`}
            />
          )
        })}
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {order.map(s => byStatus[s] > 0 && (
          <span key={s} className="inline-flex items-center gap-1 text-[0.6rem] text-[#52525B] tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
            {byStatus[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Página principal ─────────────────────────────────────────── */

/* Helper: soma N dias a uma string YYYY-MM-DD e retorna YYYY-MM-DD.
   Parse direto para não depender de timezone. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().split('T')[0]
}

export default function GanttPage() {
  const { tasks, isLoading: loadingTasks, isInitialLoad, updateTask } = useTasks()
  const { users } = useUsers()
  const { projects } = useProjects()
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.perfil === 'Administrador'

  const today = todayStr()
  // Cor por status e sem agrupamento são fixos (toolbar enxuta). Concluídas
  // antigas (>7d) ficam ocultas por padrão — comportamento, não opção.
  const colorBy: ColorBy = 'status'
  const groupBy: GroupBy = 'none'
  const hideOldDone = true
  const [granularity, setGranularity] = useState<Granularity>('week')

  // Filtros
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // Drawer — guarda só o ID; task derivada do array vivo (reflete
  // optimistic updates de drag/resize sem ficar stale).
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null)
  const drawerTask = drawerTaskId ? tasks.find(t => t.id === drawerTaskId) ?? null : null

  // Filtragem em cadeia: precisa de data_inicio + data_prazo, depois aplica
  // filtros do usuário, depois aplica regra de amostragem inteligente
  // (oculta concluídas há > 7 dias).
  const tasksWithDates = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    return tasks
      .filter(t => t.data_inicio && t.data_prazo)
      .filter(t => filterProject === 'all' || t.projeto_id === filterProject)
      .filter(t => filterStatus === 'all' || t.status === filterStatus)
      .filter(t => filterUserId === 'all' || t.responsavel_id === filterUserId)
      .filter(t => {
        // Date range — tarefa entra se SE SOBREPÕE ao período escolhido:
        // (task.data_inicio <= dateTo) AND (task.data_prazo >= dateFrom)
        if (dateFrom && t.data_prazo! < dateFrom) return false
        if (dateTo && t.data_inicio! > dateTo) return false
        return true
      })
      .filter(t => {
        // Amostragem inteligente: oculta Concluídas há > 7 dias
        if (!hideOldDone) return true
        if (t.status !== 'Concluída') return true
        if (!t.data_conclusao) return true
        return t.data_conclusao >= sevenDaysAgoStr
      })
      .sort((a, b) => {
        // Atrasadas primeiro, depois por data_inicio
        const aOver = a.status === 'Atrasada' ? 0 : 1
        const bOver = b.status === 'Atrasada' ? 0 : 1
        if (aOver !== bOver) return aOver - bOver
        return (a.data_inicio || '') < (b.data_inicio || '') ? -1 : 1
      })
  }, [tasks, filterProject, filterStatus, filterUserId, hideOldDone, dateFrom, dateTo])

  if (isInitialLoad || (loadingTasks && tasks.length === 0)) {
    return <GanttSkeleton />
  }

  const tasksTotalWithDates = tasks.filter(t => t.data_inicio && t.data_prazo).length

  if (tasksTotalWithDates === 0) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <GanttChart size={11} strokeWidth={2.5} />
              Timeline
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">Gantt</h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            Visualize a distribuição das tarefas ao longo do tempo, com data de início e prazo.
          </p>
        </div>
        <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] p-16 flex flex-col items-center justify-center text-[#71717A]">
          <EmptyIllustration variant="calendar" size={112} />
          <p className="font-semibold text-[#52525B] mb-1 mt-3">Nenhuma tarefa com datas definidas</p>
          <p className="text-sm text-[#71717A] max-w-sm text-center">
            Defina data de início e vencimento nas tarefas para visualizá-las aqui.
          </p>
        </div>
      </div>
    )
  }

  // Se filtros eliminaram tudo, mostra mensagem amigável
  if (tasksWithDates.length === 0) {
    return (
      <div>
        <PageHeader
          count={0}
          totalCount={tasksTotalWithDates}
          granularity={granularity}
          setGranularity={setGranularity}
          filterProject={filterProject}
          setFilterProject={setFilterProject}
          projects={projects}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterUserId={filterUserId}
          setFilterUserId={setFilterUserId}
          isAdmin={isAdmin}
          users={users}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          minDate=""
          maxDate=""
        />
        <div className="bg-white border border-[#EDEEF1] rounded-2xl p-16 flex flex-col items-center text-center">
          <EmptyIllustration variant="search" size={104} />
          <p className="font-semibold text-[#52525B] mb-1 mt-3">Nenhuma tarefa nos filtros</p>
          <p className="text-sm text-[#71717A] max-w-sm">Ajuste os filtros acima para ver mais tarefas.</p>
        </div>
      </div>
    )
  }

  const minDate = tasksWithDates[0].data_inicio!
  const maxDate = tasksWithDates.reduce((m, t) => t.data_prazo! > m ? t.data_prazo! : m, tasksWithDates[0].data_prazo!)
  const totalMs = Math.max(1, new Date(maxDate).getTime() - new Date(minDate).getTime())
  const totalDays = totalMs / 86400000 + 1

  const offset = (date: string) => {
    const ms = new Date(date).getTime() - new Date(minDate).getTime()
    return Math.max(0, ms / totalMs * 100)
  }
  const width = (start: string, end: string) => {
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1
    return Math.max(1, (days / totalDays) * 100)
  }

  const todayPct = today >= minDate && today <= maxDate ? offset(today) : null
  const ticks = getTicks(minDate, maxDate, granularity)

  const getColor = (task: Task) =>
    colorBy === 'status'
      ? STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
      : PRIORITY_COLORS[task.prioridade as keyof typeof PRIORITY_COLORS]

  // Agrupamento: gera array ordenado de grupos. Quando groupBy === 'none',
  // retorna 1 grupo vazio (key '' → renderiza sem header).
  const groups = (() => {
    if (groupBy === 'none') {
      return [{ key: '', label: '', color: '#71717A', icon: null as any, tasks: tasksWithDates }]
    }
    const map = new Map<string, { key: string; label: string; color: string; icon: any; tasks: Task[] }>()
    for (const t of tasksWithDates) {
      let key: string, label: string, color: string, icon: any
      if (groupBy === 'responsavel') {
        const u = users.find(uu => uu.id === t.responsavel_id)
        key = t.responsavel_id || 'none'
        label = u?.nome || 'Sem responsável'
        color = u?.avatar_color || '#71717A'
        icon = Users
      } else if (groupBy === 'status') {
        key = t.status
        label = STATUS_LABELS[t.status as Status] || t.status
        color = STATUS_COLORS[t.status as Status] || '#71717A'
        icon = Layers
      } else {
        key = t.categoria || 'none'
        label = t.categoria || 'Sem categoria'
        color = t.categoria ? getCategoryColor(t.categoria).hex : '#71717A'
        icon = TagIcon
      }
      if (!map.has(key)) map.set(key, { key, label, color, icon, tasks: [] })
      map.get(key)!.tasks.push(t)
    }
    // Ordenação dos grupos: Status segue ordem hierárquica; outros alfabético
    const arr = Array.from(map.values())
    if (groupBy === 'status') {
      const order: Status[] = ['Atrasada', 'Em andamento', 'Aguardando', 'Pendente', 'Concluída']
      arr.sort((a, b) => order.indexOf(a.key as Status) - order.indexOf(b.key as Status))
    } else {
      arr.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    }
    return arr
  })()

  return (
    <div>
      <PageHeader
        count={tasksWithDates.length}
        totalCount={tasksTotalWithDates}
        granularity={granularity}
        setGranularity={setGranularity}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        projects={projects}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterUserId={filterUserId}
        setFilterUserId={setFilterUserId}
        isAdmin={isAdmin}
        users={users}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        minDate={minDate}
        maxDate={maxDate}
      />

      <HeaderStats tasks={tasksWithDates} />

      <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] overflow-x-auto">
        <div className="p-6 pb-4" style={{ minWidth: '900px' }}>
          {/* Régua: datas no topo, badge HOJE embaixo */}
          <div className="mb-4 relative" style={{ marginLeft: '320px', height: '42px' }}>
            <div className="absolute inset-x-0 top-0 h-4">
              {ticks.map((w, i) => (
                <span
                  key={i}
                  className="absolute text-[0.68rem] text-[#71717A] font-medium whitespace-nowrap"
                  style={{ left: `${w.left}%`, transform: 'translateX(-50%)', top: 0 }}
                >
                  {w.label}
                </span>
              ))}
            </div>
            {todayPct !== null && (
              <span
                className="absolute inline-flex items-center gap-1 text-[0.62rem] text-white font-bold whitespace-nowrap bg-[#DC2626] px-1.5 py-[2px] rounded-md shadow-[0_2px_6px_-1px_rgba(220,38,38,0.5)]"
                style={{ left: `${todayPct}%`, top: '22px', transform: 'translateX(-50%)' }}
              >
                <span className="w-1 h-1 rounded-full bg-white" />
                HOJE
              </span>
            )}
          </div>

          {/* Rows — agrupados ou flat */}
          {groups.map((group, gIdx) => {
            const isCollapsed = collapsedGroups.has(group.key)
            const groupDone = group.tasks.filter(t => t.status === 'Concluída').length
            const groupOverdue = group.tasks.filter(t => t.status === 'Atrasada').length
            const showHeader = groupBy !== 'none' && group.key !== ''

            return (
              <div key={group.key || 'all'}>
                {showHeader && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-md cursor-pointer border-0 transition-colors text-left"
                    style={{ background: group.color + '10' }}
                  >
                    {isCollapsed
                      ? <ChevronRight size={14} style={{ color: group.color }} />
                      : <ChevronDown size={14} style={{ color: group.color }} />}
                    {group.icon && (
                      <group.icon size={13} style={{ color: group.color }} />
                    )}
                    <span className="font-semibold text-[0.82rem] text-[#0F172A]">{group.label}</span>
                    <span
                      className="ml-1 inline-flex items-center text-[0.65rem] font-bold px-1.5 py-[2px] rounded-full tabular-nums"
                      style={{ background: group.color + '22', color: group.color }}
                    >
                      {group.tasks.length}
                    </span>
                    {groupOverdue > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-semibold text-[#DC2626]">
                        <AlertTriangle size={9} /> {groupOverdue}
                      </span>
                    )}
                    {groupDone > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-semibold text-[#16A34A]">
                        <CheckCircle2 size={9} /> {groupDone}
                      </span>
                    )}
                  </button>
                )}
                {!isCollapsed && group.tasks.map((task, idx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    idx={gIdx * 5 + idx}
                    users={users}
                    today={today}
                    ticks={ticks}
                    todayPct={todayPct}
                    offset={offset}
                    width={width}
                    totalDays={totalDays}
                    color={getColor(task)}
                    onClick={() => setDrawerTaskId(task.id)}
                    onUpdateDates={async (newStart, newEnd) => {
                      try {
                        await updateTask(task.id, { data_inicio: newStart, data_prazo: newEnd })
                      } catch {
                        // Silencia — useTasks já fará rollback otimista em caso de falha
                      }
                    }}
                  />
                ))}
              </div>
            )
          })}

          {/* Legend */}
          <div className="border-t border-[#E4E4E7] mt-4 pt-3.5 flex gap-4 flex-wrap items-center">
            <span className="text-[0.72rem] text-[#71717A] font-medium">Legenda:</span>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#DC2626]">
              <div className="w-0.5 h-3 bg-[#DC2626] rounded-sm" /> Hoje
            </div>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#71717A]">
              <div className="w-3 h-2 rounded-sm border border-[#E4E4E7]" style={{ background: 'rgba(255,255,255,0.3)' }} />
              Progresso
            </div>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#DC2626]">
              <AlertTriangle size={11} /> Vencida
            </div>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#B45309]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#D97706]" /> Próxima do prazo (≤3 dias)
            </div>
          </div>
        </div>
      </div>

      {/* Drawer de detalhes — abre ao clicar em qualquer row */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTaskId(null)}
        onEdit={() => { /* edição via Drawer/Lista; aqui só leitura */ }}
      />
    </div>
  )
}

/* ─── Page header (título + filtros) ───────────────────────────── */

interface PageHeaderProps {
  count: number
  totalCount: number
  granularity: Granularity
  setGranularity: (v: Granularity) => void
  filterProject: string
  setFilterProject: (v: string) => void
  projects: { id: string; nome: string }[]
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterUserId: string
  setFilterUserId: (v: string) => void
  isAdmin: boolean
  users: any[]
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  minDate: string
  maxDate: string
}

function PageHeader(p: PageHeaderProps) {
  const STATUSES_LIST: Status[] = ['Atrasada', 'Em andamento', 'Aguardando', 'Pendente', 'Concluída']
  return (
    <>
      {/* Header — padrão Kanban/Lista (mb-6) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <GanttChart size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{p.count}</span> agendadas
            </span>
            {p.count !== p.totalCount && (
              <span className="inline-flex items-center text-[0.7rem] font-medium text-[#52525B] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                <span className="font-mono tabular-nums">{p.totalCount}</span>
                <span className="ml-1">no total</span>
              </span>
            )}
            {p.minDate && p.maxDate && (
              <span className="inline-flex items-center text-[0.7rem] font-mono tabular-nums text-[#52525B] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                {formatDateBR(p.minDate)} → {formatDateBR(p.maxDate)}
              </span>
            )}
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">Gantt</h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            Acompanhe a linha do tempo do projeto — barras coloridas indicam o status.
          </p>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        {/* Escala + botões de zoom (in/out) inline */}
        <div className="inline-flex items-center gap-0 h-9 rounded-lg border border-[#E4E4E7] bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => {
              const i = GRANULARITY_ORDER.indexOf(p.granularity)
              if (i > 0) p.setGranularity(GRANULARITY_ORDER[i - 1])
            }}
            disabled={p.granularity === 'week'}
            title="Aumentar zoom (escala menor)"
            className="h-9 w-8 inline-flex items-center justify-center text-[#52525B] hover:bg-[#F4F4F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <Select value={p.granularity} onValueChange={v => p.setGranularity(v as Granularity)}>
            <SelectTrigger aria-label="Escala de tempo" className="w-[105px] h-9 text-sm border-0 rounded-none focus:ring-0 shadow-none">
              <SelectValue placeholder="Escala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="fortnight">Quinzena</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => {
              const i = GRANULARITY_ORDER.indexOf(p.granularity)
              if (i < GRANULARITY_ORDER.length - 1) p.setGranularity(GRANULARITY_ORDER[i + 1])
            }}
            disabled={p.granularity === 'month'}
            title="Diminuir zoom (escala maior)"
            className="h-9 w-8 inline-flex items-center justify-center text-[#52525B] hover:bg-[#F4F4F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
          >
            <ZoomOut size={14} />
          </button>
        </div>

        {p.projects.length > 0 && (
          <Select value={p.filterProject} onValueChange={p.setFilterProject}>
            <SelectTrigger aria-label="Filtrar por projeto" className="w-[160px] h-9 text-sm border-[#E4E4E7] bg-white">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {p.projects.map((pr) => (
                <SelectItem key={pr.id} value={pr.id}>{pr.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={p.filterStatus} onValueChange={p.setFilterStatus}>
          <SelectTrigger aria-label="Filtrar por status" className="w-[150px] h-9 text-sm border-[#E4E4E7] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        {p.isAdmin && p.users.length > 1 && (
          <Select value={p.filterUserId} onValueChange={p.setFilterUserId}>
            <SelectTrigger aria-label="Filtrar por responsável" className="w-[180px] h-9 text-sm border-[#E4E4E7] bg-white">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {p.users.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((u: any) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Direita: date range — alinhado com Kanban e Lista */}
        <div className="ml-auto">
          <DateRangeFilter
            from={p.dateFrom}
            to={p.dateTo}
            onFromChange={p.setDateFrom}
            onToChange={p.setDateTo}
          />
        </div>
      </div>
    </>
  )
}

/* ─── TaskRow ──────────────────────────────────────────────────── */

interface TaskRowProps {
  task: Task
  idx: number
  users: any[]
  today: string
  ticks: { label: string; left: number }[]
  todayPct: number | null
  offset: (date: string) => number
  width: (start: string, end: string) => number
  totalDays: number
  color: string
  onClick: () => void
  onUpdateDates: (newStart: string, newEnd: string) => Promise<void>
}

function TaskRow({
  task, idx, users, today, ticks, todayPct, offset, width, totalDays, color, onClick, onUpdateDates,
}: TaskRowProps) {
  const resp = users.find(u => u.id === task.responsavel_id)
  const pct = task.tempo_estimado > 0
    ? Math.min(100, (task.tempo_gasto_total / task.tempo_estimado) * 100)
    : 0
  const isOver = task.tempo_gasto_total > task.tempo_estimado && task.tempo_estimado > 0
  const overdue = task.status === 'Atrasada' || (task.data_prazo && task.data_prazo < today && task.status !== 'Concluída')

  // Próxima do prazo: ≤ 3 dias até data_prazo e não-concluída
  const daysUntil = (() => {
    if (!task.data_prazo || task.status === 'Concluída') return null
    const ms = new Date(task.data_prazo).getTime() - new Date(today).getTime()
    return Math.ceil(ms / 86400000)
  })()
  const isNearDue = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && !overdue

  const prioColor = PRIORITY_COLORS[task.prioridade as keyof typeof PRIORITY_COLORS]
  const catColor = task.categoria ? getCategoryColor(task.categoria) : null
  const shortId = task.id.slice(-5).toUpperCase()

  /* ─── Drag / Resize ─────────────────────────────────────────── */
  const trackRef = useRef<HTMLDivElement | null>(null)
  // Drag state: durante o pointer-down/move guardamos o offset em dias
  // já com snap (Math.round). Setamos null ao soltar.
  const [drag, setDrag] = useState<{
    mode: 'move' | 'resize-end'
    startX: number
    deltaDays: number
  } | null>(null)
  // Flag pra suprimir o onClick que dispararia logo após um drag real
  const wasDraggingRef = useRef(false)

  // Atalho: dias visíveis na barra com o delta aplicado
  const effectiveStart = drag ? addDays(task.data_inicio!, drag.mode === 'move' ? drag.deltaDays : 0) : task.data_inicio!
  let effectiveEnd = drag
    ? (drag.mode === 'move'
        ? addDays(task.data_prazo!, drag.deltaDays)
        : addDays(task.data_prazo!, drag.deltaDays))
    : task.data_prazo!
  // resize-end não pode ficar antes do start
  if (drag?.mode === 'resize-end' && effectiveEnd < effectiveStart) {
    effectiveEnd = effectiveStart
  }

  const startPointerDown = (mode: 'move' | 'resize-end') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    setDrag({ mode, startX: e.clientX, deltaDays: 0 })
  }

  useEffect(() => {
    if (!drag) return
    const trackWidthPx = trackRef.current?.offsetWidth || 1
    const pixelsPerDay = trackWidthPx / totalDays

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX
      const deltaDays = Math.round(dx / pixelsPerDay)
      if (deltaDays !== drag.deltaDays) {
        setDrag({ ...drag, deltaDays })
      }
    }
    const onUp = () => {
      const { mode, deltaDays } = drag
      if (deltaDays === 0) {
        setDrag(null)
        return
      }
      // Marca que houve drag pra evitar abrir o Drawer no mesmo gesto
      wasDraggingRef.current = true
      setTimeout(() => { wasDraggingRef.current = false }, 100)

      if (mode === 'move') {
        const ns = addDays(task.data_inicio!, deltaDays)
        const ne = addDays(task.data_prazo!, deltaDays)
        onUpdateDates(ns, ne).finally(() => setDrag(null))
      } else {
        // resize-end: muda só o prazo, garantindo ne >= start
        let ne = addDays(task.data_prazo!, deltaDays)
        if (ne < task.data_inicio!) ne = task.data_inicio!
        onUpdateDates(task.data_inicio!, ne).finally(() => setDrag(null))
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, totalDays, task.data_inicio, task.data_prazo, onUpdateDates])

  const handleRowClick = () => {
    if (wasDraggingRef.current) return
    onClick()
  }

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center gap-0 mb-2.5 rounded-lg cursor-pointer hover:bg-[#FAFAFA] transition-colors py-1 -my-1"
    >
      {/* Coluna esquerda — info da tarefa */}
      <div className="w-[320px] flex-shrink-0 pr-4">
        <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
          <span className="text-[0.6rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[1px] rounded flex-shrink-0">
            #{shortId}
          </span>
          {catColor && task.categoria && (
            <span
              className="inline-flex items-center gap-1 text-[0.6rem] font-semibold px-1.5 py-[1px] rounded truncate min-w-0"
              style={{ background: catColor.bg, color: catColor.hex }}
            >
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: catColor.hex }} />
              <span className="truncate">{task.categoria}</span>
            </span>
          )}
          <span
            className="text-[0.58rem] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded flex-shrink-0"
            style={{ background: prioColor + '22', color: prioColor }}
          >
            {task.prioridade}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          {overdue && (
            <AlertTriangle size={11} className="text-[#DC2626] flex-shrink-0 animate-pulse" />
          )}
          {isNearDue && (
            <Activity size={11} className="text-[#B45309] flex-shrink-0" />
          )}
          <p className="text-[0.8125rem] font-medium text-[#111111] truncate flex-1">
            {task.titulo}
          </p>
          {resp && <UserAvatar user={resp} size={18} textSize="text-[8px]" />}
        </div>
      </div>

      {/* Bar track */}
      <div ref={trackRef} className="flex-1 relative h-10">
        {/* Linhas verticais (grid) */}
        {ticks.map((w, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-[#E4E4E7] opacity-50 z-0"
            style={{ left: `${w.left}%` }}
          />
        ))}
        {/* Linha "Hoje" */}
        {todayPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#DC2626] z-10 opacity-70"
            style={{ left: `${todayPct}%` }}
          />
        )}
        {/* Track de fundo */}
        <div className="absolute inset-[10px_0] bg-[#F7F8FA] rounded-md" />

        {/* Barra — Tooltip rico + drag/resize */}
        <Tooltip delayDuration={drag ? 9999 : 300}>
          <TooltipTrigger asChild>
            <motion.div
              role="button"
              tabIndex={0}
              aria-label={`${task.titulo}. Status ${task.status}. Prioridade ${task.prioridade}. De ${formatDateBR(effectiveStart)} até ${formatDateBR(effectiveEnd)}. Progresso ${Math.round(pct)} por cento.${overdue ? ' Atrasada.' : isNearDue ? ' Vence em breve.' : ''} Pressione Enter para abrir, setas para mover datas, Shift mais setas para redimensionar.`}
              onKeyDown={(e) => {
                // Enter / Space → abre drawer
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                  return
                }
                // Setas → move/redimensiona em incrementos de 1 dia
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  const delta = e.key === 'ArrowRight' ? 1 : -1
                  if (e.shiftKey) {
                    // Redimensiona: só altera data_prazo
                    let ne = addDays(task.data_prazo!, delta)
                    if (ne < task.data_inicio!) ne = task.data_inicio!
                    onUpdateDates(task.data_inicio!, ne)
                  } else {
                    // Move: altera ambas
                    const ns = addDays(task.data_inicio!, delta)
                    const ne = addDays(task.data_prazo!, delta)
                    onUpdateDates(ns, ne)
                  }
                }
              }}
              onPointerDown={startPointerDown('move')}
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: `${width(effectiveStart, effectiveEnd)}%`,
                opacity: drag ? 0.85 : 1,
              }}
              transition={drag ? { duration: 0 } : { delay: Math.min(idx * 0.03, 0.5), duration: 0.4, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${offset(effectiveStart)}%`,
                top: '7px',
                bottom: '7px',
                // color-mix com preto garante contraste 4.5:1 do texto branco
                // sobre a barra, mesmo quando STATUS_COLORS tem cor mais clara
                // (ex: Concluída #15803D ainda fica boa com 88% saturação).
                background: `color-mix(in srgb, ${color} 88%, #000)`,
                borderRadius: '6px',
                zIndex: drag ? 5 : 2,
                overflow: 'hidden',
                cursor: drag ? 'grabbing' : 'grab',
                touchAction: 'none',
                boxShadow: overdue
                  ? `0 0 0 1.5px ${color}, 0 0 0 4px rgba(220,38,38,0.18)`
                  : isNearDue
                    ? `0 0 0 1.5px ${color}, 0 0 0 3px rgba(217,119,6,0.20)`
                    : drag
                      ? `0 0 0 2px ${color}, 0 6px 16px -4px rgba(15,23,42,0.25)`
                      : `0 0 0 1.5px ${color}`,
                animation: overdue && !drag ? 'gantt-overdue-pulse 2s ease-in-out infinite' : undefined,
                outlineOffset: '2px',
              }}
              className="focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            >
              {pct > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 rounded-[inherit] pointer-events-none"
                  style={{
                    width: `${pct}%`,
                    background: isOver
                      ? 'linear-gradient(90deg, rgba(220,38,38,0.50), rgba(220,38,38,0.30))'
                      : 'linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.18))',
                  }}
                />
              )}
              <div className="relative z-10 flex items-center h-full pl-1.5 gap-1 pointer-events-none">
                <span className="text-[0.66rem] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {drag
                    ? (drag.mode === 'move'
                        ? `${formatDateBR(effectiveStart)} → ${formatDateBR(effectiveEnd)}`
                        : `Novo prazo: ${formatDateBR(effectiveEnd)}`)
                    : `${task.status} ${pct > 0 ? `· ${Math.round(pct)}%` : ''}`}
                </span>
              </div>
              {/* Handle de resize na extremidade direita */}
              <div
                onPointerDown={startPointerDown('resize-end')}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 hover:bg-white/30 transition-colors"
                style={{ touchAction: 'none' }}
                title="Arrastar para alterar prazo"
              />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            className="bg-white text-[#0F172A] border border-[#E4E4E7] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] p-0 max-w-[280px]"
          >
            <TaskTooltipContent
              task={task}
              resp={resp}
              pct={Math.round(pct)}
              isOver={isOver}
              overdue={!!overdue}
              isNearDue={isNearDue}
              daysUntil={daysUntil}
            />
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Coluna direita — prazo + tempo */}
      <div className="w-[110px] flex-shrink-0 pl-3 text-right">
        <div className={cn(
          'text-[0.72rem] tabular-nums',
          overdue ? 'text-[#DC2626] font-semibold'
            : isNearDue ? 'text-[#B45309] font-semibold'
            : 'text-[#71717A] font-normal',
        )}>
          {formatDateBR(task.data_prazo)}
        </div>
        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
          <div className="text-[0.62rem] text-[#B45309] font-medium mt-0.5">
            {daysUntil === 0 ? 'vence hoje' : daysUntil === 1 ? 'vence amanhã' : `em ${daysUntil} dias`}
          </div>
        )}
        {task.tempo_estimado > 0 && (
          <div className={cn(
            'text-[0.66rem] flex items-center gap-0.5 justify-end mt-0.5 tabular-nums',
            isOver ? 'text-[#DC2626]' : 'text-[#71717A]',
          )}>
            <Clock size={9} />
            {Math.round(pct)}%
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Tooltip rico ─────────────────────────────────────────────── */

interface TaskTooltipContentProps {
  task: Task
  resp: any
  pct: number
  isOver: boolean
  overdue: boolean
  isNearDue: boolean
  daysUntil: number | null
}

function TaskTooltipContent({ task, resp, pct, isOver, overdue, isNearDue, daysUntil }: TaskTooltipContentProps) {
  const prioColor = PRIORITY_COLORS[task.prioridade as keyof typeof PRIORITY_COLORS]
  const statusColor = STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
  return (
    <div className="text-left">
      <div className="px-3 py-2 rounded-t-md border-b border-[#F4F4F5]" style={{ background: statusColor + '15' }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className="inline-flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded text-white"
            style={{ background: statusColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {task.status}
          </span>
          <span
            className="text-[0.6rem] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded"
            style={{ background: prioColor + '22', color: prioColor }}
          >
            {task.prioridade}
          </span>
        </div>
        <p className="text-[0.875rem] font-bold text-[#0F172A] leading-tight">{task.titulo}</p>
      </div>

      <div className="px-3 py-2.5 space-y-1.5 text-[0.75rem]">
        {resp && (
          <div className="flex items-center gap-2">
            <UserAvatar user={resp} size={18} textSize="text-[8px]" />
            <span className="text-[#3F3F46] font-medium">{resp.nome}</span>
          </div>
        )}
        {task.categoria && (() => {
          const c = getCategoryColor(task.categoria)
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.hex }} />
              <span className="text-[#52525B]">{task.categoria}</span>
            </div>
          )
        })()}
        <div className="flex items-center gap-1.5 text-[#52525B] tabular-nums pt-1">
          <Clock size={11} className="text-[#71717A]" />
          <span>{formatDateBR(task.data_inicio)} → {formatDateBR(task.data_prazo)}</span>
        </div>

        {task.tempo_estimado > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.65rem] text-[#71717A]">Progresso</span>
              <span className={cn(
                'text-[0.65rem] font-bold tabular-nums',
                isOver ? 'text-[#DC2626]' : 'text-[#0F172A]',
              )}>
                {pct}%{isOver && ' ⚠'}
              </span>
            </div>
            <div className="h-1 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: isOver ? '#DC2626' : statusColor }}
              />
            </div>
          </div>
        )}

        {(overdue || isNearDue) && (
          <div className={cn(
            'mt-2 px-2 py-1 rounded text-[0.65rem] font-semibold inline-flex items-center gap-1',
            overdue ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#FFFBEB] text-[#92400E]',
          )}>
            {overdue ? <AlertTriangle size={10} /> : <Activity size={10} />}
            {overdue
              ? `Vencida há ${Math.abs(daysUntil ?? 0)} dia${Math.abs(daysUntil ?? 0) !== 1 ? 's' : ''}`
              : daysUntil === 0 ? 'Vence hoje'
              : daysUntil === 1 ? 'Vence amanhã'
              : `Vence em ${daysUntil} dias`}
          </div>
        )}

        <div className="pt-2 text-[0.6rem] text-[#71717A] border-t border-[#F4F4F5] mt-2">
          Clique para abrir detalhes
        </div>
      </div>
    </div>
  )
}
