import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { loadTaskAndCheck } from '@/lib/task-access'

type Params = { params: Promise<{ id: string }> }

/**
 * Lançamentos de tempo de UMA tarefa — lê apenas a subcoleção
 * `tasks/{id}/time_entries`, em vez do collectionGroup global (que varre
 * todos os lançamentos do banco). Muito mais barato em leituras do Firestore.
 */
export async function GET(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const access = await loadTaskAndCheck(id, user)
  if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  if (!access.allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const snap = await access.ref.collection('time_entries').orderBy('criado_em', 'desc').get()
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ entries })
}
