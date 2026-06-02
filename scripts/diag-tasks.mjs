/**
 * Diagnóstico READ-ONLY: conta tasks e time_entries e mostra as datas.
 * NÃO altera nada. Uso: node scripts/diag-tasks.mjs
 */
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

const tasksSnap = await db.collection('tasks').get()
console.log(`\n=== TASKS: ${tasksSnap.docs.length} ===`)
tasksSnap.docs.slice(0, 25).forEach((d) => {
  const t = d.data()
  console.log(`  ${d.id.slice(-5)} | criado_em=${t.criado_em} | prazo=${t.data_prazo} | concl=${t.data_conclusao} | status=${t.status} | tempo=${t.tempo_gasto_total}`)
})

const teGroup = await db.collectionGroup('time_entries').get()
console.log(`\n=== time_entries (subcolecao): ${teGroup.docs.length} ===`)
teGroup.docs.slice(0, 25).forEach((d) => {
  const e = d.data()
  console.log(`  data=${e.data} | duracao=${e.duracao} | atividade=${e.atividade ?? '-'} | tarefa=${String(e.tarefa_id).slice(-5)}`)
})

const teRoot = await db.collection('time-entries').get().catch(() => ({ docs: [] }))
console.log(`\n=== time-entries (raiz, hifen/legado): ${teRoot.docs.length} ===`)

process.exit(0)
