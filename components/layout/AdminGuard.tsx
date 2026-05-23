'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldAlert, Loader2 } from 'lucide-react'

/**
 * Guard que só renderiza children se o usuário for Administrador.
 *
 * Defesa em profundidade:
 * - Sidebar já oculta links de admin pra não-admin (UX)
 * - APIs já checam perfil server-side (segurança real)
 * - Este guard impede o render do conteúdo do painel mesmo se alguém
 *   acessar via URL direta, e mostra "Acesso negado" enquanto redireciona
 *
 * Uso:
 *   <AdminGuard>
 *     <UsuariosPage />
 *   </AdminGuard>
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const isAdmin = user?.perfil === 'Administrador'

  useEffect(() => {
    // Auth resolvido + usuário não-admin → redireciona pro dashboard
    if (!loading && user && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [loading, user, isAdmin, router])

  // Auth ainda carregando ou redirecionamento em curso: mostra spinner.
  // NUNCA renderiza children pra quem não for admin (mesmo que a página
  // tente acessar dados via hooks/APIs, o servidor responde 403).
  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={22} className="text-[#2563EB] animate-spin" />
        <p className="text-[0.85rem] text-[#71717A]">Verificando permissões...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <ShieldAlert size={22} className="text-[#DC2626]" />
        </div>
        <div>
          <h2 className="text-[1.1rem] font-bold text-[#0F172A]">Acesso restrito</h2>
          <p className="text-[0.85rem] text-[#71717A] mt-1 max-w-sm">
            Esta área é exclusiva para administradores. Você será redirecionado em instantes...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
