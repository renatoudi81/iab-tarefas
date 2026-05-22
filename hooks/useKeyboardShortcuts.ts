'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Atalhos de teclado em chord (acordes) — padrão Linear/Vercel.
 *
 * Pressione G e depois (dentro de 1.5s) a letra do destino:
 *  G D → Dashboard
 *  G L → Lista
 *  G K → Kanban
 *  G G → Gantt
 *  G R → Relatórios
 *  G P → Perfil
 *
 * Outros atalhos:
 *  ? → abre Command Palette (alias para ⌘K)
 *
 * Não dispara quando:
 *  - O foco está em <input>, <textarea>, [contenteditable]
 *  - Modais abertos com role="dialog"/[aria-modal="true"]
 *  - Ctrl/Cmd/Alt está sendo pressionado (deixa atalhos do sistema)
 */

const CHORD_TIMEOUT_MS = 1500

const ROUTES: Record<string, string> = {
  d: '/dashboard',
  l: '/lista',
  k: '/kanban',
  g: '/gantt',
  r: '/relatorios',
  p: '/perfil',
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const chordOpen = useRef<boolean>(false)
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const isTextInput = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    const isModalOpen = () => {
      // Qualquer dialog/portal com aria-modal aberto
      return !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][aria-modal="true"]')
    }

    const closeChord = () => {
      chordOpen.current = false
      if (chordTimer.current) {
        clearTimeout(chordTimer.current)
        chordTimer.current = null
      }
    }

    const handler = (e: KeyboardEvent) => {
      // Não interferir com atalhos do sistema/navegador
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Não disparar enquanto digitando
      if (isTextInput(e.target)) return
      // Não disparar com modal aberto
      if (isModalOpen()) return

      const key = e.key.toLowerCase()

      // Modo chord aberto: aguardando a 2ª tecla
      if (chordOpen.current) {
        const route = ROUTES[key]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
        closeChord()
        return
      }

      // Inicia chord G
      if (key === 'g') {
        chordOpen.current = true
        chordTimer.current = setTimeout(closeChord, CHORD_TIMEOUT_MS)
        return
      }

      // ? abre command palette (dispatcha ⌘K)
      if (key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        const isMac = navigator.platform.toUpperCase().includes('MAC')
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'k', metaKey: isMac, ctrlKey: !isMac, bubbles: true,
        }))
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      if (chordTimer.current) clearTimeout(chordTimer.current)
    }
  }, [router])
}
