'use client'
import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { STATUSES, STATUS_COLORS, currentMonthRange } from '@/types'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts'
import {
  TrendingUp, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Activity, Sparkles, ArrowUpRight,
  Calendar as CalendarIcon, Flame,
} from 'lucide-react'
import { formatDateBR } from '@/types'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { ChartDataTable } from '@/components/ui/ChartDataTable'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

// ──────────────────────────────────────────────────────────────────────
// Tooltip dark com tipografia mono nos números
// ──────────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[#0F172A] text-white px-3 py-2 text-[0.78rem] shadow-[0_10px_30px_-12px_rgba(37,99,235,0.45)] border border-white/5">
      <p className="text-[#94A3B8] text-[0.7rem] mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-semibold text-[0.85rem] font-mono tracking-tight">
          <span className="text-[#CBD5E1] font-medium font-sans">{p.name}:</span>{' '}
          {p.value}
        </p>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Spring physics motion (skill rule: type:spring, stiffness:100, damping:20)
// ──────────────────────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
}

// ──────────────────────────────────────────────────────────────────────
// Bento Tile — substitui o card genérico. Aceita span para layout assimétrico
// ──────────────────────────────────────────────────────────────────────
function BentoTile({
  children,
  className = '',
  interactive = true,
  spotlight = false,
}: {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  spotlight?: boolean
}) {
  const baseClasses =
    'relative bg-white border border-[#EDEEF1] rounded-2xl overflow-hidden ' +
    'shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] ' +
    (interactive
      ? 'transition-all duration-300 ease-out hover:shadow-[0_18px_40px_-14px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 hover:border-[#DCE3F0] '
      : '') +
    className

  if (spotlight) {
    return (
      <motion.div variants={itemVariants}>
        <SpotlightCard className={baseClasses}>{children}</SpotlightCard>
      </motion.div>
    )
  }

  return (
    <motion.div variants={itemVariants} className={baseClasses}>
      {children}
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────────────
/* Hint pequeno mostrando delta % vs período anterior (↑ +12% ou ↓ -8%).
   Quando não há comparação significativa (sem dados anteriores), mostra
   o fallback (texto informativo padrão). */
function DeltaHint({ delta, fallback }: { delta: number; fallback: React.ReactNode }) {
  if (delta === 0) return <>{fallback}</>
  const isUp = delta > 0
  return (
    <span className="inline-flex items-center gap-1">
      <span className={isUp ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
        {isUp ? '↑' : '↓'} {Math.abs(delta)}%
      </span>
      <span className="text-[#71717A]">vs período anterior</span>
    </span>
  )
}

// KPI — tipografia hierárquica via peso + cor (não via tamanho gigante).
// Numbers em font-mono (Geist Mono) com tabular-nums.
// ──────────────────────────────────────────────────────────────────────
function Kpi({
  label, value, icon: Icon, hint, accentColor, accentBg, danger, pulse,
  /** Se omitido, o valor é animado de 0 ao número final. Use `false` se for string puro */
  animated = true,
  numericValue,
  suffix,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  hint?: React.ReactNode
  accentColor: string
  accentBg: string
  danger?: boolean
  pulse?: boolean
  animated?: boolean
  /** Valor numérico para animar; usa `value` se omitido */
  numericValue?: number
  /** Sufixo para o counter (ex: 'h', '%') */
  suffix?: string
}) {
  const numeric = numericValue ?? Number(value) ?? 0
  const isDanger = danger && numeric > 0
  return (
    <BentoTile className="p-5" spotlight>
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-[0.7rem] font-medium text-[#71717A] uppercase tracking-[0.08em] leading-tight">
          {label}
        </span>
        <div className="relative">
          {pulse && isDanger && (
            <span
              className="absolute inset-0 rounded-lg animate-ping opacity-40"
              style={{ background: accentBg }}
            />
          )}
          <div
            className="relative w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: accentBg }}
          >
            <Icon size={16} style={{ color: accentColor }} strokeWidth={2} />
          </div>
        </div>
      </div>
      <div
        className="font-mono text-[2rem] font-bold leading-none tabular-nums tracking-[-0.02em]"
        style={{ color: isDanger ? '#DC2626' : 'var(--text)' }}
      >
        {animated && !isNaN(numeric) ? (
          <AnimatedCounter
            value={numeric}
            suffix={suffix}
            decimals={suffix === 'h' ? 1 : 0}
          />
        ) : (
          value
        )}
      </div>
      {hint && <div className="text-[0.72rem] text-[#71717A] mt-2.5">{hint}</div>}
    </BentoTile>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Bento Section — para os charts. Header inline minimal, sem card overhead extra.
// ──────────────────────────────────────────────────────────────────────
function BentoSection({
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
    <BentoTile className={className}>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F4F5]">
        {Icon && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            <Icon size={16} style={{ color: iconColor }} strokeWidth={2} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[0.92rem] text-[#0F172A] leading-tight tracking-[-0.01em]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[0.72rem] text-[#71717A] mt-0.5 leading-tight">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </BentoTile>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Chart Skeleton: placeholder específico para AreaChart (linhas) e BarChart (barras).
// Matching layout = mesma altura/proporção do chart real, com elementos sugestivos.
// ──────────────────────────────────────────────────────────────────────
function AreaChartSkeleton() {
  // SVG curve sugerindo um area chart com gradient
  return (
    <div className="h-[240px] relative">
      <svg viewBox="0 0 400 240" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="skel-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E4E4E7" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#E4E4E7" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Y-axis ticks */}
        {[40, 100, 160, 200].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#F4F4F5" strokeDasharray="2 4" />
        ))}
        {/* Area path com curva suave */}
        <path
          d="M 0,160 C 50,140 100,180 150,120 S 250,90 300,110 S 380,80 400,100 L 400,240 L 0,240 Z"
          fill="url(#skel-area-grad)"
          className="animate-pulse"
        />
        <path
          d="M 0,160 C 50,140 100,180 150,120 S 250,90 300,110 S 380,80 400,100"
          fill="none"
          stroke="#E4E4E7"
          strokeWidth={2}
          className="animate-pulse"
        />
      </svg>
    </div>
  )
}

function BarChartSkeleton() {
  // Barras com alturas variadas pulsando
  const heights = [60, 90, 45, 110, 75, 130, 95]
  return (
    <div className="h-[240px] flex items-end gap-3 px-1 pt-4 pb-2">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-[#F4F4F5] rounded-t-md animate-pulse"
          style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Dashboard Skeleton (skill rule: skeletal loaders, no generic spinners)
// ──────────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-[#F4F4F5] rounded-full animate-pulse" />
          <div className="h-8 w-44 bg-[#F4F4F5] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-[#F4F4F5] rounded animate-pulse" />
        </div>
        <div className="h-9 w-64 bg-[#F4F4F5] rounded-lg animate-pulse" />
      </div>

      {/* KPI skeletons — matching real KPI layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="h-3 w-24 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-9 w-9 bg-[#F4F4F5] rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#F4F4F5] rounded animate-pulse" />
            <div className="h-3 w-28 bg-[#F4F4F5] rounded animate-pulse mt-3" />
          </div>
        ))}
      </div>

      {/* Charts skeletons — matching real chart layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl bg-white border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F4F5]">
            <div className="h-9 w-9 bg-[#F4F4F5] rounded-lg animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-40 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-3 w-56 bg-[#F4F4F5] rounded animate-pulse" />
            </div>
            <div className="hidden sm:flex gap-2">
              <div className="h-3 w-14 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[#F4F4F5] rounded animate-pulse" />
            </div>
          </div>
          <div className="p-5">
            <AreaChartSkeleton />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F4F5]">
            <div className="h-9 w-9 bg-[#F4F4F5] rounded-lg animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-3 w-40 bg-[#F4F4F5] rounded animate-pulse" />
            </div>
          </div>
          <div className="p-5">
            <BarChartSkeleton />
          </div>
        </div>
      </div>

      {/* Status distribution skeleton */}
      <div className="rounded-2xl bg-white border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F4F4F5]">
          <div className="h-9 w-9 bg-[#F4F4F5] rounded-lg animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 w-44 bg-[#F4F4F5] rounded animate-pulse" />
            <div className="h-3 w-52 bg-[#F4F4F5] rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 sm:divide-x divide-y sm:divide-y-0 divide-[#F4F4F5]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-5 space-y-2">
              <div className="h-3 w-16 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-7 w-10 bg-[#F4F4F5] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[#F4F4F5] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { tasks: allTasks, isInitialLoad } = useTasks()
  const { entries: allEntries } = useTimeEntries()
  const { users } = useUsers()
  const { projects } = useProjects()
  const { user: authUser } = useAuth()
  const isAdmin = authUser?.perfil === 'Administrador'

  // Filtro por usuário (admin escolhe; não-admin sempre vê o próprio)
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const effectiveUserId = isAdmin ? filterUserId : (authUser?.id || 'all')

  // Escopo: filtra tudo pelo usuário escolhido + projeto. Filtro server-side
  // já restringe não-admins; aqui o admin alterna entre "Todos" e indivíduo.
  const tasks = useMemo(() => {
    let arr = effectiveUserId === 'all' ? allTasks : allTasks.filter(t => t.responsavel_id === effectiveUserId)
    if (filterProject !== 'all') arr = arr.filter(t => t.projeto_id === filterProject)
    return arr
  }, [allTasks, effectiveUserId, filterProject])
  const entries = useMemo(() => {
    let arr = effectiveUserId === 'all' ? allEntries : allEntries.filter(e => e.usuario_id === effectiveUserId)
    if (filterProject !== 'all') {
      const taskIds = new Set(tasks.map(t => t.id))
      arr = arr.filter(e => taskIds.has(e.tarefa_id))
    }
    return arr
  }, [allEntries, effectiveUserId, filterProject, tasks])

  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().from)
  const [dateTo, setDateTo] = useState(() => currentMonthRange().to)

  const metrics = useMemo(() => {
    const inPeriod = tasks.filter(t =>
      t.criado_em.slice(0, 10) >= dateFrom && t.criado_em.slice(0, 10) <= dateTo,
    )
    const periodEntries = entries.filter(e => e.data >= dateFrom && e.data <= dateTo)
    const delayed = tasks.filter(t => t.status === STATUSES.DELAYED).length
    const done = tasks.filter(t => t.status === STATUSES.DONE).length
    const total = tasks.length
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0
    const minutesFromEntries = periodEntries.reduce((s, e) => s + e.duracao, 0)
    const minutesFromTasks = tasks.reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
    const minutes = minutesFromEntries > 0 ? minutesFromEntries : minutesFromTasks
    const hours = Math.round((minutes / 60) * 10) / 10

    // ──── Comparação com período anterior (mesma duração)
    const periodMs = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) || 86400000
    const periodDays = Math.round(periodMs / 86400000) + 1
    const prevFrom = new Date(new Date(dateFrom).getTime() - periodDays * 86400000)
      .toISOString().split('T')[0]
    const prevTo = new Date(new Date(dateFrom).getTime() - 86400000).toISOString().split('T')[0]
    const prevInPeriod = tasks.filter(t =>
      t.criado_em.slice(0, 10) >= prevFrom && t.criado_em.slice(0, 10) <= prevTo,
    ).length
    const prevEntries = entries.filter(e => e.data >= prevFrom && e.data <= prevTo)
    const prevMinutes = prevEntries.reduce((s, e) => s + e.duracao, 0)
    const prevHours = Math.round((prevMinutes / 60) * 10) / 10

    const tasksDelta = prevInPeriod > 0
      ? Math.round(((inPeriod.length - prevInPeriod) / prevInPeriod) * 100)
      : (inPeriod.length > 0 ? 100 : 0)
    const hoursDelta = prevHours > 0
      ? Math.round(((hours - prevHours) / prevHours) * 100)
      : (hours > 0 ? 100 : 0)

    // ──── Velocidade — tarefas concluídas/semana (últimas 4 semanas)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0]
    const recentDone = tasks.filter(t =>
      t.status === STATUSES.DONE &&
      t.data_conclusao &&
      t.data_conclusao >= fourWeeksAgoStr
    ).length
    const velocity = Math.round((recentDone / 4) * 10) / 10

    // ──── Próximos vencimentos / Top atrasadas
    const todayDate = new Date(new Date().toISOString().split('T')[0])
    const inSevenDays = new Date(todayDate)
    inSevenDays.setDate(inSevenDays.getDate() + 7)
    const todayStrLocal = todayDate.toISOString().split('T')[0]
    const sevenStr = inSevenDays.toISOString().split('T')[0]
    const upcoming = tasks
      .filter(t => t.status !== 'Concluída' && t.status !== 'Atrasada' && t.data_prazo)
      .filter(t => t.data_prazo! >= todayStrLocal && t.data_prazo! <= sevenStr)
      .sort((a, b) => (a.data_prazo! < b.data_prazo! ? -1 : 1))
      .slice(0, 5)

    const topOverdue = tasks
      .filter(t => t.status === 'Atrasada' && t.data_prazo)
      .map(t => ({
        task: t,
        diasAtraso: Math.floor(
          (todayDate.getTime() - new Date(t.data_prazo!).getTime()) / 86400000
        ),
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso)
      .slice(0, 5)

    return {
      tasksInPeriod: inPeriod.length,
      hoursInPeriod: `${hours}h`,
      delayedTasks: delayed,
      productivity: `${productivity}%`,
      donePct: productivity,
      doneCount: done,
      hoursSource: minutesFromEntries > 0 ? 'entries' : 'tasks',
      tasksDelta,
      hoursDelta,
      velocity,
      upcoming,
      topOverdue,
    }
  }, [tasks, entries, dateFrom, dateTo])

  const chartData = useMemo(() => {
    // Agrupa por SEMANA DE CALENDÁRIO (domingo → sábado), recortada ao período
    // filtrado: a 1ª e a última semana podem ser parciais (contam só os dias
    // dentro do intervalo). Rótulo = "DD/MM–DD/MM" (início–fim de cada semana).
    const end = new Date(dateTo + 'T00:00:00')
    const cur = new Date(dateFrom + 'T00:00:00')
    const pad = (n: number) => String(n).padStart(2, '0')
    type Bucket = { start: Date; finish: Date; Concluídas: number; Criadas: number; minutos: number }
    const buckets: Bucket[] = []
    // Tarefas que já têm lançamento de tempo — evita somar em dobro no híbrido
    const tarefasComLancamento = new Set(entries.map(e => e.tarefa_id))
    let guard = 0
    while (cur <= end && guard < 400) {
      // Nova semana: no 1º dia do período OU sempre que cair num domingo
      if (buckets.length === 0 || cur.getDay() === 0) {
        buckets.push({ start: new Date(cur), finish: new Date(cur), Concluídas: 0, Criadas: 0, minutos: 0 })
      }
      const b = buckets[buckets.length - 1]
      b.finish = new Date(cur)
      const ds = cur.toISOString().split('T')[0] // YYYY-MM-DD
      b.Criadas += tasks.filter(t => t.criado_em.startsWith(ds)).length
      b.Concluídas += tasks.filter(t => t.data_conclusao?.startsWith(ds)).length
      // Horas (híbrido): lançamentos de tempo do dia + tempo das tarefas
      // concluídas no dia que não têm lançamento (tempo gravado no campo).
      b.minutos += entries.filter(e => e.data === ds).reduce((s, e) => s + e.duracao, 0)
      b.minutos += tasks
        .filter(t => t.status === 'Concluída' && (t.data_conclusao || '').slice(0, 10) === ds && !tarefasComLancamento.has(t.id))
        .reduce((s, t) => s + (t.tempo_gasto_total || 0), 0)
      cur.setDate(cur.getDate() + 1); guard++
    }
    return buckets.map(b => {
      const ini = `${pad(b.start.getDate())}/${pad(b.start.getMonth() + 1)}`
      const fim = `${pad(b.finish.getDate())}/${pad(b.finish.getMonth() + 1)}`
      return {
        label: ini === fim ? ini : `${ini}–${fim}`,
        Concluídas: b.Concluídas,
        Criadas: b.Criadas,
        Horas: Math.round((b.minutos / 60) * 10) / 10,
      }
    })
  }, [tasks, entries, dateFrom, dateTo])

  // Usa a paleta canônica STATUS_COLORS (mesma de Lista/Kanban/Gantt/Relatórios)
  const STATUS_DIST = [
    { label: 'Pendente',     color: STATUS_COLORS['Pendente'],     key: STATUSES.PENDING },
    { label: 'Em andamento', color: STATUS_COLORS['Em andamento'], key: STATUSES.PROGRESS },
    { label: 'Aguardando',   color: STATUS_COLORS['Aguardando'],   key: STATUSES.WAITING },
    { label: 'Atrasada',     color: STATUS_COLORS['Atrasada'],     key: STATUSES.DELAYED },
    { label: 'Concluída',    color: STATUS_COLORS['Concluída'],    key: STATUSES.DONE },
  ]

  // Skeleton só na carga inicial (estável). Antes usava isLoading, que pode
  // oscilar em revalidações do SWR e fazia a tela "piscar" o skeleton sozinha.
  if (isInitialLoad) {
    return <DashboardSkeleton />
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 pb-10"
    >
      {/* ──────────────── Header ──────────────── */}
      {/* Header — só pílula+h1+subtítulo (padrão Kanban/Lista/Gantt).
          Filtros vão em toolbar separada abaixo. */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
            <Sparkles size={11} strokeWidth={2.5} />
            Visão geral
          </span>
        </div>
        <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
          Dashboard
        </h1>
        <p className="text-sm text-[#71717A] mt-1.5">
          Acompanhe a produtividade da equipe e os indicadores do período selecionado.
        </p>
      </motion.div>

      {/* Toolbar de filtros — linha separada (padrão Kanban/Lista/Gantt) */}
      <motion.div variants={itemVariants} className="mb-5 flex items-center gap-2 flex-wrap">
        {/* Filtro por projeto */}
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
        {/* Filtro por usuário — admin escolhe; outros perfis ocultos */}
        {isAdmin && users.length > 1 && (
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger aria-label="Filtrar por responsável" className="h-9 w-[200px] text-sm bg-white">
              <SelectValue placeholder="Responsável..." />
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
        <div className="ml-auto">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        </div>
      </motion.div>

      {/* ──────────────── KPIs row ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi
          label="Tarefas no período"
          value={metrics.tasksInPeriod}
          icon={TrendingUp}
          accentColor="#2563EB"
          accentBg="#EFF6FF"
          hint={
            <DeltaHint delta={metrics.tasksDelta} fallback={`de ${tasks.length} no total`} />
          }
        />
        <Kpi
          label="Horas registradas"
          value={metrics.hoursInPeriod}
          numericValue={parseFloat(metrics.hoursInPeriod)}
          suffix="h"
          icon={Clock}
          accentColor="#7C3AED"
          accentBg="#F5F3FF"
          hint={
            <DeltaHint
              delta={metrics.hoursDelta}
              fallback={
                metrics.hoursSource === 'entries'
                  ? `${entries.length} lançamento${entries.length !== 1 ? 's' : ''}`
                  : `tempo total`
              }
            />
          }
        />
        <Kpi
          label="Velocidade"
          value={`${metrics.velocity}/sem`}
          numericValue={metrics.velocity}
          icon={Activity}
          accentColor="#F59E0B"
          accentBg="#FFFBEB"
          hint="média das últimas 4 semanas"
        />
        <Kpi
          label="Tarefas atrasadas"
          value={metrics.delayedTasks}
          icon={AlertTriangle}
          accentColor="#DC2626"
          accentBg="#FEF2F2"
          danger
          pulse
          hint={metrics.delayedTasks === 0 ? 'Nenhuma atrasada' : 'Requer atenção'}
        />
        <Kpi
          label="Produtividade"
          value={metrics.productivity}
          numericValue={metrics.donePct}
          suffix="%"
          icon={CheckCircle2}
          accentColor="#16A34A"
          accentBg="#F0FDF4"
          hint={`${metrics.doneCount} de ${tasks.length} concluídas`}
        />
      </div>

      {/* ──────────────── Bento grid: asymmetric 3+2 ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <BentoSection
          icon={Activity}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          title="Produtividade no período"
          subtitle="Tarefas criadas vs concluídas por semana (Dom–Sáb)"
          className="lg:col-span-3"
          action={
            <div className="flex items-center gap-3 text-[0.72rem] text-[#71717A]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#2563EB] inline-block rounded-full" />
                Criadas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#16A34A] inline-block rounded-full" />
                Concluídas
              </span>
            </div>
          }
        >
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="grad-concluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-criadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E4E4E7' }} />
                <Area isAnimationActive={false} type="monotone" dataKey="Concluídas" stroke="#16A34A" strokeWidth={2} fill="url(#grad-concluidas)" dot={false} activeDot={{ r: 4, fill: '#16A34A', strokeWidth: 0 }} />
                <Area isAnimationActive={false} type="monotone" dataKey="Criadas" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 2" fill="url(#grad-criadas)" dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartDataTable
              caption="Tarefas criadas e concluídas por semana no período"
              headers={['Data', 'Criadas', 'Concluídas']}
              rows={chartData.map(d => [d.label, String(d.Criadas ?? 0), String(d.Concluídas ?? 0)])}
            />
          </div>
        </BentoSection>

        <BentoSection
          icon={BarChart3}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          title="Horas trabalhadas"
          subtitle="Por semana (Dom–Sáb)"
          className="lg:col-span-2"
        >
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 22, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F8FA' }} />
                <Bar isAnimationActive={false} dataKey="Horas" fill="#7C3AED" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="Horas"
                    position="top"
                    formatter={(value) => {
                      const n = Number(value)
                      return n > 0 ? `${String(n).replace('.', ',')}h` : ''
                    }}
                    fill="var(--text)"
                    fontSize={11}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartDataTable
              caption="Horas trabalhadas por semana no período"
              headers={['Data', 'Horas']}
              rows={chartData.map(d => [d.label, String(d.Horas ?? 0)])}
            />
          </div>
        </BentoSection>
      </div>

      {/* ──────────────── Status distribution: divide-y, sem cards individuais (skill rule: anti-card overuse) ──────────────── */}
      <BentoSection
        icon={CheckCircle2}
        iconColor="#475569"
        iconBg="#F1F5F9"
        title="Distribuição por status"
        subtitle={`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} categorizadas`}
        action={
          tasks.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-[#15803D]">
              <ArrowUpRight size={12} strokeWidth={2.5} />
              {metrics.donePct}% concluído
            </span>
          )
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 sm:divide-x divide-y sm:divide-y-0 divide-[#F4F4F5]">
          {STATUS_DIST.map(s => {
            const count = tasks.filter(t => t.status === s.key).length
            const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
            return (
              <motion.div
                key={s.key}
                variants={itemVariants}
                className="group relative px-5 py-5 flex flex-col gap-1.5 transition-colors hover:bg-[#FAFAFA]"
              >
                {/* Top accent line on hover */}
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  style={{ background: s.color }}
                />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[0.7rem] font-medium text-[#71717A] uppercase tracking-[0.08em]">
                    {s.label}
                  </span>
                </div>
                <p className="text-[1.625rem] font-mono font-bold text-[#0F172A] tracking-[-0.02em] tabular-nums leading-none">
                  {count}
                </p>
                <p className="text-[0.72rem] text-[#71717A] font-mono tabular-nums">{pct}% do total</p>
              </motion.div>
            )
          })}
        </div>
      </BentoSection>

      {/* ──────────────── Widgets: Próximos vencimentos + Top atrasadas ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos 7 dias */}
        <BentoSection
          icon={CalendarIcon}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
          title="Próximos vencimentos"
          subtitle="Tarefas com prazo nos próximos 7 dias"
        >
          {metrics.upcoming.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                <CheckCircle2 size={18} className="text-[#15803D]" />
              </div>
              <p className="text-[0.82rem] text-[#52525B] font-medium">Nenhum prazo próximo</p>
              <p className="text-[0.72rem] text-[#71717A]">Você está tranquilo pelos próximos 7 dias.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F4F4F5]">
              {metrics.upcoming.map((task) => {
                const resp = users.find((u) => u.id === task.responsavel_id)
                const days = Math.floor(
                  (new Date(task.data_prazo!).getTime() - new Date(new Date().toISOString().split('T')[0]).getTime()) / 86400000
                )
                const statusColor = STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
                return (
                  <li key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors">
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: statusColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[0.875rem] text-[#0F172A] truncate">{task.titulo}</div>
                      <div className="text-[0.72rem] text-[#71717A] flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <CalendarIcon size={10} />
                          {formatDateBR(task.data_prazo)}
                        </span>
                        {resp && (
                          <>
                            <span className="text-[#D4D4D8]">·</span>
                            <UserAvatar user={resp} size={14} textSize="text-[7px]" />
                            <span>{resp.nome.split(' ')[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={
                      'text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ' +
                      (days === 0 ? 'bg-[#FEF2F2] text-[#B91C1C]' :
                        days <= 2 ? 'bg-[#FFFBEB] text-[#92400E]' :
                        'bg-[#EFF6FF] text-[#2563EB]')
                    }>
                      {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `${days} dias`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </BentoSection>

        {/* Top 5 mais atrasadas */}
        <BentoSection
          icon={Flame}
          iconColor="#DC2626"
          iconBg="#FEF2F2"
          title="Atenção urgente"
          subtitle={metrics.topOverdue.length === 0 ? 'Nenhuma tarefa atrasada' : 'Tarefas com maior tempo de atraso'}
        >
          {metrics.topOverdue.length === 0 ? (
            <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                <CheckCircle2 size={18} className="text-[#15803D]" />
              </div>
              <p className="text-[0.82rem] text-[#52525B] font-medium">Tudo em dia</p>
              <p className="text-[0.72rem] text-[#71717A]">Nenhuma tarefa atrasada no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F4F4F5]">
              {metrics.topOverdue.map(({ task, diasAtraso }) => {
                const resp = users.find((u) => u.id === task.responsavel_id)
                return (
                  <li key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
                      <span className="text-[0.95rem] font-mono font-bold tabular-nums text-[#B91C1C]">
                        {diasAtraso}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[0.875rem] text-[#0F172A] truncate">{task.titulo}</div>
                      <div className="text-[0.72rem] text-[#71717A] flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <CalendarIcon size={10} />
                          {formatDateBR(task.data_prazo)}
                        </span>
                        {resp && (
                          <>
                            <span className="text-[#D4D4D8]">·</span>
                            <UserAvatar user={resp} size={14} textSize="text-[7px]" />
                            <span>{resp.nome.split(' ')[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] flex-shrink-0">
                      {diasAtraso === 1 ? '1 dia' : `${diasAtraso} dias`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </BentoSection>
      </div>
    </motion.div>
  )
}
