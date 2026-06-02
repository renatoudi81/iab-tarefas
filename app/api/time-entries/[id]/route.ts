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

/**
 * Localiza o lançamento e valida permissão (admin OU dono).
 * Se `tarefaId` for conhecido (passado pelo cliente), acessa o documento
 * DIRETO em tasks/{tarefaId}/time_entries/{id} — 1 leitura. Sem ele, cai
 * no fallback collectionGroup (varre todos os lançamentos), mantido só por
 * compatibilidade.
 */
async function findEntry(id: string, tarefaId: string | null, userId: string, perfil: string) {
  if (tarefaId) {
    const ref = adminDb.collection('tasks').doc(tarefaId).collection('time_entries').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return { ok: false as const, error: 'Lançamento não encontrado', status: 404 }
    const entry = snap.data() as { usuario_id?: string; tarefa_id: string }
    if (perfil !== 'Administrador' && entry.usuario_id !== userId) {
      return { ok: false as const, error: 'Sem permissão', status: 403 }
    }
    return { ok: true as const, ref, entry: { ...entry, tarefa_id: entry.tarefa_id || tarefaId } }
  }

  // Fallback: time_entries são subcoleções — collectionGroup acha o doc sem o pai
  const snap = await adminDb.collectionGroup('time_entries').get()
  const doc = snap.docs.find(d => d.id === id)
  if (!doc) return { ok: false as const, error: 'Lançamento não encontrado', status: 404 }
  const entry = doc.data() as { usuario_id?: string; tarefa_id: string }
  if (perfil !== 'Administrador' && entry.usuario_id !== userId) {
    return { ok: false as const, error: 'Sem permissão', status: 403 }
  }
  return { ok: true as const, ref: doc.ref, entry }
}

export async function PATCH(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const tarefaId = new URL(req.url).searchParams.get('tarefaId')
  const found = await findEntry(id, tarefaId, authUser.uid, authUser.perfil)
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
  if (body.atividade !== undefined) {
    update.atividade = String(body.atividade || '').slice(0, 60)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  await found.ref.update(update)
  // Só recomputa o total da tarefa quando a duração muda
  if (update.duracao !== undefined) {
    await recomputeTaskTotal(found.entry.tarefa_id)
  }

  const fresh = await found.ref.get()
  return NextResponse.json({ entry: { id: fresh.id, ...fresh.data() } })
}

export async function DELETE(req: Request, { params }: Params) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const tarefaId = new URL(req.url).searchParams.get('tarefaId')
  const found = await findEntry(id, tarefaId, authUser.uid, authUser.perfil)
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status })

  const taskId = found.entry.tarefa_id
  await found.ref.delete()
  await recomputeTaskTotal(taskId)

  return NextResponse.json({ ok: true })
}
