// Firebase Client SDK — usado no browser (componentes 'use client')
// Para o lado servidor (API routes), usar lib/firebase-admin.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Evita inicializar mais de uma vez em hot reload do Next.js
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(firebaseApp)
// Define o idioma dos e-mails de auth (reset de senha, verificação etc.) para pt-BR
auth.languageCode = 'pt-BR'

// IMPORTANTE: o banco do nosso projeto no Firebase tem ID literal "default"
// (sem parênteses). Por padrão, o SDK procura por "(default)" e a chamada
// fica pendurada esperando um banco que não existe — o que travava o
// AuthContext em loading=true após signIn.
export const db: Firestore = getFirestore(firebaseApp, 'default')

// Storage NÃO é usado — Firebase Storage exige plano Blaze (pago).
// Anexos continuam no Vercel Blob (BLOB_READ_WRITE_TOKEN no .env.local).
