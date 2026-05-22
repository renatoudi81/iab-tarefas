import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const userId = authUser.uid
  const perfil = authUser.perfil

  // time_entries são subcoleções — collectionGroup acha o doc independente do task pai
  const snap = await adminDb.collectionGroup('time_entries').get()
  const doc = snap.docs.find(d => d.id === id)
  if (!doc) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })

  const entry = doc.data() as any
  if (perfil !== 'Administrador' && entry.usuario_id !== userId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const tarefaId = entry.tarefa_id
  await doc.ref.delete()

  // Recomputa total da tarefa
  const ref = adminDb.collection('tasks').doc(tarefaId).collection('time_entries')
  const remaining = await ref.get()
  const total = remaining.docs.reduce((sum, d) => sum + Number((d.data() as any).duracao || 0), 0)
  await adminDb.collection('tasks').doc(tarefaId).update({
    tempo_gasto_total: total,
    atualizado_em: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
