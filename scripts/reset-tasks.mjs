/**
 * Reset total: backup + limpeza de tasks, time-entries e notifications.
 *
 * Mantém intactos: users, categories.
 *
 * Como rodar:
 *   node scripts/reset-tasks.mjs
 *
 * O script:
 *  1. Lê FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY do .env.local
 *  2. Gera backup-AAAA-MM-DD-HHMM.json com TODAS as tasks (incluindo subcollections)
 *  3. Pede confirmação digitando "APAGAR" no terminal
 *  4. Apaga, em ordem:
 *     - subcollections de cada task (subtasks, comments, history)
 *     - tasks
 *     - time-entries
 *     - notifications
 *  5. Reporta contagens finais
 *
 * Segurança:
 *  - Backup gravado ANTES de qualquer delete
 *  - Confirmação interativa obrigatória
 *  - Batch de 400 (limite Firestore = 500)
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync, mkdirSync } from 'node:fs'
import { config } from 'dotenv'
import readline from 'node:readline'

// Carrega .env.local
config({ path: '.env.local' })

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Credenciais Firebase Admin não encontradas em .env.local')
  console.error('   Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY')
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}
const db = getFirestore('default')

// ─── Helpers ──────────────────────────────────────────────────────

async function backupAll() {
  console.log('📦 Gerando backup...')
  const out = { generatedAt: new Date().toISOString(), tasks: [], timeEntries: [], notifications: [] }

  // Tasks + subcollections
  const tasksSnap = await db.collection('tasks').get()
  for (const t of tasksSnap.docs) {
    const taskData = { id: t.id, ...t.data() }
    const [subtasksSnap, commentsSnap, historySnap] = await Promise.all([
      t.ref.collection('subtasks').get().catch(() => ({ docs: [] })),
      t.ref.collection('comments').get().catch(() => ({ docs: [] })),
      t.ref.collection('history').get().catch(() => ({ docs: [] })),
    ])
    taskData.subtasks = subtasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    taskData.comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    taskData.history = historySnap.docs.map(d => ({ id: d.id, ...d.data() }))
    out.tasks.push(taskData)
  }

  // Time entries
  const entriesSnap = await db.collection('time-entries').get()
  out.timeEntries = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Notifications
  const notifSnap = await db.collection('notifications').get()
  out.notifications = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Salva arquivo
  mkdirSync('backups', { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const filename = `backups/reset-backup-${stamp}.json`
  writeFileSync(filename, JSON.stringify(out, null, 2), 'utf-8')
  console.log(`✓ Backup salvo em ${filename}`)
  console.log(`  - ${out.tasks.length} tasks (com subcolections)`)
  console.log(`  - ${out.timeEntries.length} time-entries`)
  console.log(`  - ${out.notifications.length} notifications`)
  return out
}

async function deleteSubcollection(taskRef, name) {
  const snap = await taskRef.collection(name).get().catch(() => ({ docs: [] }))
  if (snap.docs.length === 0) return 0
  // Deleta em batches de 400 (limite Firestore = 500)
  let n = 0
  while (n < snap.docs.length) {
    const batch = db.batch()
    const chunk = snap.docs.slice(n, n + 400)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
    n += chunk.length
  }
  return snap.docs.length
}

async function deleteAllTasks() {
  const snap = await db.collection('tasks').get()
  let counts = { tasks: 0, subtasks: 0, comments: 0, history: 0 }
  console.log(`🗑  Apagando ${snap.docs.length} tasks (com subcollections)...`)

  for (const t of snap.docs) {
    counts.subtasks += await deleteSubcollection(t.ref, 'subtasks')
    counts.comments += await deleteSubcollection(t.ref, 'comments')
    counts.history += await deleteSubcollection(t.ref, 'history')
  }

  // Deleta as tasks em batches
  let n = 0
  while (n < snap.docs.length) {
    const batch = db.batch()
    const chunk = snap.docs.slice(n, n + 400)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
    n += chunk.length
    counts.tasks = n
  }
  console.log(`✓ Tasks: ${counts.tasks} | Subtasks: ${counts.subtasks} | Comments: ${counts.comments} | History: ${counts.history}`)
  return counts
}

async function deleteCollection(name) {
  const snap = await db.collection(name).get()
  if (snap.docs.length === 0) {
    console.log(`✓ ${name}: nenhum documento encontrado`)
    return 0
  }
  let n = 0
  while (n < snap.docs.length) {
    const batch = db.batch()
    const chunk = snap.docs.slice(n, n + 400)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
    n += chunk.length
  }
  console.log(`✓ ${name}: ${snap.docs.length} apagados`)
  return snap.docs.length
}

async function confirm(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(prompt, (ans) => {
      rl.close()
      resolve(ans.trim())
    })
  })
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  IAB Tarefas — Reset Total')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Projeto: ${projectId}`)
  console.log('')

  // 1. Backup
  await backupAll()

  // 2. Confirmação
  console.log('')
  console.log('⚠️  ATENÇÃO: a próxima etapa é IRREVERSÍVEL.')
  console.log('   Tudo abaixo será APAGADO:')
  console.log('   - Todas as tasks (incluindo subtasks, comments, history)')
  console.log('   - Todos os time-entries (lançamentos de tempo)')
  console.log('   - Todas as notifications')
  console.log('')
  console.log('   Mantidos: users, categories.')
  console.log('')
  const answer = await confirm('Digite APAGAR (em maiúsculas) para confirmar: ')
  if (answer !== 'APAGAR') {
    console.log('❌ Confirmação não recebida. Operação cancelada. Backup mantido.')
    process.exit(0)
  }

  // 3. Apaga
  console.log('')
  await deleteAllTasks()
  await deleteCollection('time-entries')
  await deleteCollection('notifications')

  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  ✅ Limpeza concluída. Sistema zerado.')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('Para restaurar, use o arquivo em backups/reset-backup-*.json')
}

main().catch((err) => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
