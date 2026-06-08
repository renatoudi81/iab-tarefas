// READ-ONLY: lista tarefas criadas hoje (ou em uma data passada via arg).
// Uso:  node scripts/tasks-criadas-hoje.mjs            (usa hoje)
//       node scripts/tasks-criadas-hoje.mjs 2026-06-08 (data especifica)

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

const targetDate = process.argv[2] || new Date().toISOString().slice(0, 10)

const snap = await db.collection('tasks').orderBy('criado_em', 'asc').get()
const usersSnap = await db.collection('users').get()
const userMap = new Map(usersSnap.docs.map((d) => [d.id, d.data().nome || '?']))

const hoje = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((t) => (t.criado_em || '').slice(0, 10) === targetDate)

console.log(`\n=== Tarefas abertas em ${targetDate}: ${hoje.length} ===\n`)
if (hoje.length === 0) {
  console.log('Nenhuma tarefa criada nessa data.')
  process.exit(0)
}

hoje.forEach((t) => {
  const hora = (t.criado_em || '').slice(11, 16)
  const numero = t.numero != null ? `#${t.numero}` : `#${t.id.slice(-5).toUpperCase()}`
  const resp = t.responsavel_id ? userMap.get(t.responsavel_id) || '?' : '—'
  console.log(`${hora} ${numero.padEnd(6)} | ${t.status.padEnd(13)} | ${t.prioridade.padEnd(8)} | ${resp.padEnd(20)} | ${t.titulo}`)
})
console.log('')
