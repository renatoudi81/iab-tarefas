'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { STATUS_COLORS, PRIORITY_COLORS, todayStr } from '@/types'
import { GanttChart, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyIllustration } from '@/components/ui/EmptyIllustration'

type ColorBy = 'status' | 'prioridade'

function getWeeks(minDate: string, maxDate: string): { label: string; left: number }[] {
  const weeks: { label: string; left: number }[] = []
  const start = new Date(minDate + 'T00:00:00')
  const end = new Date(maxDate + 'T00:00:00')
  const totalMs = end.getTime() - start.getTime() || 1
  const d = new Date(start)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  while (d <= end) {
    const left = Math.max(0, (d.getTime() - start.getTime()) / totalMs * 100)
    if (left <= 100)
      weeks.push({ label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), left })
    d.setDate(d.getDate() + 7)
  }
  return weeks
}

function GanttSkeleton() {
  // 6 barras com offsets e larguras variadas pulsando — sugere uma timeline real
  const bars = [
    { offset: 5, width: 35 },
    { offset: 20, width: 50 },
    { offset: 12, width: 28 },
    { offset: 35, width: 45 },
    { offset: 8, width: 60 },
    { offset: 28, width: 40 },
  ]
  return (
    <div>
      <div className="mb-6 space-y-2">
        <div className="h-5 w-32 bg-[#F4F4F5] rounded-full animate-pulse" />
        <div className="h-8 w-28 bg-[#F4F4F5] rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-[#F4F4F5] rounded animate-pulse" />
      </div>
      <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] p-5">
        {/* Week ticks */}
        <div className="flex justify-between mb-4 px-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 w-12 bg-[#F4F4F5] rounded animate-pulse" />
          ))}
        </div>
        {/* Task bars */}
        <div className="space-y-3">
          {bars.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-28 bg-[#F4F4F5] rounded animate-pulse flex-shrink-0" />
              <div className="flex-1 h-6 bg-[#F7F8FA] rounded-md relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-[#E4E4E7] rounded-md animate-pulse"
                  style={{
                    left: `${b.offset}%`,
                    width: `${b.width}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function GanttPage() {
  const { tasks, isLoading: loadingTasks } = useTasks()
  const today = todayStr()
  const [colorBy, setColorBy] = useState<ColorBy>('status')

  const tasksWithDates = useMemo(() =>
    tasks.filter(t => t.data_inicio && t.data_prazo)
      .sort((a, b) => (a.data_inicio || '') < (b.data_inicio || '') ? -1 : 1),
    [tasks]
  )

  if (loadingTasks && tasks.length === 0) {
    return <GanttSkeleton />
  }

  if (tasksWithDates.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <GanttChart size={11} strokeWidth={2.5} />
              Timeline
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Gantt
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5 max-w-[58ch]">
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
  const weeks = getWeeks(minDate, maxDate)

  const getColor = (task: any) =>
    colorBy === 'status'
      ? STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
      : PRIORITY_COLORS[task.prioridade as keyof typeof PRIORITY_COLORS]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
              <GanttChart size={11} strokeWidth={2.5} />
              <span className="font-mono tabular-nums">{tasksWithDates.length}</span> agendadas
            </span>
            <span className="inline-flex items-center text-[0.7rem] font-mono tabular-nums text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
              {minDate} → {maxDate}
            </span>
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.1]">
            Gantt
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5 max-w-[58ch]">
            Acompanhe a linha do tempo do projeto — barras coloridas indicam {colorBy === 'status' ? 'status' : 'prioridade'}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#71717A] font-medium text-sm">Colorir por:</span>
          <Select value={colorBy} onValueChange={v => setColorBy(v as ColorBy)}>
            <SelectTrigger className="w-[140px] h-9 text-sm border-[#E4E4E7] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="prioridade">Prioridade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-[#EDEEF1] rounded-2xl shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)] overflow-x-auto">
        <div className="p-6 pb-4" style={{ minWidth: '700px' }}>
          {/* Timeline ruler */}
          <div className="flex mb-4 relative h-7" style={{ marginLeft: '240px' }}>
            {weeks.map((w, i) => (
              <span
                key={i}
                className="absolute text-[0.68rem] text-[#A1A1AA] font-medium whitespace-nowrap"
                style={{ left: `${w.left}%`, transform: 'translateX(-50%)', top: 0 }}
              >
                {w.label}
              </span>
            ))}
            {todayPct !== null && (
              <span
                className="absolute text-[0.68rem] text-[#DC2626] font-bold whitespace-nowrap"
                style={{ left: `${todayPct}%`, top: 0, transform: 'translateX(-50%)' }}
              >
                Hoje
              </span>
            )}
          </div>

          {/* Rows */}
          {tasksWithDates.map((task, idx) => {
            const color = getColor(task)
            const pct = task.tempo_estimado > 0
              ? Math.min(100, (task.tempo_gasto_total / task.tempo_estimado) * 100)
              : 0
            const isOver = task.tempo_gasto_total > task.tempo_estimado && task.tempo_estimado > 0
            const overdue = task.data_prazo && task.data_prazo < today && task.status !== 'Concluída'
            const shortId = task.id.slice(-5).toUpperCase()

            return (
              <div key={task.id} className="flex items-center mb-2.5 gap-0">
                {/* Task name column */}
                <div className="w-[240px] flex-shrink-0 pr-4">
                  <div className="flex items-center gap-1 mb-0.5 min-w-0">
                    <span className="text-[0.63rem] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] px-1.5 py-[2px] rounded flex-shrink-0">
                      #{shortId}
                    </span>
                    {task.categoria && (
                      <span className="text-[0.63rem] px-1.5 py-[2px] rounded font-medium bg-[#F4F4F5] text-[#52525B] truncate min-w-0">
                        {task.categoria}
                      </span>
                    )}
                  </div>
                  <p className="text-[0.8125rem] font-medium text-[#111111] truncate" title={task.titulo}>
                    {overdue && (
                      <AlertTriangle size={11} className="inline text-[#DC2626] mr-1 align-middle" />
                    )}
                    {task.titulo}
                  </p>
                </div>

                {/* Bar track */}
                <div className="flex-1 relative h-9">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-[#E4E4E7] opacity-60 z-0"
                      style={{ left: `${w.left}%` }}
                    />
                  ))}
                  {todayPct !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#DC2626] z-10 opacity-80"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}
                  <div className="absolute inset-[8px_0] bg-[#F7F8FA] rounded-md" />
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${width(task.data_inicio!, task.data_prazo!)}%`, opacity: 1 }}
                    transition={{ delay: idx * 0.04, duration: 0.45, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      left: `${offset(task.data_inicio!)}%`,
                      top: '6px',
                      bottom: '6px',
                      background: color + 'dd',
                      borderRadius: '6px',
                      zIndex: 2,
                      overflow: 'hidden',
                      boxShadow: `0 0 0 1.5px ${color}`,
                    }}
                  >
                    {pct > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-[inherit]"
                        style={{
                          width: `${pct}%`,
                          background: isOver ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.25)',
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center h-full pl-1.5 gap-1">
                      <span className="text-[0.68rem] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                        {task.status}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* End date + time */}
                <div className="w-[100px] flex-shrink-0 pl-3 text-right">
                  <div className={cn(
                    'text-[0.72rem]',
                    overdue ? 'text-[#DC2626] font-semibold' : 'text-[#71717A] font-normal'
                  )}>
                    {task.data_prazo}
                  </div>
                  {task.tempo_estimado > 0 && (
                    <div className={cn(
                      'text-[0.68rem] flex items-center gap-0.5 justify-end mt-0.5',
                      isOver ? 'text-[#DC2626]' : 'text-[#A1A1AA]'
                    )}>
                      <Clock size={9} />
                      {Math.round(pct)}%
                    </div>
                  )}
                </div>
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
              Tempo usado
            </div>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#DC2626]">
              <AlertTriangle size={11} /> Prazo vencido
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
