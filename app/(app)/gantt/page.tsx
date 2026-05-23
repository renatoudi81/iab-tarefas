'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/contexts/AuthContext'
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, todayStr, formatDateBR,
} from '@/types'
import type { Task, Status } from '@/types'
import {
  GanttChart, AlertTriangle, Clock, AlertCircle, CheckCircle2,
  Activity, TrendingUp, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { getCategoryColor } from '@/lib/category-color'
import TaskDrawer from '@/components/TaskDrawer'

type ColorBy = 'status' | 'prioridade'
type Granularity = 'week' | 'fortnight' | 'month'

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
      <div className="text-[0.68rem] text-[#A1A1AA] mt-1">{hint}</div>
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

export default function GanttPage() {
  const { tasks, isLoading: loadingTasks, isInitialLoad } = useTasks()
  const { users } = useUsers()
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.perfil === 'Administrador'

  const today = todayStr()
  const [colorBy, setColorBy] = useState<ColorBy>('status')
  const [granularity, setGranularity] = useState<Granularity>('week')

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [hideOldDone, setHideOldDone] = useState(true)

  // Drawer
  const [drawerTask, setDrawerTask] = useState<Task | null>(null)

  // Filtragem em cadeia: precisa de data_inicio + data_prazo, depois aplica
  // filtros do usuário, depois aplica regra de amostragem inteligente
  // (oculta concluídas há > 7 dias).
  const tasksWithDates = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    return tasks
      .filter(t => t.data_inicio && t.data_prazo)
      .filter(t => filterStatus === 'all' || t.status === filterStatus)
      .filter(t => filterUserId === 'all' || t.responsavel_id === filterUserId)
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
  }, [tasks, filterStatus, filterUserId, hideOldDone])

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
        <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] p-16 flex flex-col items-center justify-center text-[#A1A1AA]">
          <EmptyIllustration variant="calendar" size={112} />
          <p className="font-semibold text-[#52525B] mb-1 mt-3">Nenhuma tarefa com datas definidas</p>
          <p className="text-sm text-[#A1A1AA] max-w-sm text-center">
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
          colorBy={colorBy}
          setColorBy={setColorBy}
          granularity={granularity}
          setGranularity={setGranularity}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterUserId={filterUserId}
          setFilterUserId={setFilterUserId}
          isAdmin={isAdmin}
          users={users}
          hideOldDone={hideOldDone}
          setHideOldDone={setHideOldDone}
          minDate=""
          maxDate=""
        />
        <div className="bg-white border border-[#EDEEF1] rounded-2xl p-16 flex flex-col items-center text-center">
          <EmptyIllustration variant="search" size={104} />
          <p className="font-semibold text-[#52525B] mb-1 mt-3">Nenhuma tarefa nos filtros</p>
          <p className="text-sm text-[#A1A1AA] max-w-sm">Ajuste os filtros acima para ver mais tarefas.</p>
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

  return (
    <div>
      <PageHeader
        count={tasksWithDates.length}
        totalCount={tasksTotalWithDates}
        colorBy={colorBy}
        setColorBy={setColorBy}
        granularity={granularity}
        setGranularity={setGranularity}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterUserId={filterUserId}
        setFilterUserId={setFilterUserId}
        isAdmin={isAdmin}
        users={users}
        hideOldDone={hideOldDone}
        setHideOldDone={setHideOldDone}
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
                  className="absolute text-[0.68rem] text-[#A1A1AA] font-medium whitespace-nowrap"
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

          {/* Rows */}
          {tasksWithDates.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              idx={idx}
              users={users}
              today={today}
              ticks={ticks}
              todayPct={todayPct}
              offset={offset}
              width={width}
              color={getColor(task)}
              onClick={() => setDrawerTask(task)}
            />
          ))}

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
            <div className="flex items-center gap-1 text-[0.72rem] text-[#D97706]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#D97706]" /> Próxima do prazo (≤3 dias)
            </div>
          </div>
        </div>
      </div>

      {/* Drawer de detalhes — abre ao clicar em qualquer row */}
      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onEdit={() => { /* edição via Drawer/Lista; aqui só leitura */ }}
      />
    </div>
  )
}

/* ─── Page header (título + filtros) ───────────────────────────── */

interface PageHeaderProps {
  count: number
  totalCount: number
  colorBy: ColorBy
  setColorBy: (v: ColorBy) => void
  granularity: Granularity
  setGranularity: (v: Granularity) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterUserId: string
  setFilterUserId: (v: string) => void
  isAdmin: boolean
  users: any[]
  hideOldDone: boolean
  setHideOldDone: (v: boolean) => void
  minDate: string
  maxDate: string
}

