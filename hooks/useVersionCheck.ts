'use client'
import { useEffect, useRef } from 'react'
import { useToast } from '@/contexts/ToastContext'

/**
 * Detecta quando há um novo deploy e oferece ao usuário recarregar.
 *
 * Como funciona:
 * - NEXT_PUBLIC_BUILD_ID é baked no bundle JavaScript quando a página
 *   é carregada → esse é o "build id do cliente" (fixo enquanto a aba
 *   está aberta).
 * - GET /api/version retorna o build id ATUAL do servidor (sempre
 *   reflete o último deploy).
 * - Quando os dois divergem, sabemos que um deploy novo aconteceu E
 *   que o usuário está rodando código velho.
 *
 * Frequência: checa quando a aba ganha foco e a cada 90s. Não polui
 * a rede — request leve sem auth.
 *
 * UX: ao detectar nova versão, toast persistente (sem auto-dismiss)
 * pedindo pra recarregar. Botão "Atualizar agora" no toast faz reload.
 * Usuário no meio de algo pode fechar e seguir, mas o toast volta na
 * próxima checagem se ainda não recarregou.
 */
export function useVersionCheck() {
  const { push } = useToast()
  // Garante que só mostramos o toast UMA vez por sessão até a pessoa
  // recarregar (evita bombardear com toast a cada 90s).
  const notifiedRef = useRef(false)

  useEffect(() => {
    const currentVersion = process.env.NEXT_PUBLIC_BUILD_ID
    // Sem versão definida (build local sem env) → desativa o check
    if (!currentVersion || currentVersion.startsWith('dev-')) return

    const check = async () => {
      if (notifiedRef.current) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { buildId } = await res.json()
        if (buildId && buildId !== currentVersion) {
          notifiedRef.current = true
          // Toast persistente (duration: 0 = sem auto-dismiss) com botão
          // "Atualizar agora" que faz hard reload — pega assets novos.
          push({
            variant: 'info',
            title: 'Nova versão disponível',
            description: 'Atualize a página para ver as últimas mudanças.',
            duration: 0,
            action: {
              label: 'Atualizar agora',
              onClick: () => window.location.reload(),
            },
          })
        }
      } catch {
        // silencia erros de rede — vai tentar de novo no próximo tick
      }
    }

    // Primeira checagem imediata
    check()

    // Checa quando a aba ganha foco (usuário voltou pra aba)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    // Checa periodicamente (cada 90s) enquanto a aba está aberta
    const interval = setInterval(check, 90_000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [push])
}
