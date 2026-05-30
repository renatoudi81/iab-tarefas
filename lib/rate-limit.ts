/**
 * Rate limit por janela fixa, persistido no Firestore (funciona em
 * serverless — memória não persiste entre invocações).
 *
 * Estratégia: 1 doc por chave em `rate_limits` com { count, windowStart }.
 * Quando a janela expira, reseta. Usa transaction para evitar corrida
 * entre invocações concorrentes.
 *
 * Uso (numa API route):
 *   const rl = await checkRateLimit(`ai-parse:${user.uid}`, 20, 60_000)
 *   if (!rl.allowed) return NextResponse.json(
 *     { error: 'Muitas requisições. Tente novamente em instantes.' },
 *     { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
 *   )
 */
import { adminDb } from './firebase-admin'

export interface RateLimitResult {
  allowed: boolean
  /** ms até a janela liberar (0 quando allowed) */
  retryAfterMs: number
  /** requisições restantes na janela atual */
  remaining: number
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const ref = adminDb.collection('rate_limits').doc(key)
  const now = Date.now()

  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const data = snap.exists
        ? (snap.data() as { count: number; windowStart: number })
        : null

      // Sem registro ou janela expirada → inicia nova janela
      if (!data || now - data.windowStart >= windowMs) {
        tx.set(ref, { count: 1, windowStart: now })
        return { allowed: true, retryAfterMs: 0, remaining: limit - 1 }
      }

      // Dentro da janela e já no limite → bloqueia
      if (data.count >= limit) {
        return {
          allowed: false,
          retryAfterMs: data.windowStart + windowMs - now,
          remaining: 0,
        }
      }

      // Dentro da janela, abaixo do limite → incrementa
      tx.update(ref, { count: data.count + 1 })
      return { allowed: true, retryAfterMs: 0, remaining: limit - data.count - 1 }
    })
  } catch {
    // Falha no Firestore não deve bloquear o usuário legítimo (fail-open).
    return { allowed: true, retryAfterMs: 0, remaining: limit }
  }
}
