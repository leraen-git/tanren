import { encrypt, decrypt, deterministicHash } from '../services/cryptoService.js'

const ENCRYPTION_ENABLED = !!process.env['ENCRYPTION_KEY']

// ─── User fields ─────────────────────────────────────────────────────────────

export function encryptUserFields(data: { email?: string; name?: string }): {
  email?: string
  name?: string
  emailHash?: string
} {
  if (!ENCRYPTION_ENABLED) return { ...data }
  const result: { email?: string; name?: string; emailHash?: string } = { ...data }
  if (data.email) {
    result.emailHash = deterministicHash(data.email)
    result.email = encrypt(data.email)
  }
  if (data.name) {
    result.name = encrypt(data.name)
  }
  return result
}

export function decryptUserFields<T extends Record<string, unknown>>(user: T): T {
  if (!ENCRYPTION_ENABLED) return user
  const result: Record<string, unknown> = { ...user }
  if (typeof result['email'] === 'string' && (result['email'] as string).includes('.')) {
    try { result['email'] = decrypt(result['email'] as string) } catch { /* not encrypted */ }
  }
  if (typeof result['name'] === 'string' && (result['name'] as string).includes('.')) {
    try { result['name'] = decrypt(result['name'] as string) } catch { /* not encrypted */ }
  }
  return result as T
}

// ─── Diet profile fields ─────────────────────────────────────────────────────

const DIET_ENCRYPTED_FIELDS = [
  'hatedFoods', 'dietaryRestrictions', 'currentSnacks',
] as const

export function encryptDietFields<T extends Record<string, unknown>>(profile: T): T {
  if (!ENCRYPTION_ENABLED) return profile
  const result: Record<string, unknown> = { ...profile }
  for (const field of DIET_ENCRYPTED_FIELDS) {
    if (typeof result[field] === 'string' && (result[field] as string).length > 0) {
      result[field] = encrypt(result[field] as string)
    }
  }
  return result as T
}

export function decryptDietFields<T extends Record<string, unknown>>(profile: T): T {
  if (!ENCRYPTION_ENABLED) return profile
  const result: Record<string, unknown> = { ...profile }
  for (const field of DIET_ENCRYPTED_FIELDS) {
    if (typeof result[field] === 'string' && (result[field] as string).includes('.')) {
      try { result[field] = decrypt(result[field] as string) } catch { /* not encrypted */ }
    }
  }
  return result as T
}
