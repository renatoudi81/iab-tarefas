import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

// Recomputa tempo_gasto_total da tarefa somando os lançamentos restantes
async function recomputeTaskTotal(tarefaId: string) {
  const ref = adminDb.collection('tasks').doc(tarefaId).collection('time_entries')
  const snap = await ref.get()
  const total = snap.docs.reduce((sum, d) => sum + Number((d.data() as { duracao?: number }).duracao || 0), 0)
  await adminDb.collection('tasks').doc(tarefaId).update({
    tempo_gasto_total: total,
    atualizado_em: new Date().toISOString(),
  })
}

// Localiza o lançamento (subcoleção) e valida permissão: admin OU dono.
// time_entries são subcoleções — collectionGroup acha o doc sem saber o task pai.
async function findEntry(id: string, userId: string, perfil: string) {
  const snap = await adminDb.collectionGroup('time_entries').get()
  const doc = snap.docs.find(d => d.id === id)
  if (!doc) return { ok: false as const, error: 'Lançamento não encontrado', status: 404 }
  const entry = doc.data() as { usuario_id?: string; tarefa_id: string }
  if (perfil !== 'Administrador' && entry.usuario_id !== userId) {
    return { ok: false as const, error: 'Sem permissão', status: 403 }
  }
  return { ok: true as const, doc, entry }
}

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const found = await findEntry(id, authUser.uid, authUser.perfil)
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (body.duracao !== undefined) {
    const dur = Number(body.duracao)
    if (!Number.isFinite(dur) || dur < 1 || dur > 60 * 24) {
      return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })
    }
    update.duracao = dur
  }
  if (body.data !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.data))) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    update.data = body.data
  }
  if (body.comentario !== undefined) {
    update.comentario = String(body.comentario || '').slice(0, 255)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  await found.doc.ref.update(update)
  // Só recomputa o total da tarefa quando a duração muda
  if (update.duracao !== undefined) {
    await recomputeTaskTotal(found.entry.tarefa_id)
  }

  const fresh = await found.doc.ref.get()
  return NextResponse.json({ entry: { id: fresh.id, ...fresh.data() } })
}

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const found = await findEntry(id, authUser.uid, authUser.perfil)
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status })

  const tarefaId = found.entry.tarefa_id
  await found.doc.ref.delete()
  await recomputeTaskTotal(tarefaId)

  return NextResponse.json({ ok: true })
}
