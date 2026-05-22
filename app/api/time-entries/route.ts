import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

// Recomputa tempo_gasto_total da tarefa somando todos os time_entries
async function recomputeTaskTotal(tarefaId: string) {
  const ref = adminDb.collection('tasks').doc(tarefaId).collection('time_entries')
  const snap = await ref.get()
  const total = snap.docs.reduce((sum, d) => sum + Number((d.data() as any).duracao || 0), 0)
  await adminDb.collection('tasks').doc(tarefaId).update({
    tempo_gasto_total: total,
    atualizado_em: new Date().toISOString(),
  })
  return total
}

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const isAdmin = user.perfil === 'Administrador'

  // Collection group query: pega todos os time_entries de todas as tasks
  const snap = await adminDb.collectionGroup('time_entries')
    .orderBy('criado_em', 'desc')
    .get()

  const allEntries = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  // Permissões: admin vê tudo. Outros perfis veem apenas seus próprios lançamentos.
  const entries = isAdmin ? allEntries : allEntries.filter(e => e.usuario_id === user.id)

  return NextResponse.json({ entries })
}

export async function POST(req: Request) {
  const authUser = await verifyAuth(req)
  if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { tarefa_id, duracao, tipo, hora_inicio, hora_fim, data } = body
  const userId = authUser.uid

  if (!tarefa_id) return NextResponse.json({ error: 'tarefa_id obrigatório' }, { status: 400 })
  if (!duracao || Number(duracao) < 1) return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })

  const taskRef = adminDb.collection('tasks').doc(tarefa_id)
  const taskSnap = await taskRef.get()
  if (!taskSnap.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const entryData = {
    tarefa_id,
    usuario_id: userId,
    data: data || new Date().toISOString().split('T')[0],
    hora_inicio: hora_inicio || '',
    hora_fim: hora_fim || '',
    duracao: Number(duracao),
    tipo: tipo || 'manual',
    criado_em: new Date().toISOString(),
  }

  const ref = await taskRef.collection('time_entries').add(entryData)

  // Recomputa total da tarefa
  await recomputeTaskTotal(tarefa_id)

  return NextResponse.json({ entry: { id: ref.id, ...entryData } }, { status: 201 })
}
