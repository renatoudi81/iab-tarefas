/**
 * Autorização de acesso a uma tarefa (server-side).
 *
 * Regra única reaproveitada por todas as rotas que tocam uma tarefa ou
 * suas subcoleções (subtasks, comments, history) e por time-entries:
 *   pode acessar se for Administrador OU responsável OU membro da equipe.
 *
 * Centraliza o gate que antes só existia no PATCH /api/tasks/[id], evitando
 * IDOR nas demais rotas.
 */
import { adminDb } from './firebase-admin'
import type { AuthUser } from './verify-auth'

export function canAccessTaskData(
  user: Pick<AuthUser, 'uid' | 'perfil'>,
  taskData: { responsavel_id?: string | null; equipe?: unknown },
): boolean {
  if (user.perfil === 'Administrador') return true
  if (taskData.responsavel_id === user.uid) return true
  if (Array.isArray(taskData.equipe) && taskData.equipe.includes(user.uid)) return true
  return false
}

type LoadResult =
  | { exists: false }
  | { exists: true; ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown>; allowed: boolean }

/** Carrega a tarefa pai e já calcula se o usuário pode acessá-la. */
export async function loadTaskAndCheck(
  taskId: string,
  user: Pick<AuthUser, 'uid' | 'perfil'>,
): Promise<LoadResult> {
  const ref = adminDb.collection('tasks').doc(taskId)
  const snap = await ref.get()
  if (!snap.exists) return { exists: false }
  const data = snap.data() as Record<string, unknown>
  return { exists: true, ref, data, allowed: canAccessTaskData(user, data as { responsavel_id?: string | null; equipe?: unknown }) }
}
