'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useProjects } from '@/hooks/useProjects'
import {
  DetalhesTab, SubtarefasTab, ComentariosTab, TempoTab, HistoricoTab,
} from '@/components/TaskDrawer'
import TaskModal from '@/components/TaskModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft, Pencil, FileText, ListChecks, MessageSquare, Clock, History as HistoryIcon,
} from 'lucide-react'
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS } from '@/types'
import { getCategoryColor } from '@/lib/category-color'

export default function TarefaPage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const router = useRouter()
  const { tasks, isLoading, isInitialLoad } = useTasks()
  const { users } = useUsers()
  const { projects } = useProjects()
  const [editing, setEditing] = useState(false)

  const task = tasks.find((t) => t.id === id)

  // Loading inicial
  if (isInitialLoad || (isLoading && !task)) {
    return (
      <div className="pb-10 max-w-5xl animate-pulse">
        <div className="h-4 w-20 rounded bg-[#F4F4F5] mb-6" />
        <div className="h-7 w-2/3 rounded-md bg-[#F4F4F5] mb-3" />
        <div className="h-4 w-40 rounded bg-[#F4F4F5] mb-8" />
        <div className="h-9 w-full rounded-lg bg-[#F4F4F5] mb-4" />
        <div className="h-64 w-full rounded-2xl bg-[#F4F4F5]" />
      </div>
    )
  }

  // Tarefa inexistente
  if (!task) {
    return (
      <div className="pb-10 max-w-5xl flex flex-col items-center justify-center py-20 text-center gap-3">
        <FileText size={40} className="text-[#D4D4D8]" />
        <h1 className="text-lg font-bold text-[#0F172A]">Tarefa não encontrada</h1>
        <p className="text-sm text-[#71717A]">Ela pode ter sido excluída ou o link está incorreto.</p>
        <button
          onClick={() => router.push('/kanban')}
          className="mt-2 h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium px-4 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Voltar ao Kanban
        </button>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[task.status]
  const prioColor = PRIORITY_COLORS[task.prioridade]
  const projeto = projects.find((p) => p.id === task.projeto_id)
  const catColor = task.categoria ? getCategoryColor(task.categoria) : null

  const tabTriggerCls =
    'gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-[0.82rem]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="pb-10 max-w-5xl"
    >
      {/* Voltar */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-[#71717A] hover:text-[#111111] transition-colors cursor-pointer mb-4"
      >
        <ArrowLeft size={15} /> Voltar
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusColor + '18', color: statusColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
              {STATUS_LABELS[task.status]}
            </span>
            <span
              className="text-[0.62rem] font-bold uppercase tracking-wider px-2 py-[3px] rounded-full"
              style={{ background: prioColor + '22', color: prioColor }}
            >
              {task.prioridade}
            </span>
            {catColor && (
              <span
                className="inline-flex items-center gap-1 text-[0.65rem] font-semibold px-1.5 py-[2px] rounded"
                style={{ background: catColor.bg, color: catColor.hex }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor.hex }} />
                {task.categoria}
              </span>
            )}
          </div>
          <h1 className="text-[1.875rem] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.15] break-words">
            {task.titulo}
          </h1>
          <p className="text-[#71717A] text-sm mt-1.5">
            {projeto?.nome || 'Sem projeto'}
            {task.categoria ? ` · ${task.categoria}` : ''}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="h-9 inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-medium px-4 rounded-lg shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] transition-all cursor-pointer flex-shrink-0"
        >
          <Pencil size={14} /> Editar
        </button>
      </div>

      {/* Abas — reusa os mesmos componentes do TaskDrawer */}
      <Tabs defaultValue="detalhes">
        <TabsList className="bg-[#F4F4F5] flex-wrap h-auto">
          <TabsTrigger value="detalhes" className={tabTriggerCls}><FileText size={14} /> Detalhes</TabsTrigger>
          <TabsTrigger value="subtarefas" className={tabTriggerCls}><ListChecks size={14} /> Subtarefas</TabsTrigger>
          <TabsTrigger value="comentarios" className={tabTriggerCls}><MessageSquare size={14} /> Comentários</TabsTrigger>
          <TabsTrigger value="tempo" className={tabTriggerCls}><Clock size={14} /> Tempo</TabsTrigger>
          <TabsTrigger value="historico" className={tabTriggerCls}><HistoryIcon size={14} /> Histórico</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-[#EDEEF1] rounded-2xl p-6 mt-4 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.08)]">
          <TabsContent value="detalhes" className="mt-0">
            <DetalhesTab task={task} users={users} projects={projects} />
          </TabsContent>
          <TabsContent value="subtarefas" className="mt-0">
            <SubtarefasTab taskId={task.id} />
          </TabsContent>
          <TabsContent value="comentarios" className="mt-0">
            <ComentariosTab taskId={task.id} />
          </TabsContent>
          <TabsContent value="tempo" className="mt-0">
            <TempoTab task={task} />
          </TabsContent>
          <TabsContent value="historico" className="mt-0">
            <HistoricoTab taskId={task.id} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal de edição (reusa o TaskModal) */}
      {editing && (
        <TaskModal
          open={editing}
          task={task}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </motion.div>
  )
}
