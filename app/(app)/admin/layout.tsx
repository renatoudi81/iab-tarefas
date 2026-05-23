import { AdminGuard } from '@/components/layout/AdminGuard'

/**
 * Layout do painel Admin.
 *
 * Aplica AdminGuard em TODAS as rotas sob /admin/* — qualquer página
 * nova criada aqui herda a proteção automaticamente. Defesa em profundidade
 * combinada com:
 *  - Sidebar: oculta links de admin para não-admin (UX)
 *  - APIs: rejeitam 403 mutações de não-admin (segurança real)
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>
}
