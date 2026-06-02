// Atribui `numero` sequencial (1, 2, 3, ...) a todas as tarefas existentes,
// ordenadas por `criado_em` ascendente. Grava o ultimo numero em
// counters/tasks para que novos POSTs continuem a sequencia.
//
// Idempotente: tarefas que ja tem `numero` mantem o valor.
// Uso: node scripts/backfill-task-numbers.mjs

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

async function main() {
  console.log('Lendo tarefas...')
  const snap = await db.collection('tasks').orderBy('criado_em', 'asc').get()
  console.log(`Total: ${snap.size} tarefas`)

  let maxNumero = 0
  let atribuidas = 0
  let preservadas = 0

  snap.docs.forEach((d) => {
    const n = Number((d.data() || {}).numero || 0)
    if (n > maxNumero) maxNumero = n
  })
  console.log(`Maior numero ja atribuido: ${maxNumero}`)

  let cursor = maxNumero
  let batch = db.batch()
  let opsInBatch = 0

  for (const d of snap.docs) {
    const data = d.data() || {}
    if (Number.isFinite(data.numero) && Number(data.numero) > 0) {
      preservadas++
      continue
    }
    cursor++
    batch.update(d.ref, { numero: cursor, atualizado_em: new Date().toISOString() })
    atribuidas++
    opsInBatch++
    if (opsInBatch >= 400) {
      await batch.commit()
      batch = db.batch()
      opsInBatch = 0
      console.log(`  ...commit parcial (${atribuidas} atribuidas ate aqui)`)
    }
  }
  if (opsInBatch > 0) await batch.commit()

  const last = Math.max(maxNumero, cursor)
  await db.collection('counters').doc('tasks').set(
    { last, atualizado_em: new Date().toISOString() },
    { merge: true },
  )

  console.log('Concluido.')
  console.log(`  Preservadas (ja tinham numero): ${preservadas}`)
  console.log(`  Atribuidas agora: ${atribuidas}`)
  console.log(`  Contador counters/tasks.last = ${last}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
