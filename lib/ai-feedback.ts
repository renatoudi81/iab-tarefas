import { apiFetch } from '@/lib/api-fetch'
import type { Task } from '@/types'

export interface AIProposta {
  categoria: string | null
  tipo_publico: string | null
  canal: string | null
  prioridade: string | null
}
export interface AIContext {
  mensagem: string
  proposta: AIProposta
}

/**
 * Registra a correção feita pelo humano (proposta da IA → valores salvos).
 * O endpoint só grava se houve divergência. Falha silenciosa: aprendizado
 * é "best effort", nunca deve quebrar o fluxo de criação da tarefa.
 */
export async function registrarAprendizadoIA(ctx: AIContext, task: Task): Promise<void> {
  try {
    await apiFetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagem: ctx.mensagem,
        proposta: ctx.proposta,
        final: {
          categoria: task.categoria ?? null,
          tipo_publico: task.tipo_publico ?? null,
          canal: task.canal ?? null,
          prioridade: task.prioridade ?? null,
        },
      }),
    })
  } catch {
    // silencioso — não atrapalha a criação da tarefa
  }
}
