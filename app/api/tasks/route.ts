import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/verify-auth'
import { adminDb } from '@/lib/firebase-admin'

const VALID_PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'] as const
const VALID_STATUSES = ['Pendente', 'Em andamento', 'Concluída', 'Atrasada', 'Aguardando'] as const

// Carrega usuários (id, nome, avatar_color) numa única passagem para popular `responsavel`
async function loadUserMap() {
  const snap = await adminDb.collection('users').get()
  const map = new Map<string, { id: string; nome: string; avatar_color: string; avatar_url: string | null }>()
  snap.docs.forEach(d => {
    const u = d.data() as any
    map.set(d.id, {
      id: d.id,
      nome: u.nome,
      avatar_color: u.avatar_color,
      avatar_url: u.avatar_url ?? null,
    })
  })
  return map
}

export async function GET(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const isAdmin = user.perfil === 'Administrador'

  // 1) Tasks ordenadas por atualizado_em desc
  const tasksSnap = await adminDb.collection('tasks').orderBy('atualizado_em', 'desc').get()

  // 2) Mapa de usuários (paralelo)
  const userMap = await loadUserMap()

  // "Hoje" no formato YYYY-MM-DD para comparar com data_prazo (que também
  // é YYYY-MM-DD). Comparação lexicográfica funciona pra esse formato.
  const today = new Date().toISOString().split('T')[0]

  // 3) Para cada task, buscar subtasks e contagem de comments em paralelo
  const tasksRaw = await Promise.all(tasksSnap.docs.map(async (doc) => {
    const data = doc.data() as any
    const taskRef = doc.ref

    const [subtasksSnap, commentsCountSnap] = await Promise.all([
      taskRef.collection('subtasks').orderBy('ordem', 'asc').get(),
      taskRef.collection('comments').count().get(),
    ])

    const subtasks = subtasksSnap.docs.map(s => ({ concluida: (s.data() as any).concluida }))
    const responsavel = data.responsavel_id ? userMap.get(data.responsavel_id) ?? null : null

    // Status derivado: se data_prazo < hoje e a tarefa NÃO está Concluída,
    // ela aparece como 'Atrasada' independentemente do status persistido.
    // Não escrevemos isso no Firestore — manter o status "intenção do usuário"
    // (Pendente/Em andamento/Aguardando) para que, se o prazo for adiado, a
    // tarefa volte ao status correto automaticamente sem perda de informação.
    const isOverdue =
      data.data_prazo &&
      data.data_prazo < today &&
      data.status !== 'Concluída'
    const effectiveStatus = isOverdue ? 'Atrasada' : data.status

    return {
      id: doc.id,
      ...data,
      status: effectiveStatus,
      responsavel,
      subtasks,
      _count: {
        subtasks: subtasks.length,
        comments: commentsCountSnap.data().count,
      },
    }
  }))

  // 4) Permissões: admin vê tudo. Outros perfis veem apenas tarefas onde:
  //    - são o responsável (responsavel_id === user.id), ou
  //    - participam da equipe (user.id em equipe)
  const tasks = isAdmin
    ? tasksRaw
    : tasksRaw.filter((t: any) =>
        t.responsavel_id === user.id ||
        (Array.isArray(t.equipe) && t.equipe.includes(user.id))
      )

  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let body: Record<string, any>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { titulo, descricao, observacoes, categoria, prioridade, status,
    responsavel_id, equipe, data_inicio, data_prazo, data_conclusao,
    tempo_estimado, tempo_gasto_total, tags, anexos,
    aguardando_quem, data_retorno_esperada } = body

  if (!titulo?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  if (!categoria?.trim()) return NextResponse.json({ error: 'Categoria obrigatória' }, { status: 400 })

  if (prioridade && !VALID_PRIORIDADES.includes(prioridade)) {
    return NextResponse.json({ error: `Prioridade inválida. Use: ${VALID_PRIORIDADES.join(', ')}` }, { status: 400 })
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // Categoria precisa existir
  const catDup = await adminDb.collection('categories').where('nome', '==', categoria).limit(1).get()
  if (catDup.empty) return NextResponse.json({ error: 'Categoria não cadastrada' }, { status: 400 })

  if (data_inicio && data_prazo && data_inicio > data_prazo) {
    return NextResponse.json({ error: 'Data de início não pode ser posterior ao prazo' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const taskData = {
    titulo: titulo.trim(),
    descricao: descricao || null,
    observacoes: observacoes || null,
    categoria,
    prioridade: prioridade || 'Média',
    status: status || 'Pendente',
    responsavel_id: responsavel_id || null,
    equipe: equipe || [],
    data_inicio: data_inicio || null,
    data_prazo: data_prazo || null,
    data_conclusao: data_conclusao || null,
    tempo_estimado: Number(tempo_estimado) || 60,
    tempo_gasto_total: Number(tempo_gasto_total) || 0,
    tags: tags || [],
    anexos: anexos || [],
    aguardando_quem: aguardando_quem || null,
    data_retorno_esperada: data_retorno_esperada || null,
    criado_em: now,
    atualizado_em: now,
  }

  const ref = await adminDb.collection('tasks').add(taskData)

  // Popula responsavel para a resposta
  let responsavel = null
  if (taskData.responsavel_id) {
    const userDoc = await adminDb.collection('users').doc(taskData.responsavel_id).get()
    if (userDoc.exists) {
      const u = userDoc.data() as any
      responsavel = { id: userDoc.id, nome: u.nome, avatar_color: u.avatar_color, avatar_url: u.avatar_url ?? null }
    }
  }

  // Mesma derivação do GET — task criada já com data_prazo vencida vira
  // 'Atrasada' direto na resposta (consistência entre POST/PATCH/GET)
  const today = new Date().toISOString().split('T')[0]
  const isOverdue =
    taskData.data_prazo &&
    taskData.data_prazo < today &&
    taskData.status !== 'Concluída'
  const effectiveStatus = isOverdue ? 'Atrasada' : taskData.status

  return NextResponse.json(
    { task: { id: ref.id, ...taskData, status: effectiveStatus, responsavel } },
    { status: 201 },
  )
}
