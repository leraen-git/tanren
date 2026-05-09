# Tanren API Security Runbook

## Email encryption

All email addresses are encrypted at rest using AES-256-GCM via `src/services/cryptoService.ts`.

### Key material
- Primary: `AES_ENCRYPTION_KEY` (env var, 32 bytes base64)
- Key derivation: direct use (no KDF)
- IV: random 12 bytes per encryption
- Deterministic lookup: SHA-256(email + `EMAIL_HASH_SALT`) stored in `emailHash` column

### Key access
- Production key is stored in Railway environment variables
- Access granted only to: Ramy (sole developer)
- Last rotation: initial key set 2026-04-18

### Rotation procedure

To rotate the encryption key without downtime:

1. Generate new key: `openssl rand -base64 32`
2. Deploy with BOTH keys set:
   - `AES_ENCRYPTION_KEY_V2=<new-key>`
   - `AES_ENCRYPTION_KEY_V1=<old-key>`
3. Update `cryptoService.ts` to:
   - Encrypt with V2
   - Decrypt: try V2 first, fallback to V1
4. Add `emailKeyVersion` column to users table (`v1 | v2`)
5. Run migration script to re-encrypt all users with V2, setting `emailKeyVersion = 'v2'`
6. Once all users migrated, remove V1 env var and fallback code
7. Document the rotation in this file with date and reason

### Incident response

If the AES key is compromised:
1. Rotate immediately (above procedure, compressed to <4h)
2. Notify affected users via email (CNIL requires within 72h per GDPR article 33)
3. Force re-login for all sessions: flush Redis `session:*` keys

## Session tokens

- Opaque tokens: `crypto.randomBytes(32).toString('base64url')`
- Stored in Redis with TTL (30 days normal, 7 days guest)
- Managed by `src/services/sessionService.ts`
- Tokens are NOT JWTs — no payload to decode client-side

## Rate limiting

- Global: 200 req/min per IP via `@fastify/rate-limit`
- Per-procedure: tRPC middleware in `src/middleware/rateLimit.ts`
  - `auth.signInWithApple`: 10/min per IP
  - `auth.signInWithGoogle`: 10/min per IP
  - `auth.guestSignIn`: 5/min per IP
  - `auth.requestOtp`: 3/15min per email (in-router)
  - `auth.verifyOtp`: 5 attempts per OTP (in-router)
- POST-only: GET requests to `/trpc/*` return 405

## Admin role

Tanren has a binary role model: `user` (default) or `admin`. Stored in the
`users.role` column (Postgres enum `user_role_enum`).

### Promotion

Promotion is done via a CLI script — never via API, never via env var:

```bash
cd apps/api && npm run admin:promote -- --email <email>
```

The script writes an entry to `admin_audit_log` with action='bootstrap'.

### Admin procedure

All admin routes use `adminProcedure` middleware which:
- Returns `NOT_FOUND` (not `FORBIDDEN`) to non-admin users — no info leak
- Logs the denial attempt for monitoring
- Injects `ctx.user` with role, quotaOverrides, and preferredLlmModel

### Audit log

Every admin mutation writes a row to `admin_audit_log`. The table is
append-only by convention (no DELETE in code). To inspect:

```sql
SELECT created_at, action, target_user_id, payload
FROM admin_audit_log
WHERE admin_user_id = '<your-uuid>'
ORDER BY created_at DESC
LIMIT 50;
```

## Dev-only endpoints

- `auth.devSignIn`: throws `NOT_FOUND` in production (invisible)
- Dev auth fallback (`DEV_USER_ID`): only active when `NODE_ENV=development` AND `ENABLE_DEV_AUTH=true`