function PageHeader(p: PageHeaderProps) {
  const STATUSES_LIST: Status[] = ['Atrasada', 'Em andamento', 'Aguardando', 'Pendente', 'Concluída']
  return (
    <>
      <div className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <GanttChart size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{p.count}</span> agendadas
            </span>
            {p.count !== p.totalCount && (
              <span className="inline-flex items-center text-[0.7rem] font-medium text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                <span className="font-mono tabular-nums">{p.totalCount}</span>
                <span className="ml-1">no total</span>
              </span>
            )}
            {p.minDate && p.maxDate && (
              <span className="inline-flex items-center text-[0.7rem] font-mono tabular-nums text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
                {formatDateBR(p.minDate)} → {formatDateBR(p.maxDate)}
              </span>
            )}
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">Gantt</h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            Acompanhe a linha do tempo do projeto — barras coloridas indicam {p.colorBy === 'status' ? 'status' : 'prioridade'}.
          </p>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <Select value={p.granularity} onValueChange={v => p.setGranularity(v as Granularity)}>
          <SelectTrigger className="w-[120px] h-9 text-sm border-[#E4E4E7] bg-white">
            <SelectValue placeholder="Escala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="fortnight">Quinzena</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.colorBy} onValueChange={v => p.setColorBy(v as ColorBy)}>
          <SelectTrigger className="w-[140px] h-9 text-sm border-[#E4E4E7] bg-white">
            <SelectValue placeholder="Colorir por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Cor: Status</SelectItem>
            <SelectItem value="prioridade">Cor: Prioridade</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.filterStatus} onValueChange={p.setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-sm border-[#E4E4E7] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES_LIST.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        {p.isAdmin && p.users.length > 1 && (
          <Select value={p.filterUserId} onValueChange={p.setFilterUserId}>
            <SelectTrigger className="w-[180px] h-9 text-sm border-[#E4E4E7] bg-white">
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

        {/* Toggle "amostragem inteligente" */}
        <button
          type="button"
          onClick={() => p.setHideOldDone(!p.hideOldDone)}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[0.78rem] font-medium transition-colors cursor-pointer border',
            p.hideOldDone
              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
              : 'bg-white text-[#52525B] border-[#E4E4E7] hover:bg-[#F4F4F5]',
          )}
          title={p.hideOldDone
            ? 'Concluídas há mais de 7 dias estão ocultas. Clique para mostrar.'
            : 'Mostrando todas as concluídas. Clique para ocultar antigas.'}
        >
          {p.hideOldDone ? <EyeOff size={13} /> : <Eye size={13} />}
          {p.hideOldDone ? 'Concluídas antigas ocultas' : 'Mostrar todas concluídas'}
        </button>
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
  color: string
  onClick: () => void
}

function TaskRow({ task, idx, users, today, ticks, todayPct, offset, width, color, onClick }: TaskRowProps) {
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

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-0 mb-2.5 rounded-lg cursor-pointer hover:bg-[#FAFAFA] transition-colors py-1 -my-1"
      title={`${task.titulo} · ${task.status} · ${resp?.nome || 'Sem responsável'} · ${formatDateBR(task.data_inicio!)} → ${formatDateBR(task.data_prazo!)} · ${Math.round(pct)}%`}
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
            <Activity size={11} className="text-[#D97706] flex-shrink-0" />
          )}
          <p className="text-[0.8125rem] font-medium text-[#111111] truncate flex-1">
            {task.titulo}
          </p>
          {resp && <UserAvatar user={resp} size={18} textSize="text-[8px]" />}
        </div>
      </div>

      {/* Bar track */}
      <div className="flex-1 relative h-10">
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

        {/* Barra */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: `${width(task.data_inicio!, task.data_prazo!)}%`, opacity: 1 }}
          transition={{ delay: Math.min(idx * 0.03, 0.5), duration: 0.4, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: `${offset(task.data_inicio!)}%`,
            top: '7px',
            bottom: '7px',
            background: color + 'ee',
            borderRadius: '6px',
            zIndex: 2,
            overflow: 'hidden',
            boxShadow: overdue
              ? `0 0 0 1.5px ${color}, 0 0 0 4px rgba(220,38,38,0.18)`
              : isNearDue
                ? `0 0 0 1.5px ${color}, 0 0 0 3px rgba(217,119,6,0.20)`
                : `0 0 0 1.5px ${color}`,
            animation: overdue ? 'gantt-overdue-pulse 2s ease-in-out infinite' : undefined,
          }}
        >
          {/* Progresso (intensidade varia conforme % concluído) */}
          {pct > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 rounded-[inherit]"
              style={{
                width: `${pct}%`,
                background: isOver
                  ? 'linear-gradient(90deg, rgba(220,38,38,0.50), rgba(220,38,38,0.30))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.18))',
              }}
            />
          )}
          <div className="relative z-10 flex items-center h-full pl-1.5 gap-1">
            <span className="text-[0.66rem] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
              {task.status} {pct > 0 && `· ${Math.round(pct)}%`}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Coluna direita — prazo + tempo */}
      <div className="w-[110px] flex-shrink-0 pl-3 text-right">
        <div className={cn(
          'text-[0.72rem] tabular-nums',
          overdue ? 'text-[#DC2626] font-semibold'
            : isNearDue ? 'text-[#D97706] font-semibold'
            : 'text-[#71717A] font-normal',
        )}>
          {formatDateBR(task.data_prazo)}
        </div>
        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
          <div className="text-[0.62rem] text-[#D97706] font-medium mt-0.5">
            {daysUntil === 0 ? 'vence hoje' : daysUntil === 1 ? 'vence amanhã' : `em ${daysUntil} dias`}
          </div>
        )}
        {task.tempo_estimado > 0 && (
          <div className={cn(
            'text-[0.66rem] flex items-center gap-0.5 justify-end mt-0.5 tabular-nums',
            isOver ? 'text-[#DC2626]' : 'text-[#A1A1AA]',
          )}>
            <Clock size={9} />
            {Math.round(pct)}%
          </div>
        )}
      </div>
    </div>
  )
}
