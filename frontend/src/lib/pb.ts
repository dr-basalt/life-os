import PocketBase from 'pocketbase'

// Dériver l'URL de l'API depuis le hostname courant au runtime
// Ex: stern-os.ori3com.cloud → api.stern-os.ori3com.cloud
function getApiUrl(): string {
  if (typeof window === 'undefined') {
    // SSR: communication interne Docker
    return process.env.PUBLIC_PB_URL || 'http://sternos-pb:8090'
  }
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8090'
  }
  // Remplace le premier sous-domaine par "api"
  return `${window.location.protocol}//${host.replace(/^[^.]+/, 'api')}`
}

// Singleton PocketBase client
export const pb = new PocketBase(getApiUrl())

// Désactiver auto-cancel pour éviter les erreurs sur les navigations rapides
pb.autoCancellation(false)

export type AuthModel = typeof pb.authStore.model
