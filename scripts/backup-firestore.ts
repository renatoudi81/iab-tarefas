/**
 * Backup completo do Firestore + lista de usuários do Firebase Auth.
 *
 * Gera `backups/firestore-YYYY-MM-DD_HHmm.json` no formato compatível
 * com scripts/import-firestore.ts (restore).
 *
 * - Coleta todos os docs de: users, categories, tasks, notifications, config
 * - "Achata" as subcoleções de tasks (subtasks, comments, time_entries, history)
 *   em arrays top-level — cada um com `tarefa_id` apontando pra parent.
 * - Lista usuários do Firebase Auth (sem password hash — Firebase não expõe).
 * - Mantém só os últimos N backups (rotação automática).
 *
 * Rodar: npm run backup
 *    ou: npx tsx scripts/backup-firestore.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'

const KEEP_LAST_N_BACKUPS = 30  // mantém os últimos 30 backups; ajuste como quiser

function tsForFilename() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

async function main() {
  const t0 = Date.now()
  const { adminDb, adminAuth } = await import('../lib/firebase-admin')

  console.log('📦 Iniciando backup do Firestore...\n')

  // --- 1) Coleções top-level ----------------------------------------
  const [usersSnap, categoriesSnap, tasksSnap, notificationsSnap, configSnap] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('categories').get(),
    adminDb.collection('tasks').get(),
    adminDb.collection('notifications').get(),
    adminDb.collection('config').get(),
  ])

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const notifications = notificationsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const configEntries = configSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // --- 2) Subcoleções de tasks (via collectionGroup) ----------------
  const [subSnap, comSnap, teSnap, hisSnap] = await Promise.all([
    adminDb.collectionGroup('subtasks').get(),
    adminDb.collectionGroup('comments').get(),
    adminDb.collectionGroup('time_entries').get(),
    adminDb.collectionGroup('history').get(),
  ])

  const subtasks = subSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const comments = comSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const timeEntries = teSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const history = hisSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // --- 3) Usuários do Firebase Auth (sem hashes) --------------------
  const authUsersResult = await adminAuth.listUsers(1000)
  const authUsers = authUsersResult.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    disabled: u.disabled,
    emailVerified: u.emailVerified,
    creationTime: u.metadata.creationTime,
    lastSignInTime: u.metadata.lastSignInTime,
  }))

  // --- 4) Monta o dump ----------------------------------------------
  const dump = {
    exportedAt: new Date().toISOString(),
    users,
    categories,
    tasks,
    subtasks,
    comments,
    timeEntries,
    notifications,
    history,
    config: configEntries,
    authUsers,
  }

  // --- 5) Salva no disco --------------------------------------------
  const backupsDir = path.join(process.cwd(), 'backups')
  fs.mkdirSync(backupsDir, { recursive: true })

  const filename = `firestore-${tsForFilename()}.json`
  const filepath = path.join(backupsDir, filename)
  fs.writeFileSync(filepath, JSON.stringify(dump, null, 2))

  const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`✅ Backup salvo: ${filepath}`)
  console.log(`   Tamanho: ${sizeKB} KB · Tempo: ${elapsed}s\n`)
  console.log('📊 Conteúdo:')
  console.log(`   users:         ${users.length}`)
  console.log(`   categories:    ${categories.length}`)
  console.log(`   tasks:         ${tasks.length}`)
  console.log(`   subtasks:      ${subtasks.length}`)
  console.log(`   comments:      ${comments.length}`)
  console.log(`   timeEntries:   ${timeEntries.length}`)
  console.log(`   notifications: ${notifications.length}`)
  console.log(`   history:       ${history.length}`)
  console.log(`   config:        ${configEntries.length}`)
  console.log(`   authUsers:     ${authUsers.length}`)

  // --- 6) Rotação: apaga backups mais antigos -----------------------
  const allBackups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('firestore-') && f.endsWith('.json'))
    .sort()  // ordenação lexicográfica = cronológica (formato ISO)
    .reverse()  // mais novo primeiro

  if (allBackups.length > KEEP_LAST_N_BACKUPS) {
    const toDelete = allBackups.slice(KEEP_LAST_N_BACKUPS)
    console.log(`\n🧹 Rotação: apagando ${toDelete.length} backup(s) antigo(s)`)
    for (const f of toDelete) {
      fs.unlinkSync(path.join(backupsDir, f))
      console.log(`   – ${f}`)
    }
  }

  console.log(`\n💾 Total de backups mantidos: ${Math.min(allBackups.length, KEEP_LAST_N_BACKUPS)}/${KEEP_LAST_N_BACKUPS}`)
}

main().catch(e => { console.error('❌ Erro:', e); process.exit(1) })
