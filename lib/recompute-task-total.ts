import { adminDb } from '@/lib/firebase-admin'

/**
 * Recomputa `tempo_gasto_total` da tarefa somando os time_entries — DENTRO
 * de uma transação. Sem ela havia race condition: dois lançamentos
 * simultâneos liam o mesmo conjunto de entries e o segundo write gravava
 * um total desatualizado. A transação faz o Firestore reexecutar o cálculo
 * se os entries mudarem entre a leitura e o commit.
 *
 * Usado por POST /api/time-entries e PATCH/DELETE /api/time-entries/[id].
 */
export async function recomputeTaskTotal(tarefaId: string): Promise<number> {
  const taskRef = adminDb.collection('tasks').doc(tarefaId)
  const entriesQuery = taskRef.collection('time_entries')
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(entriesQuery)
    const total = snap.docs.reduce(
      (sum, d) => sum + Number((d.data() as { duracao?: number }).duracao || 0),
      0,
    )
    tx.update(taskRef, {
      tempo_gasto_total: total,
      atualizado_em: new Date().toISOString(),
    })
    return total
  })
}
