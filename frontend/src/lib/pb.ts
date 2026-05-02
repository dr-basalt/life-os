import PocketBase from 'pocketbase'
import { PUBLIC_PB_URL } from '$env/static/public'

// Singleton PocketBase client
export const pb = new PocketBase(PUBLIC_PB_URL || 'http://localhost:8090')

// Désactiver auto-cancel pour éviter les erreurs sur les navigations rapides
pb.autoCancellation(false)

export type AuthModel = typeof pb.authStore.model
