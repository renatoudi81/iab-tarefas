import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ConfirmProvider } from '@/contexts/ConfirmContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GrainOverlay } from '@/components/ui/GrainOverlay'
import { ScrollProgress } from '@/components/ui/ScrollProgress'
import './globals.css'

// Fontes premium recomendadas pela skill design-taste-frontend:
// Geist Sans + Geist Mono. Substitui Inter (banido pela skill).
const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})
const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Instituto Alfa e Beto — Tarefas',
  description: 'Gestão Inteligente de Tarefas',
  icons: {
    // Favicon principal — usa a versão DARK (azul) do símbolo porque
    // a versão padrão (logo-iab-symbol.svg) é branca e fica invisível
    // na barra de abas do browser (fundo claro).
    icon: [
      { url: '/logo-iab-symbol-dark.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo-iab-symbol-dark.svg',
    shortcut: '/logo-iab-symbol-dark.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <TooltipProvider delayDuration={400} skipDelayDuration={150}>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <ScrollProgress />
                {children}
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </TooltipProvider>
        <GrainOverlay />
      </body>
    </html>
  )
}
