import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'
import { loadTaskAndCheck } from '@/lib/task-access'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const access = await loadTaskAndCheck(id, user)
    if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    if (!access.allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const snap = await access.ref.collection('subtasks').orderBy('ordem', 'asc').get()
    const subtasks = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ subtasks })
  } catch (e: any) {
    console.error('[subtasks GET]', e)
    return NextResponse.json({ error: 'Erro ao buscar subtarefas' }, { status: 500 })
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

    const access = await loadTaskAndCheck(id, user)
    if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    if (!access.allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const taskRef = access.ref
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
    console.error('[subtasks POST]', e)
    return NextResponse.json({ error: 'Erro ao criar subtarefa' }, { status: 500 })
  }
}
