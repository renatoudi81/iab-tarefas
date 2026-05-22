'use client'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  backTo?: { href: string; label: string }
  children: ReactNode
}

/**
 * Layout reutilizável para telas de autenticação (login, esqueci-senha,
 * redefinir-senha). Mantém o branding e a estética consistentes.
 */
export default function AuthLayout({ title, subtitle, backTo, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1530] relative overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1530] via-[#0F1E45] to-[#091333]" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.12)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10)_0%,transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-[440px]"
      >
        {/* Logo + brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
            <Image
              src="/logo-iab-symbol.svg"
              alt="IAB"
              width={26}
              height={28}
              className="object-contain"
            />
          </div>
          <div className="text-left">
            <div className="text-[0.9rem] font-bold tracking-tight text-white leading-tight">
              Instituto Alfa e Beto
            </div>
            <div className="text-[0.72rem] text-[#94A3B8]">Controle de Atividades</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]">
          <h1 className="text-[1.5rem] font-bold text-white tracking-tight mb-1">{title}</h1>
          {subtitle && <p className="text-[#94A3B8] text-sm mb-7">{subtitle}</p>}
          {!subtitle && <div className="mb-7" />}
          {children}
        </div>

        {backTo && (
          <Link
            href={backTo.href}
            className="mt-6 flex items-center justify-center gap-1.5 text-[0.82rem] text-[#94A3B8] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            {backTo.label}
          </Link>
        )}

        <p className="text-center mt-6 text-[0.72rem] text-[#475569]">
          © {new Date().getFullYear()} Instituto Alfa e Beto · Uso exclusivo corporativo
        </p>
      </motion.div>
    </div>
  )
}
