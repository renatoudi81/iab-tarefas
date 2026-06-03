// Migra tempo "legado" para a nova estrutura de time_entries.
//
// Contexto:
//   Antes, o campo `tempo_gasto_total` da tarefa era editado direto no form.
//   Agora ele e calculado pela soma da subcolecao `tasks/{id}/time_entries`.
//   Tarefas antigas tem `tempo_gasto_total > 0` mas zero lancamentos — entao
//   somem dos KPIs e do relatorio "tarefas executadas por dia".
//
// O que faz:
//   Para cada tarefa que TEM tempo_gasto_total > 0 e ZERO time_entries,
//   cria 1 lancamento "legado" com:
//     - data = data_conclusao (ou criado_em como fallback)
//     - duracao = tempo_gasto_total
//     - usuario_id = responsavel_id (ou primeiro admin como fallback)
//     - atividade = "Legado"
//     - comentario = "Tempo migrado do campo antigo"
//   E garante que `tempo_gasto_total` permaneca consistente com a soma.
//
// Idempotente: se a tarefa ja tem entries, ignora.
// Uso: node scripts/migrate-legacy-time.mjs

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

async function pickFallbackUserId() {
  const snap = await db.collection('users').where('perfil', '==', 'Administrador').limit(1).get()
  if (!snap.empty) return snap.docs[0].id
  const anySnap = await db.collection('users').limit(1).get()
  return anySnap.empty ? null : anySnap.docs[0].id
}

async function main() {
  console.log('Lendo tarefas...')
  const tasksSnap = await db.collection('tasks').get()
  console.log(`Total: ${tasksSnap.size} tarefas`)

  const fallbackUserId = await pickFallbackUserId()
  if (!fallbackUserId) {
    console.error('Nenhum usuario encontrado para fallback. Aborte.')
    process.exit(1)
  }
  console.log(`Usuario fallback: ${fallbackUserId}`)

  let migradas = 0
  let puladasComEntries = 0
  let puladasSemTempo = 0
  let totalMinutos = 0

  for (const taskDoc of tasksSnap.docs) {
    const task = taskDoc.data() || {}
    const total = Number(task.tempo_gasto_total || 0)

    if (total <= 0) {
      puladasSemTempo++
      continue
    }

    const entriesSnap = await taskDoc.ref.collection('time_entries').get()
    if (!entriesSnap.empty) {
      puladasComEntries++
      continue
    }

    // Data: prefere data_conclusao; senao usa criado_em (corta para YYYY-MM-DD)
    let data = task.data_conclusao
    if (!data && task.criado_em) data = String(task.criado_em).slice(0, 10)
    if (!data) data = new Date().toISOString().slice(0, 10)

    const usuarioId = task.responsavel_id || fallbackUserId
    const nowIso = new Date().toISOString()

    await taskDoc.ref.collection('time_entries').add({
      tarefa_id: taskDoc.id,
      usuario_id: usuarioId,
      data,
      hora_inicio: '',
      hora_fim: '',
      duracao: total,
      tipo: 'manual',
      comentario: 'Tempo migrado do campo antigo',
      atividade: 'Legado',
      criado_em: nowIso,
    })

    migradas++
    totalMinutos += total
    console.log(`  ${taskDoc.id.slice(-5)} | data=${data} | dur=${total}min`)
  }

  console.log('\nConcluido.')
  console.log(`  Tarefas migradas: ${migradas} (total ${totalMinutos} min = ${(totalMinutos / 60).toFixed(1)}h)`)
  console.log(`  Puladas (ja tinham entries): ${puladasComEntries}`)
  console.log(`  Puladas (sem tempo_gasto_total): ${puladasSemTempo}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
