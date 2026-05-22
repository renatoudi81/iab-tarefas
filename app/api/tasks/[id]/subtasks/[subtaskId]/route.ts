import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string; subtaskId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, subtaskId } = await params

  try {
    const body = await req.json()
    const { concluida, titulo } = body

    const ref = adminDb.collection('tasks').doc(id).collection('subtasks').doc(subtaskId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Subtarefa não encontrada' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (concluida !== undefined) data.concluida = Boolean(concluida)
    if (titulo !== undefined) data.titulo = String(titulo).trim()

    await ref.update(data)
    const updated = await ref.get()
    return NextResponse.json({ subtask: { id: updated.id, ...updated.data() } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao atualizar subtarefa', detail: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, subtaskId } = await params

  try {
    const ref = adminDb.collection('tasks').doc(id).collection('subtasks').doc(subtaskId)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Subtarefa não encontrada' }, { status: 404 })

    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao excluir subtarefa', detail: e.message }, { status: 500 })
  }
}
