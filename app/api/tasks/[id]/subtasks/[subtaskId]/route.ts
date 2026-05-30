import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { loadTaskAndCheck } from '@/lib/task-access'

type Params = { params: Promise<{ id: string; subtaskId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, subtaskId } = await params

  try {
    const body = await req.json()
    const { concluida, titulo } = body

    const access = await loadTaskAndCheck(id, user)
    if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    if (!access.allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const ref = access.ref.collection('subtasks').doc(subtaskId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Subtarefa não encontrada' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (concluida !== undefined) data.concluida = Boolean(concluida)
    if (titulo !== undefined) {
      const t = String(titulo).trim()
      if (!t) return NextResponse.json({ error: 'Título não pode ser vazio' }, { status: 400 })
      data.titulo = t
    }

    await ref.update(data)
    const updated = await ref.get()
    return NextResponse.json({ subtask: { id: updated.id, ...updated.data() } })
  } catch (e: any) {
    console.error('[subtask PATCH]', e)
    return NextResponse.json({ error: 'Erro ao atualizar subtarefa' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, subtaskId } = await params

  try {
    const access = await loadTaskAndCheck(id, user)
    if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    if (!access.allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const ref = access.ref.collection('subtasks').doc(subtaskId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Subtarefa não encontrada' }, { status: 404 })

    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[subtask DELETE]', e)
    return NextResponse.json({ error: 'Erro ao excluir subtarefa' }, { status: 500 })
  }
}
