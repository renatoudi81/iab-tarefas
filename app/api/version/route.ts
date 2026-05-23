import { NextResponse } from 'next/server'

/**
 * Retorna o build ID ATUAL do servidor.
 *
 * O client compara isso com a sua versão (NEXT_PUBLIC_BUILD_ID, baked
 * no bundle ao carregar a página) pra detectar quando há um deploy novo.
 *
 * Não requer autenticação — informação pública e indispensável pra
 * funcionamento do auto-reload.
 *
 * Cache-Control: no-store garante que cada request bate no server e
 * pega a versão verdadeira, não uma resposta cacheada do CDN.
 */
export async function GET() {
  return NextResponse.json(
    {
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'unknown',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    },
  )
}
