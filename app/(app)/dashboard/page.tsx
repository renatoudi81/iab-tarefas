'use client'
import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { STATUSES, todayStr } from '@/types'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Clock, AlertTriangle, CheckCircle2,
  BarChart3, Activity, Sparkles, ArrowUpRight,
} from 'lucide-react'
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
  hint?: string
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
        style={{ color: isDanger ? '#DC2626' : '#0F172A' }}
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
  const { tasks, isLoading: loadingTasks } = useTasks()
  const { entries } = useTimeEntries()

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(todayStr)

  const metrics = useMemo(() => {
    const inPeriod = tasks.filter(t =>
      t.criado_em.slice(0, 10) >= dateFrom && t.criado_em.slice(0, 10) <= dateTo,
    )
    const periodEntries = entries.filter(e => e.data >= dateFrom && e.data <= dateTo)
    const delayed = tasks.filter(t => t.status === STATUSES.DELAYED).length
    const done = tasks.filter(t => t.status === STATUSES.DONE).length
    const total = tasks.length
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0
    const hours = Math.round((periodEntries.reduce((s, e) => s + e.duracao, 0) / 60) * 10) / 10
    return {
      tasksInPeriod: inPeriod.length,
      hoursInPeriod: `${hours}h`,
      delayedTasks: delayed,
      productivity: `${productivity}%`,
      donePct: productivity,
      doneCount: done,
    }
  }, [tasks, entries, dateFrom, dateTo])

  const chartData = useMemo(() => {
    const data: { label: string; Concluídas: number; Criadas: number; Horas: number }[] = []
    const cur = new Date(dateFrom + 'T00:00:00')
    const end = new Date(dateTo + 'T00:00:00')
    let days = 0
    while (cur <= end && days < 31) {
      const ds = cur.toISOString().split('T')[0]
      data.push({
        label: ds.slice(5),
        Concluídas: tasks.filter(t => t.data_conclusao?.startsWith(ds)).length,
        Criadas: tasks.filter(t => t.criado_em.startsWith(ds)).length,
        Horas: Math.round((entries.filter(e => e.data === ds).reduce((s, e) => s + e.duracao, 0) / 60) * 10) / 10,
      })
      cur.setDate(cur.getDate() + 1); days++
    }
    return data
  }, [tasks, entries, dateFrom, dateTo])

  const STATUS_DIST = [
    { label: 'Pendente',     color: '#64748b', key: STATUSES.PENDING },
    { label: 'Em andamento', color: '#3b82f6', key: STATUSES.PROGRESS },
    { label: 'Aguardando',   color: '#f59e0b', key: STATUSES.WAITING },
    { label: 'Atrasada',     color: '#ef4444', key: STATUSES.DELAYED },
    { label: 'Concluída',    color: '#22c55e', key: STATUSES.DONE },
  ]

  if (loadingTasks && tasks.length === 0) {
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
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
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
        </div>
        <div className="flex items-center gap-1 border border-[#E4E4E7] rounded-lg bg-white px-3 h-9 text-sm text-[#3F3F46] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer font-mono tabular-nums"
            style={{ colorScheme: 'light' }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-[#A1A1AA] select-none px-1">→</span>
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer font-mono tabular-nums"
            style={{ colorScheme: 'light' }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </motion.div>

      {/* ──────────────── KPIs row ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Tarefas no período"
          value={metrics.tasksInPeriod}
          icon={TrendingUp}
          accentColor="#2563EB"
          accentBg="#EFF6FF"
          hint={`de ${tasks.length} no total`}
        />
        <Kpi
          label="Horas registradas"
          value={metrics.hoursInPeriod}
          numericValue={parseFloat(metrics.hoursInPeriod)}
          suffix="h"
          icon={Clock}
          accentColor="#7C3AED"
          accentBg="#F5F3FF"
          hint={`${entries.length} lançamento${entries.length !== 1 ? 's' : ''}`}
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
          subtitle="Tarefas criadas vs concluídas por dia"
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
                <Area type="monotone" dataKey="Concluídas" stroke="#16A34A" strokeWidth={2} fill="url(#grad-concluidas)" dot={false} activeDot={{ r: 4, fill: '#16A34A', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Criadas" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 2" fill="url(#grad-criadas)" dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BentoSection>

        <BentoSection
          icon={BarChart3}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          title="Horas trabalhadas"
          subtitle="Por dia no período"
          className="lg:col-span-2"
        >
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F8FA' }} />
                <Bar dataKey="Horas" fill="#7C3AED" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
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
            <span className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-[#16A34A]">
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
                <p className="text-[0.72rem] text-[#A1A1AA] font-mono tabular-nums">{pct}% do total</p>
              </motion.div>
            )
          })}
        </div>
      </BentoSection>
    </motion.div>
  )
}
