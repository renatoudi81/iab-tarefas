import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'
import { loadTaskAndCheck } from '@/lib/task-access'
import { recomputeTaskTotal } from '@/lib/recompute-task-total'
import { todayStr } from '@/types'

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const isAdmin = user.perfil === 'Administrador'

  // Collection group query: pega os time_entries de todas as tasks.
  // limit(2000) é um guarda-corpo de quota (Spark ~50k reads/dia): sem ele,
  // cada GET varre TODOS os lançamentos do banco — foi o que estourou a
  // quota em junho/2026. 2000 cobre ~1 ano de uso no volume atual; quando
  // chegar perto disso, paginar por período (?from=&to=).
  const snap = await adminDb.collectionGroup('time_entries')
    .orderBy('criado_em', 'desc')
    .limit(2000)
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
  const { tarefa_id, duracao, tipo, hora_inicio, hora_fim, data, comentario, atividade } = body
  const userId = authUser.uid

  if (!tarefa_id) return NextResponse.json({ error: 'tarefa_id obrigatório' }, { status: 400 })
  const dur = Number(duracao)
  if (!Number.isFinite(dur) || dur < 1 || dur > 60 * 24) {
    return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })
  }

  const access = await loadTaskAndCheck(tarefa_id, authUser)
  if (!access.exists) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  if (!access.allowed) return NextResponse.json({ error: 'Sem permissão para lançar tempo nesta tarefa' }, { status: 403 })
  const taskRef = access.ref

  const entryData = {
    tarefa_id,
    usuario_id: userId,
    data: data || todayStr(),
    hora_inicio: hora_inicio || '',
    hora_fim: hora_fim || '',
    duracao: dur,
    tipo: tipo || 'manual',
    comentario: String(comentario || '').slice(0, 255),
    atividade: String(atividade || '').slice(0, 60),
    criado_em: new Date().toISOString(),
  }

  const ref = await taskRef.collection('time_entries').add(entryData)

  // Recomputa total da tarefa
  await recomputeTaskTotal(tarefa_id)

  return NextResponse.json({ entry: { id: ref.id, ...entryData } }, { status: 201 })
}
