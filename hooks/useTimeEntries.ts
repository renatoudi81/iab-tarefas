import useSWR, { useSWRConfig } from 'swr'
import type { TimeEntry } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'
import { useAuth } from '@/contexts/AuthContext'

export interface NewTimeEntry {
  tarefa_id: string
  duracao: number
  tipo?: 'manual' | 'automatico'
  hora_inicio?: string
  hora_fim?: string
  data?: string
  comentario?: string
  atividade?: string
}

/** Campos editáveis de um lançamento já existente */
export interface TimeEntryPatch {
  data?: string
  duracao?: number
  comentario?: string
  atividade?: string
}

export function useTimeEntries() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<{ entries: TimeEntry[] }>(
    user ? '/api/time-entries' : null,
    apiFetcher,
    { refreshInterval: 300000, revalidateOnFocus: false }
  )

  const entries = data?.entries ?? []

  const addTimeEntry = async (entryData: NewTimeEntry): Promise<TimeEntry> => {
    const res = await apiFetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao registrar tempo')
    await mutate()
    return json.entry
  }

  const updateTimeEntry = async (id: string, patch: TimeEntryPatch): Promise<TimeEntry> => {
    const res = await apiFetch(`/api/time-entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao editar lançamento')
    await mutate()
    return json.entry
  }

  const deleteTimeEntry = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir lançamento')
    }
    await mutate()
  }

  return { entries, isLoading, error, mutate, addTimeEntry, updateTimeEntry, deleteTimeEntry }
}

/**
 * Lançamentos de UMA tarefa. Lê só a subcoleção daquela task
 * (GET /api/tasks/[id]/time-entries) em vez do collectionGroup global —
 * muito menos leituras do Firestore. As mutações passam tarefaId para
 * acessar o documento direto (sem varrer todos os lançamentos).
 */
export function useTaskTimeEntries(taskId: string) {
  const { user } = useAuth()
  const { mutate: globalMutate } = useSWRConfig()
  const { data, isLoading, error, mutate } = useSWR<{ entries: TimeEntry[] }>(
    user && taskId ? `/api/tasks/${taskId}/time-entries` : null,
    apiFetcher,
    { revalidateOnFocus: false },
  )
  const entries = data?.entries ?? []

  // Invalida lista de tarefas — o servidor recomputa tempo_gasto_total
  // ao mexer em time_entries, entao a tarefa precisa ser relida.
  const invalidateTasks = () => globalMutate('/api/tasks')

  const addTimeEntry = async (entryData: NewTimeEntry): Promise<TimeEntry> => {
    const res = await apiFetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao registrar tempo')
    await Promise.all([mutate(), invalidateTasks()])
    return json.entry
  }

  const updateTimeEntry = async (id: string, patch: TimeEntryPatch): Promise<TimeEntry> => {
    const res = await apiFetch(`/api/time-entries/${id}?tarefaId=${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao editar lançamento')
    await Promise.all([mutate(), invalidateTasks()])
    return json.entry
  }

  const deleteTimeEntry = async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/time-entries/${id}?tarefaId=${encodeURIComponent(taskId)}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir lançamento')
    }
    await Promise.all([mutate(), invalidateTasks()])
  }

  return { entries, isLoading, error, mutate, addTimeEntry, updateTimeEntry, deleteTimeEntry }
}
