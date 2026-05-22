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
import { TrendingUp, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg px-3 py-2.5 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <p className="text-[#71717A] text-xs mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[#111111] font-semibold text-[0.8rem]">
          {p.name}:{' '}
          <span className="font-normal text-[#3F3F46]">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── KPI Card com borda colorida esquerda ────────────────────────── */
function KpiCard({
  label, value, icon: Icon, delta, deltaLabel, color, danger,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  delta?: string
  deltaLabel?: string
  color: string
  danger?: boolean
}) {
  return (
    <div className="flex items-stretch bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="w-[3.5px] flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">{label}</span>
          <Icon size={14} className="text-[#A1A1AA]" strokeWidth={1.75} />
        </div>
        <div>
          <p
            className="text-[2rem] font-bold tracking-tight leading-none"
            style={{ color: danger && Number(value) > 0 ? '#DC2626' : '#111111' }}
          >
            {value}
          </p>
          {delta && (
            <p className="text-xs text-[#71717A] mt-2">{delta} {deltaLabel}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Cabeçalho de seção simples ───────────────────────────────────── */
function SectionHeader({
  title, subtitle, extra,
}: {
  title: string
  subtitle?: string
  color?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#F4F4F5]">
      <div>
        <span className="font-semibold text-sm text-[#111111]">{title}</span>
        {subtitle && <p className="text-[0.7rem] text-[#A1A1AA] mt-0.5">{subtitle}</p>}
      </div>
      {extra}
    </div>
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
    }
  }, [tasks, entries, dateFrom, dateTo])

  const chartData = useMemo(() => {
    const data: { label: string; Concluídas: number; Criadas: number; Horas: number }[] = []
    let cur = new Date(dateFrom + 'T00:00:00')
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
    <div className="flex flex-col gap-4">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Dashboard</h1>
          <p className="text-sm text-[#71717A] mt-0.5">Produtividade da equipe</p>
        </div>
        <div className="flex items-center gap-1 border border-[#E4E4E7] rounded-lg bg-white px-3 py-2 text-sm text-[#3F3F46]">
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer"
            style={{ colorScheme: 'light' }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-[#A1A1AA] select-none px-1">–</span>
          <input
            type="date"
            className="border-0 bg-transparent text-sm text-[#3F3F46] outline-none cursor-pointer"
            style={{ colorScheme: 'light' }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-2 xl:grid-cols-4 gap-3"
      >
        <KpiCard label="Tarefas no período" value={metrics.tasksInPeriod} icon={TrendingUp} color="#3b82f6" />
        <KpiCard label="Horas registradas"  value={metrics.hoursInPeriod}  icon={Clock}        color="#22c55e" />
        <KpiCard label="Tarefas atrasadas"  value={metrics.delayedTasks}   icon={AlertTriangle} color="#ef4444" danger />
        <KpiCard label="Produtividade geral" value={metrics.productivity}  icon={CheckCircle2}  color="#f59e0b" />
      </motion.div>

      {/* Gráficos */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-3"
      >
        {/* Produtividade */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-3">
          <SectionHeader
            title="Produtividade no Período"
            color="#3b82f6"
            extra={
              <div className="flex items-center gap-3 text-xs text-[#71717A]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2563EB] inline-block rounded-full" />Criadas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#16A34A] inline-block rounded-full" />Concluídas
                </span>
              </div>
            }
          />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="grad-concluidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-criadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#E4E4E7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E4E4E7' }} />
                <Area type="monotone" dataKey="Concluídas" stroke="#16A34A" strokeWidth={1.5} fill="url(#grad-concluidas)" dot={false} activeDot={{ r: 3, fill: '#16A34A', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Criadas" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#grad-criadas)" dot={false} activeDot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horas */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-2">
          <SectionHeader title="Horas Trabalhadas" color="#22c55e" />
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#E4E4E7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F4F5' }} />
                <Bar dataKey="Horas" fill="#2563EB" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Distribuição por Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.25 }}
        className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <SectionHeader
          title="Distribuição por Status"
          color="#64748b"
          subtitle={`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} no total`}
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-[#E4E4E7]">
          {STATUS_DIST.map(s => {
            const count = tasks.filter(t => t.status === s.key).length
            const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0
            return (
              <div key={s.key} className="px-5 py-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-[#71717A]">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-[#111111] tracking-tight">{count}</p>
                <p className="text-xs text-[#A1A1AA]">{pct}% do total</p>
              </div>
            )
          })}
        </div>
      </motion.div>

    </div>
  )
}
