import useSWR from 'swr'
import type { Task, TaskFormData } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<{ tasks: Task[] }>(
    '/api/tasks',
    apiFetcher,
    { refreshInterval: 30000 }
  )

  const tasks = data?.tasks ?? []
  // True até a primeira resposta (data ou erro) chegar. Mais confiável
  // que isLoading do SWR para evitar flash de "empty state" antes do load.
  const isInitialLoad = data === undefined && error === undefined

  const addTask = async (taskData: TaskFormData): Promise<Task> => {
    const res = await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao criar tarefa')
    await mutate()
    return json.task
  }

  const updateTask = async (id: string, updates: Partial<TaskFormData>): Promise<Task> => {
    // Atualização otimista: reflete a mudança na UI imediatamente,
    // sem esperar a resposta do servidor (evita o card "voltar" durante o drag)
    mutate(
      (current) => ({
        tasks: (current?.tasks ?? []).map(t =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }),
      { revalidate: false }
    )

    try {
      const res = await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar tarefa')
      // Confirma com os dados reais do servidor
      await mutate()
      return json.task
    } catch (e) {
      // Reverte para o dado real em caso de erro
      await mutate()
      throw e
    }
  }

  const deleteTask = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir tarefa')
    }
    await mutate()
  }

  return { tasks, isLoading, isInitialLoad, error, mutate, addTask, updateTask, deleteTask }
}
