'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { STATUSES, STATUS_COLORS, formatMinutes } from '@/types'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import {
  Printer, AlertTriangle, Users, Tag, Clock,
  Download, PieChart as PieChartIcon, BarChart2,
  ListChecks, TrendingUp,
} from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Progress } from '@/components/ui/progress'

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
  hint,
  accentColor = '#2563EB',
  accentBg = '#EFF6FF',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  accentColor?: string
  accentBg?: string
}) {
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
      <div className="text-[1.875rem] font-mono font-bold text-[#0F172A] leading-none tabular-nums tracking-[-0.02em]">
        {value}
      </div>
      {hint && <div className="text-[0.72rem] text-[#A1A1AA] mt-2">{hint}</div>}
    </div>
  )
}

export default function RelatoriosPage() {
  const { tasks } = useTasks()
  const { entries } = useTimeEntries()
  const { users } = useUsers()
  const { categories } = useCategories()

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
        const totalMin = userEntries.reduce((s, e) => s + e.duracao, 0)
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
      .map((c) => ({
        name: c.nome,
        total: tasks.filter((t) => t.categoria === c.nome).length,
        horas:
          Math.round(
            (entries
              .filter((e) => tasks.find((t) => t.id === e.tarefa_id && t.categoria === c.nome))
              .reduce((s, e) => s + e.duracao, 0) /
              60) *
              10,
          ) / 10,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)

    const exceeded = tasks.filter(
      (t) =>
        t.tempo_estimado > 0 &&
        t.tempo_gasto_total > t.tempo_estimado &&
        t.status !== 'Concluída',
    )

    const totalHoras = Math.round((entries.reduce((s, e) => s + e.duracao, 0) / 60) * 10) / 10
    const concluidas = tasks.filter((t) => t.status === 'Concluída').length
    const pctConcluidas =
      tasks.length > 0 ? Math.round((concluidas / tasks.length) * 100) : 0
    const pendentes = tasks.filter((t) => t.status !== 'Concluída').length

    return {
      byStatus,
      byUser,
      byCategory,
      exceeded,
      totalHoras,
      concluidas,
      pctConcluidas,
      pendentes,
    }
  }, [tasks, entries, users, categories])

  const handleExportCSV = () => {
    const rows = [
      ['Título', 'Status', 'Prioridade', 'Categoria', 'Responsável', 'Prazo', 'Tempo Estimado (min)', 'Tempo Gasto (min)'],
      ...tasks.map((t) => {
        const resp = users.find((u) => u.id === t.responsavel_id)
        return [
          t.titulo, t.status, t.prioridade, t.categoria, resp?.nome || '',
          t.data_prazo || '', String(t.tempo_estimado), String(t.tempo_gasto_total),
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

  return (
    <div className="pb-10">
      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <BarChart2 size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{tasks.length}</span> tarefas analisadas
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Relatórios
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5 max-w-[58ch]">
            Acompanhe produtividade, distribuição de tarefas e tempo investido pela equipe.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="h-9 flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] active:scale-[0.98] text-[#3F3F46] text-sm font-medium px-3.5 rounded-lg transition-all cursor-pointer"
          >
            <Printer size={13} /> Imprimir
          </button>
          <button
            onClick={handleExportCSV}
            className="h-9 flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer"
          >
            <Download size={13} strokeWidth={2.5} /> Exportar CSV
          </button>
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
            hint={`${stats.concluidas} de ${tasks.length} concluídas`}
            accentColor="#16A34A"
            accentBg="#F0FDF4"
          />
          <Kpi
            icon={Clock}
            label="Horas registradas"
            value={`${stats.totalHoras}h`}
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
                <div className="flex flex-col items-center justify-center py-10 text-[#A1A1AA] gap-2">
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
                <div className="flex flex-col items-center justify-center py-12 text-[#A1A1AA] gap-2">
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
            </div>
          </Section>
        </motion.div>

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
                <div className="flex flex-col items-center justify-center py-10 text-[#A1A1AA] gap-2">
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
                    return (
                      <li
                        key={user.id}
                        className="group flex gap-4 p-4 rounded-xl border border-[#EDEEF1] bg-white hover:border-[#2563EB]/30 hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.18)] transition-all"
                      >
                        <UserAvatar user={user} size={40} textSize="text-[13px]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="font-semibold text-[0.92rem] text-[#111111] truncate">
                              {user.nome}
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
                              <span className="text-[#A1A1AA]"> / {total}</span> concluídas
                            </span>
                            <span className="text-[#D4D4D8]">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock size={11} className="text-[#A1A1AA]" />
                              {hours}h
                            </span>
                          </div>
                          <Progress value={pct} className={`h-1.5 ${pctBarClass}`} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Section>
        </motion.div>

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
                          <div className="text-[0.78rem] text-[#A1A1AA] mt-0.5">
                            {resp.nome}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[0.9rem] text-[#DC2626] font-bold tabular-nums">
                          {pct}% usado
                        </div>
                        <div className="text-[0.72rem] text-[#A1A1AA] tabular-nums">
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
  )
}
