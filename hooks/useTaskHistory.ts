import useSWR from 'swr'
import type { TaskHistory } from '@/types'
import { apiFetcher } from '@/lib/api-fetch'

export function useTaskHistory(taskId: string | null) {
  const { data, isLoading, mutate } = useSWR<{ history: TaskHistory[] }>(
    taskId ? `/api/tasks/${taskId}/history` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  )

  const history = data?.history ?? []

  return { history, isLoading, mutate }
}
