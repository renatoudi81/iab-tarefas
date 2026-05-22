'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { STATUSES, STATUS_COLORS, getInitials, formatMinutes } from '@/types'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Printer, AlertTriangle, Users, Tag, Clock, Download, PieChart as PieChartIcon, BarChart2 } from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#E4E4E7] bg-white px-3.5 py-2.5 shadow-lg text-[0.8125rem]">
      <p className="font-bold" style={{ color: payload[0].payload.color || payload[0].fill }}>
        {payload[0].name || payload[0].dataKey}
      </p>
      <p className="text-[#111111]">{payload[0].value}</p>
    </div>
  )
}

/* ─── Cabeçalho de seção simples ───────────────────────────────────── */
function SectionHeader({
  title,
  count,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  count?: number | string
  subtitle?: string
  icon?: React.ElementType
  color?: string
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F4F4F5]">
      <span className="font-semibold text-sm text-[#111111] flex-1">{title}</span>
      {count !== undefined && (
        <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] text-[#71717A] min-w-[20px] text-center">
          {count}
        </span>
      )}
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
      .map(s => ({ name: s, value: tasks.filter(t => t.status === s).length, color: STATUS_COLORS[s] }))
      .filter(s => s.value > 0)

    const byUser = users.map(u => {
      const userTasks = tasks.filter(t => t.responsavel_id === u.id)
      const userEntries = entries.filter(e => e.usuario_id === u.id)
      const totalMin = userEntries.reduce((s, e) => s + e.duracao, 0)
      const done = userTasks.filter(t => t.status === 'Concluída').length
      return {
        user: u,
        total: userTasks.length,
        done,
        hours: Math.round(totalMin / 60 * 10) / 10,
        pct: userTasks.length > 0 ? Math.round((done / userTasks.length) * 100) : 0,
      }
    }).filter(u => u.total > 0).sort((a, b) => b.done - a.done)

    const byCategory = categories.map(c => ({
      name: c.nome,
      total: tasks.filter(t => t.categoria === c.nome).length,
      horas: Math.round(
        entries
          .filter(e => tasks.find(t => t.id === e.tarefa_id && t.categoria === c.nome))
          .reduce((s, e) => s + e.duracao, 0) / 60 * 10
      ) / 10,
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    const exceeded = tasks.filter(
      t => t.tempo_estimado > 0 && t.tempo_gasto_total > t.tempo_estimado && t.status !== 'Concluída'
    )

    const totalHoras = Math.round(entries.reduce((s, e) => s + e.duracao, 0) / 60 * 10) / 10

    return { byStatus, byUser, byCategory, exceeded, totalHoras }
  }, [tasks, entries, users, categories])

  const handleExportCSV = () => {
    const rows = [
      ['Título', 'Status', 'Prioridade', 'Categoria', 'Responsável', 'Prazo', 'Tempo Estimado (min)', 'Tempo Gasto (min)'],
      ...tasks.map(t => {
        const resp = users.find(u => u.id === t.responsavel_id)
        return [t.titulo, t.status, t.prioridade, t.categoria, resp?.nome || '', t.data_prazo || '', String(t.tempo_estimado), String(t.tempo_gasto_total)]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tarefas.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-7 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Relatórios</h1>
          <p className="text-[#71717A] text-sm mt-0.5">
            {tasks.length} tarefas · {stats.totalHoras}h registradas no total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] text-[#3F3F46] text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={13} /> Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-[#E4E4E7] bg-white hover:bg-[#F7F8FA] text-[#3F3F46] text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={13} /> Imprimir
          </button>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">

        {/* Row 1: Status donut + Category bar */}
        <motion.div variants={item} className="grid grid-cols-[1fr_2fr] gap-4">

          {/* Status donut */}
          <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={PieChartIcon}
              title="Distribuição por Status"
              count={stats.byStatus.length}
              color="#3b82f6"
              subtitle={`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''} no total`}
            />
            <div className="p-4">
              {stats.byStatus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#A1A1AA] gap-1.5">
                  <PieChartIcon size={28} className="opacity-20" />
                  <p className="text-sm">Sem tarefas cadastradas</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={stats.byStatus}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
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
                  <div className="flex flex-col gap-1.5 mt-2">
                    {stats.byStatus.map(({ name, value, color }) => (
                      <div key={name} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-[0.8rem] text-[#71717A]">{name}</span>
                        </div>
                        <span className="font-bold text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Categorias bar */}
          <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={Tag}
              title="Tarefas por Categoria"
              count={stats.byCategory.length}
              color="#f59e0b"
              subtitle={`${stats.byCategory.length} categoria${stats.byCategory.length !== 1 ? 's' : ''} com tarefas`}
            />
            <div className="p-4">
              {stats.byCategory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[#A1A1AA] gap-1.5">
                  <BarChart2 size={28} className="opacity-20" />
                  <p className="text-sm">Nenhuma categoria com tarefas</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, stats.byCategory.length * 36)}>
                  <BarChart data={stats.byCategory} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} tickLine={false} axisLine={false} width={100} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Tarefas" fill="#2563EB" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>

        {/* Row 2: Produtividade por usuário */}
        <motion.div variants={item}>
          <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <SectionHeader
              icon={Users}
              title="Produtividade por Usuário"
              count={stats.byUser.length}
              color="#22c55e"
              subtitle={`${stats.byUser.length} usuário${stats.byUser.length !== 1 ? 's' : ''} com tarefas atribuídas`}
            />
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {stats.byUser.map(({ user, total, done, hours, pct }) => (
                  <div
                    key={user.id}
                    className="flex gap-3 p-3 rounded-lg border border-[#E8E8EC] bg-[#F7F8FA] hover:bg-white transition-colors"
                  >
                    <UserAvatar user={user} size={36} textSize="text-[13px]" />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#111111] mb-0.5">{user.nome}</div>
                      <div className="text-xs text-[#71717A] mb-2 flex gap-3">
                        <span>{done}/{total} concluídas</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> {hours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={pct}
                          className={`flex-1 h-1.5 ${
                            pct >= 70
                              ? '[&>div]:bg-green-500'
                              : pct >= 40
                              ? '[&>div]:bg-amber-500'
                              : '[&>div]:bg-[#2563EB]'
                          }`}
                        />
                        <span
                          className={`text-xs font-bold flex-shrink-0 ${
                            pct >= 70
                              ? 'text-green-600'
                              : pct >= 40
                              ? 'text-amber-600'
                              : 'text-[#A1A1AA]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.byUser.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-8 text-[#A1A1AA] gap-1.5">
                    <Users size={28} className="opacity-20" />
                    <p className="text-sm">Nenhum usuário com tarefas atribuídas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Row 3: Tempo excedido */}
        {stats.exceeded.length > 0 && (
          <motion.div variants={item}>
            <div className="bg-white border border-[#E4E4E7] rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <SectionHeader
                icon={AlertTriangle}
                title="Tempo Excedido"
                count={stats.exceeded.length}
                color="#ef4444"
                subtitle={`${stats.exceeded.length} tarefa${stats.exceeded.length !== 1 ? 's' : ''} com tempo acima do estimado`}
              />
              <div className="flex flex-col divide-y divide-[#F4F4F5]">
                {stats.exceeded.map((task) => {
                  const excess = task.tempo_gasto_total - task.tempo_estimado
                  const pct = Math.round((task.tempo_gasto_total / task.tempo_estimado) * 100)
                  const resp = users.find(u => u.id === task.responsavel_id)
                  return (
                    <div key={task.id} className="flex justify-between items-center px-4 py-3 gap-4 hover:bg-[#FFF5F5] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[0.63rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0">
                            #{task.id.slice(-5).toUpperCase()}
                          </span>
                          {task.categoria && (
                            <span className="text-[0.63rem] px-1.5 py-[2px] rounded font-medium bg-[#F4F4F5] text-[#52525B] truncate">
                              {task.categoria}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-[#111111] truncate">{task.titulo}</div>
                        {resp && <div className="text-xs text-[#A1A1AA]">{resp.nome}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-[#DC2626] font-bold">{pct}% usado</div>
                        <div className="text-[0.72rem] text-[#A1A1AA]">+{formatMinutes(excess)} excedido</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
