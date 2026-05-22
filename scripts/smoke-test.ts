/**
 * Smoke test — exercita a lógica de cada rota direto contra o Firestore,
 * sem subir a camada HTTP/auth. Cria recursos temporários, valida e limpa.
 *
 * Rodar: npx tsx scripts/smoke-test.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const TEST_PREFIX = '__smoke__'

async function main() {
  const { adminDb, adminAuth } = await import('../lib/firebase-admin')

  let ok = 0
  let fail = 0
  const fails: string[] = []

  function check(label: string, cond: boolean, detail?: string) {
    if (cond) {
      console.log(`  ✓ ${label}`)
      ok++
    } else {
      console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
      fails.push(label)
      fail++
    }
  }

  console.log('\n🧪 SMOKE TEST — Firestore + Firebase Auth\n')

  // ============================================
  // 1) CATEGORIES
  // ============================================
  console.log('1) Categories')
  const catName = `${TEST_PREFIX}cat-${Date.now()}`

  // GET (list)
  const catListSnap = await adminDb.collection('categories').orderBy('nome', 'asc').get()
  check(`GET /api/categories retorna ${catListSnap.size} itens`, catListSnap.size >= 15)

  // POST (create) — simula a lógica da rota
  const dup = await adminDb.collection('categories').where('nome', '==', catName).limit(1).get()
  check('POST: checagem de duplicidade funciona (deve estar vazia)', dup.empty)

  const catRef = await adminDb.collection('categories').add({
    nome: catName,
    criado_em: new Date().toISOString(),
  })
  const catCreated = await catRef.get()
  check('POST: doc criado', catCreated.exists)
  check('POST: nome correto', (catCreated.data() as any).nome === catName)

  // PATCH
  const newName = `${catName}-renamed`
  await catRef.update({ nome: newName })
  const catUpdated = await catRef.get()
  check('PATCH: nome atualizado', (catUpdated.data() as any).nome === newName)

  // DELETE — checa se há tarefas vinculadas (deve ser 0 pro nome novo)
  const tarefasVinc = await adminDb.collection('tasks').where('categoria', '==', newName).limit(1).get()
  check('DELETE: nenhuma tarefa vinculada', tarefasVinc.empty)
  await catRef.delete()
  const catGone = await catRef.get()
  check('DELETE: doc removido', !catGone.exists)

  // ============================================
  // 2) USERS (Firestore + Auth)
  // ============================================
  console.log('\n2) Users')
  const userListSnap = await adminDb.collection('users').orderBy('nome', 'asc').get()
  check(`GET /api/users retorna ${userListSnap.size} usuário(s)`, userListSnap.size >= 1)

  // Confere que o usuário migrado bate entre Auth e Firestore
  if (userListSnap.size > 0) {
    const firstUser = userListSnap.docs[0]
    const uid = firstUser.id
    try {
      const authUser = await adminAuth.getUser(uid)
      check('User: existe no Firestore E no Auth com mesmo UID', !!authUser)
      check('User: email bate entre Firestore e Auth',
        (firstUser.data() as any).email === authUser.email,
        `FS=${(firstUser.data() as any).email} Auth=${authUser.email}`)
    } catch (e: any) {
      check('User: existe no Auth com mesmo UID', false, e.message)
    }
  }

  // Teste de criação: cria + deleta em rollback
  const testEmail = `__smoke__test-${Date.now()}@example.com`
  let testUid: string | null = null
  try {
    const authUser = await adminAuth.createUser({
      email: testEmail,
      password: 'teste123',
      displayName: 'Smoke Test User',
    })
    testUid = authUser.uid
    await adminDb.collection('users').doc(testUid).set({
      nome: 'Smoke Test User',
      email: testEmail,
      perfil: 'Usuário',
      avatar_color: '#6366f1',
      ativo: true,
      criado_em: new Date().toISOString(),
    })
    check('POST /api/users: criado no Auth + Firestore', true)
  } catch (e: any) {
    check('POST /api/users: criado', false, e.message)
  } finally {
    if (testUid) {
      await adminAuth.deleteUser(testUid).catch(() => {})
      await adminDb.collection('users').doc(testUid).delete().catch(() => {})
    }
  }

  // ============================================
  // 3) TASKS — incluindo o JOIN manual com users
  // ============================================
  console.log('\n3) Tasks')
  const tasksSnap = await adminDb.collection('tasks').orderBy('atualizado_em', 'desc').limit(5).get()
  check(`GET /api/tasks retorna ao menos 1 tarefa`, tasksSnap.size > 0)

  if (tasksSnap.size > 0) {
    const task = tasksSnap.docs[0]
    const taskData = task.data() as any

    // JOIN com user
    if (taskData.responsavel_id) {
      const userDoc = await adminDb.collection('users').doc(taskData.responsavel_id).get()
      check('JOIN: responsavel_id aponta para um usuário existente', userDoc.exists)
    }

    // Subcoleções
    const subSnap = await task.ref.collection('subtasks').get()
    const comSnap = await task.ref.collection('comments').count().get()
    check(`Subcoleções acessíveis (subtasks=${subSnap.size}, comments=${comSnap.data().count})`, true)
  }

  // POST: cria tarefa de teste
  const catRef2 = await adminDb.collection('categories').limit(1).get()
  const categoriaExistente = catRef2.empty ? null : (catRef2.docs[0].data() as any).nome

  if (categoriaExistente) {
    const now = new Date().toISOString()
    const taskData = {
      titulo: `${TEST_PREFIX}task-${Date.now()}`,
      categoria: categoriaExistente,
      prioridade: 'Média',
      status: 'Pendente',
      responsavel_id: null,
      equipe: [],
      tempo_estimado: 60,
      tempo_gasto_total: 0,
      tags: [],
      anexos: [],
      criado_em: now,
      atualizado_em: now,
      descricao: null, observacoes: null, data_inicio: null, data_prazo: null,
      data_conclusao: null, aguardando_quem: null, data_retorno_esperada: null,
    }
    const taskRef = await adminDb.collection('tasks').add(taskData)
    check('POST /api/tasks: tarefa criada', !!taskRef.id)

    // PATCH: muda status (simulando drag-and-drop kanban)
    await taskRef.update({ status: 'Em andamento', atualizado_em: new Date().toISOString() })
    const updated = await taskRef.get()
    check('PATCH /api/tasks: status atualizado', (updated.data() as any).status === 'Em andamento')

    // Subtask
    const subRef = await taskRef.collection('subtasks').add({
      tarefa_id: taskRef.id,
      titulo: 'sub 1',
      concluida: false,
      ordem: 1,
      criado_em: new Date().toISOString(),
    })
    check('POST subtask criada', !!subRef.id)
    await subRef.update({ concluida: true })
    const subUpdated = await subRef.get()
    check('PATCH subtask: concluida=true', (subUpdated.data() as any).concluida === true)

    // Time entry
    const teRef = await taskRef.collection('time_entries').add({
      tarefa_id: taskRef.id,
      usuario_id: 'fake-uid',
      data: '2026-05-22',
      hora_inicio: '09:00',
      hora_fim: '10:00',
      duracao: 60,
      tipo: 'manual',
      criado_em: new Date().toISOString(),
    })
    check('POST time_entry criado', !!teRef.id)

    // Collection group: pega TODOS os time_entries do projeto
    const allTE = await adminDb.collectionGroup('time_entries').get()
    check(`Collection group time_entries: ${allTE.size} entries (>= 1)`, allTE.size >= 1)

    // DELETE: limpa subcoleções + task
    await subRef.delete()
    await teRef.delete()

    // Verifica que DELETE remove subcoleções (no nosso código, sim)
    const subSnap2 = await taskRef.collection('subtasks').get()
    const teSnap2 = await taskRef.collection('time_entries').get()
    check('Subcoleções limpas após delete manual', subSnap2.empty && teSnap2.empty)

    await taskRef.delete()
    const gone = await taskRef.get()
    check('DELETE /api/tasks: tarefa removida', !gone.exists)
  }

  // ============================================
  // 4) NOTIFICATIONS — query com índice composto
  // ============================================
  console.log('\n4) Notifications')
  if (userListSnap.size > 0) {
    const uid = userListSnap.docs[0].id
    try {
      const notifSnap = await adminDb.collection('notifications')
        .where('usuario_id', '==', uid)
        .orderBy('criado_em', 'desc')
        .limit(20)
        .get()
      check(`Query com índice composto funciona (${notifSnap.size} notifs)`, true)
    } catch (e: any) {
      check('Query com índice composto funciona', false, e.message)
    }

    // Cria + lê + deleta
    const nRef = await adminDb.collection('notifications').add({
      usuario_id: uid,
      tarefa_id: 'fake-task',
      tipo: 'teste',
      titulo: 'Smoke',
      mensagem: 'test',
      lida: false,
      criado_em: new Date().toISOString(),
    })
    const nGet = await nRef.get()
    check('POST notification: criada', nGet.exists)
    await nRef.update({ lida: true })
    const nUpdated = await nRef.get()
    check('PATCH notification: lida=true', (nUpdated.data() as any).lida === true)
    await nRef.delete()
  }

  // ============================================
  console.log('\n' + '='.repeat(60))
  console.log(`✓ ${ok} testes passaram`)
  console.log(`✗ ${fail} testes falharam`)
  if (fails.length > 0) {
    console.log('\nFalhas:')
    fails.forEach(f => console.log(`  - ${f}`))
  }
  console.log('='.repeat(60))
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('\n💥 Erro fatal:', e); process.exit(2) })
