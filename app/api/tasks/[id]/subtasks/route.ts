import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const snap = await adminDb.collection('tasks').doc(id)
      .collection('subtasks').orderBy('ordem', 'asc').get()
    const subtasks = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ subtasks })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao buscar subtarefas', detail: e.message }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const { titulo } = body
    if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

    const taskRef = adminDb.collection('tasks').doc(id)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

    // Pega a última ordem para incrementar
    const lastSnap = await taskRef.collection('subtasks').orderBy('ordem', 'desc').limit(1).get()
    const ordem = lastSnap.empty ? 1 : ((lastSnap.docs[0].data() as any).ordem ?? 0) + 1

    const data = {
      tarefa_id: id,
      titulo: titulo.trim(),
      concluida: false,
      ordem,
      criado_em: new Date().toISOString(),
    }
    const ref = await taskRef.collection('subtasks').add(data)
    return NextResponse.json({ subtask: { id: ref.id, ...data } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro ao criar subtarefa', detail: e.message }, { status: 500 })
  }
}
