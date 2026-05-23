import useSWR, { mutate as globalMutate } from 'swr'
import type { Subtask } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'

/**
 * Helper: revalida a lista global de tarefas (/api/tasks) em paralelo com
 * a sub-coleção local. Necessário porque o card do Kanban (e a Lista)
 * lê o contador `subtasks`/`_count.subtasks` do payload de /api/tasks —
 * sem essa revalidação, o card mostra contagem velha após CUD de subtarefas.
 */
async function refreshTasksList() {
  await globalMutate('/api/tasks')
}

export function useSubtasks(taskId: string | null) {
  const { data, isLoading, mutate } = useSWR<{ subtasks: Subtask[] }>(
    taskId ? `/api/tasks/${taskId}/subtasks` : null,
    apiFetcher
  )

  const subtasks = data?.subtasks ?? []

  const addSubtask = async (titulo: string): Promise<Subtask> => {
    if (!taskId) throw new Error('taskId obrigatório')
    const res = await apiFetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao adicionar subtarefa')
    await Promise.all([mutate(), refreshTasksList()])
    return json.subtask
  }

  const toggleSubtask = async (id: string): Promise<Subtask> => {
    if (!taskId) throw new Error('taskId obrigatório')
    const subtask = subtasks.find(s => s.id === id)
    if (!subtask) throw new Error('Subtarefa não encontrada')
    const res = await apiFetch(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concluida: !subtask?.concluida })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar subtarefa')
    await Promise.all([mutate(), refreshTasksList()])
    return json.subtask
  }

  const updateSubtask = async (id: string, updates: Partial<Pick<Subtask, 'titulo' | 'concluida' | 'ordem'>>): Promise<Subtask> => {
    const res = await apiFetch(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar subtarefa')
    await Promise.all([mutate(), refreshTasksList()])
    return json.subtask
  }

  const deleteSubtask = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir subtarefa')
    }
    await Promise.all([mutate(), refreshTasksList()])
  }

  const completedCount = subtasks.filter(s => s.concluida).length
  const totalCount = subtasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return {
    subtasks,
    addSubtask,
    toggleSubtask,
    updateSubtask,
    deleteSubtask,
    isLoading,
    mutate,
    completedCount,
    totalCount,
    progress
  }
}
