import useSWR from 'swr'
import type { Comment } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'

export function useComments(taskId: string | null) {
  const { data, isLoading, mutate } = useSWR<{ comments: Comment[] }>(
    taskId ? `/api/tasks/${taskId}/comments` : null,
    apiFetcher
  )

  const comments = data?.comments ?? []

  const addComment = async (texto: string): Promise<Comment> => {
    if (!taskId) throw new Error('taskId obrigatório')
    const res = await apiFetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao adicionar comentário')
    await mutate()
    return json.comment
  }

  const updateComment = async (commentId: string, texto: string): Promise<Comment> => {
    const res = await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao editar comentário')
    await mutate()
    return json.comment
  }

  const deleteComment = async (commentId: string): Promise<void> => {
    const res = await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao excluir comentário')
    }
    await mutate()
  }

  return { comments, addComment, updateComment, deleteComment, isLoading, mutate }
}
