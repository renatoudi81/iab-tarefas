/**
 * Importa o `dump.json` (gerado por export-postgres.ts) no Firestore
 * + cria os usuários no Firebase Auth importando os hashes bcrypt
 * preservados do Postgres.
 *
 * IDEMPOTENTE: pode rodar várias vezes — usa `.set()` que sobrescreve.
 *
 * Rodar: npx tsx scripts/import-firestore.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'

interface Dump {
  exportedAt: string
  users: any[]
  categories: any[]
  tasks: any[]
  subtasks: any[]
  comments: any[]
  timeEntries: any[]
  notifications: any[]
  history: any[]
  config: any[]
}

async function main() {
  const { adminDb, adminAuth } = await import('../lib/firebase-admin')

  const dumpPath = path.join(process.cwd(), 'dump.json')
  if (!fs.existsSync(dumpPath)) {
    console.error('❌ dump.json não encontrado. Rode primeiro: npx tsx scripts/export-postgres.ts')
    process.exit(1)
  }

  const dump: Dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'))
  console.log(`📥 Importando dump exportado em ${dump.exportedAt}\n`)

  // -------------------------------------------------------------------
  // 1) USUÁRIOS → Firebase Auth + /users/{id} no Firestore
  // -------------------------------------------------------------------
  console.log('👥 Importando usuários...')
  const authPayload = dump.users
    .filter(u => u.password_hash && u.email)
    .map(u => ({
      uid: u.id,
      email: u.email,
      displayName: u.nome,
      disabled: !u.ativo,
      // Firebase Auth aceita o hash bcrypt inteiro (com prefixo $2a$10$ ou $2b$10$)
      passwordHash: Buffer.from(u.password_hash, 'utf8'),
    }))

  if (authPayload.length > 0) {
    // importUsers aceita lotes de até 1000
    const chunks: any[][] = []
    for (let i = 0; i < authPayload.length; i += 1000) {
      chunks.push(authPayload.slice(i, i + 1000))
    }
    for (const chunk of chunks) {
      const res = await adminAuth.importUsers(chunk, {
        hash: { algorithm: 'BCRYPT' },
      })
      console.log(`   Auth: ${res.successCount} ok, ${res.failureCount} falhas`)
      if (res.failureCount > 0) {
        res.errors.forEach(e => console.warn(`     ✗ idx=${e.index}: ${e.error.message}`))
      }
    }
  }

  // Firestore — sem senha
  let batch = adminDb.batch()
  let counter = 0
  for (const u of dump.users) {
    const { password_hash, ...rest } = u
    batch.set(adminDb.collection('users').doc(u.id), rest)
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   Firestore /users: ${dump.users.length} docs\n`)

  // -------------------------------------------------------------------
  // 2) CATEGORIAS
  // -------------------------------------------------------------------
  console.log('🏷  Importando categorias...')
  batch = adminDb.batch(); counter = 0
  for (const c of dump.categories) {
    batch.set(adminDb.collection('categories').doc(c.id), c)
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /categories: ${dump.categories.length} docs\n`)

  // -------------------------------------------------------------------
  // 3) TAREFAS + subcoleções (subtasks, comments, time_entries, history)
  // -------------------------------------------------------------------
  console.log('📋 Importando tarefas...')
  batch = adminDb.batch(); counter = 0
  for (const t of dump.tasks) {
    batch.set(adminDb.collection('tasks').doc(t.id), t)
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /tasks: ${dump.tasks.length} docs`)

  // Subtasks
  batch = adminDb.batch(); counter = 0
  for (const s of dump.subtasks) {
    batch.set(
      adminDb.collection('tasks').doc(s.tarefa_id).collection('subtasks').doc(s.id),
      s
    )
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /tasks/*/subtasks: ${dump.subtasks.length} docs`)

  // Comments
  batch = adminDb.batch(); counter = 0
  for (const c of dump.comments) {
    batch.set(
      adminDb.collection('tasks').doc(c.tarefa_id).collection('comments').doc(c.id),
      c
    )
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /tasks/*/comments: ${dump.comments.length} docs`)

  // Time entries
  batch = adminDb.batch(); counter = 0
  for (const e of dump.timeEntries) {
    batch.set(
      adminDb.collection('tasks').doc(e.tarefa_id).collection('time_entries').doc(e.id),
      e
    )
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /tasks/*/time_entries: ${dump.timeEntries.length} docs`)

  // History
  batch = adminDb.batch(); counter = 0
  for (const h of dump.history) {
    batch.set(
      adminDb.collection('tasks').doc(h.tarefa_id).collection('history').doc(h.id),
      h
    )
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /tasks/*/history: ${dump.history.length} docs\n`)

  // -------------------------------------------------------------------
  // 4) NOTIFICAÇÕES (top-level — query por usuario_id)
  // -------------------------------------------------------------------
  console.log('🔔 Importando notificações...')
  batch = adminDb.batch(); counter = 0
  for (const n of dump.notifications) {
    batch.set(adminDb.collection('notifications').doc(n.id), n)
    counter++
    if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
  }
  if (counter > 0) await batch.commit()
  console.log(`   /notifications: ${dump.notifications.length} docs\n`)

  // -------------------------------------------------------------------
  // 5) CONFIG (key-value)
  // -------------------------------------------------------------------
  if (dump.config.length > 0) {
    console.log('⚙  Importando config...')
    batch = adminDb.batch(); counter = 0
    for (const c of dump.config) {
      batch.set(adminDb.collection('config').doc(c.id), c)
      counter++
      if (counter >= 400) { await batch.commit(); batch = adminDb.batch(); counter = 0 }
    }
    if (counter > 0) await batch.commit()
    console.log(`   /config: ${dump.config.length} docs\n`)
  }

  console.log('🎉 Importação concluída com sucesso!')
  console.log('\nPróximos passos:')
  console.log('   1. Conferir os dados em https://console.firebase.google.com/project/iab-tarefas/firestore')
  console.log('   2. Testar login com um usuário existente (a senha continua a mesma)')
  console.log('   3. Reescrever as API routes para usar Firebase Admin SDK')
}

main().catch(e => { console.error('❌ Erro:', e); process.exit(1) })
