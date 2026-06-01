'use client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { TaskForm } from '@/components/TaskForm'
import type { Task, TaskFormData, Status } from '@/types'

interface TaskModalProps {
  /** Modal aberto? */
  open: boolean
  /** Tarefa existente (modo edição); null/undefined = nova */
  task?: Task | null
  /** Status pré-selecionado ao criar nova (útil no Kanban). Ignorado em edição. */
  initialStatus?: Status
  /** Pré-preenchimento parcial ao criar nova (vem da IA). Ignorado em edição. */
  initialData?: Partial<TaskFormData>
  onClose: () => void
  /** Callback opcional após save bem-sucedido (recebe a task atualizada/criada) */
  onSaved?: (task: Task) => void
}

/**
 * Modal de criar/editar tarefa. Wrapper fino sobre <TaskForm> — o formulário
 * é compartilhado com a página /tarefas/[id] (edição direta), evitando
 * duplicação. Aqui apenas o Dialog + cabeçalho.
 */
export default function TaskModal({ open, task, initialStatus, initialData, onClose, onSaved }: TaskModalProps) {
  const isEditing = !!task
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* max-h-[90vh] + flex column garante footer sempre visível mesmo
          com o form grande em modo edição. */}
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>
        {/* Monta o form só quando aberto → repopula a cada abertura */}
        {open && (
          <TaskForm
            task={task}
            initialStatus={initialStatus}
            initialData={initialData}
            variant="modal"
            onCancel={onClose}
            onSaved={(t) => { onSaved?.(t); onClose() }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
