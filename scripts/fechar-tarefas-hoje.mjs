// Para cada tarefa criada HOJE (2026-06-08):
//   1) Move status: Pendente -> Em andamento (registra historico)
//   2) Cria 1 time_entry com duracao = tempo_estimado, data = HOJE,
//      atividade = "Atendimento", usuario_id = responsavel
//   3) Move status: Em andamento -> Concluida + data_conclusao = HOJE
//      Atualiza tempo_gasto_total = tempo_estimado
//
// Idempotente: pula tarefas que ja estao Concluidas.
// Uso: node scripts/fechar-tarefas-hoje.mjs [YYYY-MM-DD]

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('Credenciais Firebase Admin ausentes em .env.local')
  process.exit(1)
}
if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}
const db = getFirestore('default')

const HOJE = process.argv[2] || new Date().toISOString().slice(0, 10)
const ATIVIDADE = 'Atendimento'

console.log(`\n=== Fechando tarefas criadas em ${HOJE} ===\n`)

const snap = await db.collection('tasks').orderBy('criado_em', 'asc').get()
const candidatas = snap.docs.filter((d) => {
  const t = d.data()
  return (t.criado_em || '').slice(0, 10) === HOJE
})

console.log(`${candidatas.length} candidatas encontradas\n`)

let processadas = 0
let puladas = 0

for (const docRef of candidatas) {
  const t = docRef.data()
  const id = docRef.id
  const numero = t.numero != null ? `#${t.numero}` : `#${id.slice(-5)}`

  if (t.status === 'Concluída') {
    console.log(`${numero} | ja Concluida — pulando`)
    puladas++
    continue
  }

  const estimado = Number(t.tempo_estimado || 60)
  const responsavelId = t.responsavel_id
  if (!responsavelId) {
    console.log(`${numero} | sem responsavel_id — pulando`)
    puladas++
    continue
  }

  console.log(`${numero} | "${t.titulo}" (${estimado}min)`)

  // 1) Pendente/Aguardando -> Em andamento (+ historico)
  if (t.status !== 'Em andamento') {
    const tsEmAndamento = new Date().toISOString()
    await docRef.ref.update({
      status: 'Em andamento',
      atualizado_em: tsEmAndamento,
    })
    await docRef.ref.collection('history').add({
      tarefa_id: id,
      usuario_id: responsavelId,
      campo: 'status',
      valor_ant: String(t.status ?? ''),
      valor_novo: 'Em andamento',
      criado_em: tsEmAndamento,
    })
    console.log(`  ✓ Em andamento`)
  }

  // 2) Lancamento de tempo (subcolecao time_entries)
  const lancamentoTs = new Date().toISOString()
  await docRef.ref.collection('time_entries').add({
    tarefa_id: id,
    usuario_id: responsavelId,
    data: HOJE,
    hora_inicio: '',
    hora_fim: '',
    duracao: estimado,
    tipo: 'manual',
    comentario: '',
    atividade: ATIVIDADE,
    criado_em: lancamentoTs,
  })
  console.log(`  ✓ lancado ${estimado}min em ${HOJE} (${ATIVIDADE})`)

  // 3) Em andamento -> Concluida (+ historico) + recomputa total
  const entriesSnap = await docRef.ref.collection('time_entries').get()
  const novoTotal = entriesSnap.docs.reduce(
    (sum, d) => sum + Number((d.data() || {}).duracao || 0),
    0,
  )
  const tsConcluida = new Date().toISOString()
  await docRef.ref.update({
    status: 'Concluída',
    data_conclusao: HOJE,
    tempo_gasto_total: novoTotal,
    atualizado_em: tsConcluida,
  })
  await docRef.ref.collection('history').add({
    tarefa_id: id,
    usuario_id: responsavelId,
    campo: 'status',
    valor_ant: 'Em andamento',
    valor_novo: 'Concluída',
    criado_em: tsConcluida,
  })
  console.log(`  ✓ Concluida (tempo total: ${novoTotal}min)\n`)

  processadas++
}

console.log('=== Resumo ===')
console.log(`  Processadas: ${processadas}`)
console.log(`  Puladas:     ${puladas}`)
console.log(`  Total:       ${candidatas.length}\n`)
