import useSWR from 'swr'
import type { Notification } from '@/types'
import { apiFetch, apiFetcher } from '@/lib/api-fetch'

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR<{ notifications: Notification[] }>(
    '/api/notifications',
    apiFetcher,
    { refreshInterval: 30000 }
  )

  const notifications = data?.notifications ?? []
  const unreadCount = notifications.filter(n => !n.lida).length

  const markRead = async (id: string): Promise<void> => {
    const res = await apiFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao marcar notificação como lida')
    }
    await mutate()
  }

  const markAllRead = async (): Promise<void> => {
    const res = await apiFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Erro ao marcar todas como lidas')
    }
    await mutate()
  }

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    isLoading,
    mutate,
  }
}
