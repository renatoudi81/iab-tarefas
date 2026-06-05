'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Tipos minimos da Web Speech API — TS DOM lib nao traz por padrao.
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognitionResult { 0: SpeechRecognitionAlternative; isFinal: boolean; length: number }
interface SpeechRecognitionResultList { length: number; item(i: number): SpeechRecognitionResult; [i: number]: SpeechRecognitionResult }
interface SpeechRecognitionEvent extends Event { resultIndex: number; results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent extends Event { error: string; message?: string }

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((ev: SpeechRecognitionEvent) => void) | null
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

export interface UseSpeechRecognitionOptions {
  /** Idioma BCP-47. Default: pt-BR */
  lang?: string
  /** Reconhecimento continuo (nao para sozinho). Default: true */
  continuous?: boolean
  /** Resultados parciais em tempo real. Default: true */
  interimResults?: boolean
  /** Callback recebe cada pedaco FINAL (textos confirmados) — bom pra
   *  concatenar ao final de um textarea existente sem dar conflito com
   *  edicoes do usuario no meio da gravacao. */
  onFinalChunk?: (text: string) => void
}

/**
 * Hook que envelopa Web Speech API (Chrome/Edge, gratuita).
 * - isSupported: false em Safari/Firefox e em contextos nao seguros (http)
 * - listening:   true enquanto o microfone esta ativo
 * - transcript:  acumulado final + interino (do ultimo chunk em andamento)
 * - error:       string com a mensagem em pt-BR pronta pra exibir
 */
export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const { lang = 'pt-BR', continuous = true, interimResults = true, onFinalChunk } = opts

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // Snapshot do callback pra nao recriar o recognition a cada render
  const onFinalChunkRef = useRef(onFinalChunk)
  useEffect(() => { onFinalChunkRef.current = onFinalChunk }, [onFinalChunk])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!Ctor)
  }, [])

  const ensureInstance = useCallback((): SpeechRecognitionInstance | null => {
    if (recognitionRef.current) return recognitionRef.current
    if (typeof window === 'undefined') return null
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return null
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = continuous
    rec.interimResults = interimResults
    rec.maxAlternatives = 1
    rec.onstart = () => { setListening(true); setError(null) }
    rec.onend = () => { setListening(false); setInterim('') }
    rec.onerror = (ev) => {
      const code = ev.error
      const map: Record<string, string> = {
        'no-speech': 'Nada foi detectado. Tente falar novamente.',
        'audio-capture': 'Microfone nao encontrado. Verifique o dispositivo.',
        'not-allowed': 'Permissao do microfone negada. Habilite no navegador.',
        'service-not-allowed': 'Servico de reconhecimento nao permitido.',
        'aborted': '',
        'network': 'Sem conexao com o servico de reconhecimento.',
      }
      const msg = map[code] ?? `Erro no reconhecimento: ${code}`
      if (msg) setError(msg)
      setListening(false)
    }
    rec.onresult = (ev) => {
      let finalText = ''
      let interimText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) {
        setTranscript((prev) => (prev ? prev + ' ' : '') + finalText.trim())
        onFinalChunkRef.current?.(finalText.trim())
      }
      setInterim(interimText)
    }
    recognitionRef.current = rec
    return rec
  }, [lang, continuous, interimResults])

  const start = useCallback(() => {
    const rec = ensureInstance()
    if (!rec) {
      setError('Reconhecimento de voz nao disponivel neste navegador.')
      return
    }
    try {
      setError(null)
      rec.start()
    } catch (e) {
      // start() lanca se ja estiver rodando — ignora silenciosamente
      const msg = e instanceof Error ? e.message : String(e)
      if (!/already started/i.test(msg)) setError(msg)
    }
  }, [ensureInstance])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  // Cleanup: aborta gravacao quando o componente desmonta
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort() } catch { /* ignore */ }
    }
  }, [])

  return { isSupported, listening, transcript, interim, error, start, stop, reset }
}
