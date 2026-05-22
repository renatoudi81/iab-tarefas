'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { STATUSES, todayStr } from '@/types'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, BarChart3, Activity } from 'lucide-react'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[#0F172A] text-white px-3 py-2 text-[0.78rem] shadow-[0_10px_30px_-12px_rgba(37,99,235,0.45)]">
      <p className="text-[#94A3B8] text-[0.7rem] mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-white font-semibold text-[0.85rem] tabular-nums">
          <span className="text-[#CBD5E1] font-medium">{p.name}:</span>{' '}
          {p.value}
        </p>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// KPI Card com sombra tintada de azul + hover lift
// ──────────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, hint, accentColor, accentBg, danger,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  hint?: string
  accentColor: string
  accentBg: string
  danger?: boolean
}) {
  const valueColor = danger && Number(value) > 0 ? '#DC2626' : '#111111'
  return (
    <div className="bg-white rounded-2xl border border-[#EDEEF1] shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] p-5 transition-all hover:shadow-[0_14px_36px_-12px_rgba(37,99,235,0.18)] hover:-translate-y-0.5">
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
      <div
        className="text-[1.875rem] font-bold leading-none tabular-nums tracking-tight"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {hint && <div className="text-[0.72rem] text-[#A1A1AA] mt-2">{hint}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section card reutilizável (mesmo padrão de relatorios)
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

export default function DashboardPage() {
  const { tasks } = useTasks()
  const { entries } = useTimeEntries()

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(todayStr)

  const metrics = useMemo(() => {
    const inPeriod = tasks.filter(t =>
      t.criado_em.slice(0, 10) >= dateFrom && t.criado_em.slice(0, 10) <= dateTo
    )
    const periodEntries = entries.filter(e => e.data >= dateFrom && e.data <= dateTo)
    const delayed = tasks.filter(t => t.status === STATUSES.DELAYED).length
    const done = tasks.filter(t => t.status === STATUSES.DONE).length
    const total = tasks.length
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0
    const hours = Math.round(periodEntries.reduce((s, e) => s + e.duracao, 0) / 60 * 10) / 10
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
        Horas: Math.round(entries.filter(e => e.data === ds).reduce((s, e) => s + e.duracao, 0) / 60 * 10) / 10,
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

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-bold text-[#111111] tracking-[-0.02em] leading-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#71717A] mt-1">
            Acompanhe a produtividade da equipe e os indicadores do período.
          </p>
        </div>
        <div className="flex items-center gap-1 border border-[#E4E4E7] rounded-lg bg-white px-3 h-9 text-sm text-[#3F3F46] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer tabular-nums"
            style={{ colorScheme: 'light' }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-[#A1A1AA] select-none px-1">–</span>
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer tabular-nums"
            style={{ colorScheme: 'light' }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* ──────────────── KPIs ──────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <KpiCard
          label="Tarefas no período"
          value={metrics.tasksInPeriod}
          icon={TrendingUp}
          accentColor="#2563EB"
          accentBg="#EFF6FF"
          hint={`de ${tasks.length} no total`}
        />
        <KpiCard
          label="Horas registradas"
          value={metrics.hoursInPeriod}
          icon={Clock}
          accentColor="#A855F7"
          accentBg="#FAF5FF"
          hint={`${entries.length} lançamento${entries.length !== 1 ? 's' : ''}`}
        />
        <KpiCard
          label="Tarefas atrasadas"
          value={metrics.delayedTasks}
          icon={AlertTriangle}
          accentColor="#DC2626"
          accentBg="#FEF2F2"
          danger
          hint={metrics.delayedTasks === 0 ? 'Nenhuma atrasada' : 'Atenção'}
        />
        <KpiCard
          label="Produtividade geral"
          value={metrics.productivity}
          icon={CheckCircle2}
          accentColor="#16A34A"
          accentBg="#F0FDF4"
          hint={`${metrics.doneCount} de ${tasks.length} concluídas`}
        />
      </motion.div>

      {/* ──────────────── Gráficos ──────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Produtividade */}
        <Section
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
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="grad-concluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-criadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E4E4E7' }} />
                <Area type="monotone" dataKey="Concluídas" stroke="#16A34A" strokeWidth={1.75} fill="url(#grad-concluidas)" dot={false} activeDot={{ r: 4, fill: '#16A34A', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Criadas" stroke="#2563EB" strokeWidth={1.75} strokeDasharray="4 2" fill="url(#grad-criadas)" dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Horas */}
        <Section
          icon={BarChart3}
          iconColor="#A855F7"
          iconBg="#FAF5FF"
          title="Horas trabalhadas"
          subtitle="Por dia no período"
          className="lg:col-span-2"
        >
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#EDEEF1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F7F8FA' }} />
                <Bar dataKey="Horas" fill="#A855F7" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </motion.div>

      {/* ──────────────── Distribuição por Status ──────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25 }}
      >
        <Section
          icon={CheckCircle2}
          iconColor="#3F3F46"
          iconBg="#F4F4F5"
          title="Distribuição por status"
          subtitle={`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} no total`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[#F4F4F5]">
            {STATUS_DIST.map(s => {
              const count = tasks.filter(t => t.status === s.key).length
              const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
              return (
                <div key={s.key} className="px-5 py-5 flex flex-col gap-1.5 transition-colors hover:bg-[#FAFAFA]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[0.72rem] font-medium text-[#71717A] uppercase tracking-wider">
                      {s.label}
                    </span>
                  </div>
                  <p className="text-[1.625rem] font-bold text-[#111111] tracking-tight tabular-nums leading-none">
                    {count}
                  </p>
                  <p className="text-[0.72rem] text-[#A1A1AA] tabular-nums">{pct}% do total</p>
                </div>
              )
            })}
          </div>
        </Section>
      </motion.div>

    </div>
  )
}
