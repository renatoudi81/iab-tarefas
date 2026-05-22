// Firebase Admin SDK — usado APENAS no servidor (API routes, scripts)
// NUNCA importar em componentes 'use client' — contém credenciais privadas

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

function init(): App {
  if (getApps().length) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Credenciais do Firebase Admin não configuradas. ' +
      'Defina FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local'
    )
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

const app = init()

// databaseId explícito: o banco no Console aparece como "default"
// mas pode ser "(default)" internamente — testamos ambos
export const adminDb: Firestore = getFirestore(app, 'default')
try {
  adminDb.settings({ preferRest: true })
} catch {
  // settings só pode ser chamado uma vez; ignora em hot reload
}

export const adminAuth: Auth = getAuth(app)

// Storage Admin NÃO é usado — Firebase Storage exige plano Blaze.
// Uploads continuam via API route /api/upload usando Vercel Blob.
