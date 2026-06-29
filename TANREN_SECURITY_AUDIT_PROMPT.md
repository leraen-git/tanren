# Tanren — Plan de vérification sécurité (Full Stack)

> **Pour Claude Code · à exécuter dans le monorepo Tanren**
>
> **Contexte temporel** : Beta fermée Android Play Store, ~50-200 utilisateurs réels. iOS bientôt en TestFlight. La fenêtre actuelle est la **dernière opportunité de corriger des failles avant que la base utilisateurs scale**. Tout problème non détecté maintenant deviendra un incident à gérer dans 3 mois sous pression.
>
> **Mode opératoire** : Cet audit se fait en **3 phases séquentielles**, pas en parallèle. Tu ne passes pas à la phase suivante sans validation explicite de Ramy.
>
> **Phase 1** — Rapport markdown structuré, classé par sévérité, sans toucher au code
> **Phase 2** — Checklist exécutable des fixes prioritaires, ordonnée
> **Phase 3** — Patches PR-par-PR, avec tests, après validation de la checklist
>
> **Stack à auditer** :
> - **Mobile** : Expo SDK 55, RN 0.83.6, TypeScript 5.9.2, Zustand, Expo Router, expo-secure-store
> - **Backend** : Node.js + Fastify 5.2.1, tRPC v11, Drizzle ORM 0.45.2, PostgreSQL, Redis
> - **Auth** : Custom (opaque session tokens en Redis), Apple/Google SSO, OTP email via Resend
> - **Crypto** : AES-256-GCM pour emails (custom `cryptoService.ts`), SHA-256 pour `emailHash`
> - **Infra** : Railway (API), PostgreSQL managé, Redis managé, Squarespace (DNS), Resend (transactional email), Vercel (site web)

---

## ⚠️ Règles d'engagement

### Ce que tu DOIS faire
1. **Lire avant d'écrire**. Pour chaque file que tu suspectes, ouvre-le complètement avant de tirer une conclusion.
2. **Citer du code**. Chaque finding doit avoir un pointeur `path/to/file.ts:LINE-LINE` avec le snippet pertinent.
3. **Classer par sévérité réelle**, pas par sévérité théorique. Une faille "critique" qui exige un attaquant ayant déjà root sur la machine n'est pas critique.
4. **Distinguer "vulnérabilité prouvée" vs "smell"**. Un smell mérite mention, mais sous une rubrique séparée — pas dans la liste des findings.
5. **Marquer les hypothèses**. Si tu n'as pas accès à un fichier de config, à des secrets, ou à l'infra Railway pour vérifier, dis-le explicitement : "🔒 Hypothèse non vérifiable depuis le repo : [...]".
6. **Vérifier les imports d'environnement**. Beaucoup de failles viennent d'un `process.env.X` qui finit dans le bundle mobile par accident.

### Ce que tu NE DOIS PAS faire
1. **Pas de scan automatique**. Pas de `npm audit` qui crache 200 lignes — c'est inutile. Trie manuellement, contextualise.
2. **Pas de findings hypothétiques**. "Si l'attaquant compromet le serveur Postgres, il pourrait..." n'est pas un finding, c'est une tautologie.
3. **Pas d'OWASP Top 10 récité**. Tu écris un rapport pour un dev solo qui a 2 jours, pas une thèse.
4. **Pas de patch en Phase 1**. Tu observes, tu décris, tu ne touches à rien.
5. **Pas de découverte hors scope**. Si tu trouves un bug fonctionnel non lié à la sécurité, note-le dans une rubrique "À part" mais ne l'inclus pas dans le rapport principal.

### Quand tu STOPPES et demandes
- Tu trouves quelque chose qui ressemble à une **faille critique exploitée en cours** (ex: log d'un endpoint qui dump des emails en clair, présence de fichiers `.env.production` commit). → STOP, alerte Ramy immédiatement avant de continuer.
- Tu n'arrives pas à déterminer si un comportement est intentionnel ou un bug (ex: une route admin sans auth qui pourrait être un dev-only). → STOP, demande.
- Tu manques d'accès à de la config externe (Railway env, secrets manager). → Note dans "Hypothèses non vérifiables" et continue.

---

# PHASE 1 — Rapport d'audit

> Livrable : `SECURITY_AUDIT_REPORT.md` à la racine du repo. **Ne touche à aucun autre fichier.**

## Structure du rapport

### En-tête
```markdown
# Tanren — Security Audit Report
**Date** : YYYY-MM-DD
**Auditeur** : Claude Code
**Scope** : Full stack (mobile + API + DB + infra observable depuis le repo)
**Méthode** : Lecture statique du code, sans exécution, sans accès production
**Périmètre exclu** : Code de l'app web Astro `tanren-web` (audit séparé)
```

### Sommaire exécutif (1 page max)
- Nombre total de findings par sévérité
- 3 problèmes les plus urgents en une phrase chacun
- Estimation grossière de l'effort total (jours-homme) pour fermer toutes les failles **Critique** et **Élevée**
- Verdict : "OK pour scaler la beta", "OK avec fixes prioritaires", "Bloquant — corriger avant nouvel utilisateur"

### Findings — classés par sévérité

Pour chaque finding, format strict :

```markdown
## [SEV-X.Y] Titre court et concret

- **Sévérité** : Critique / Élevée / Modérée / Faible / Smell
- **Catégorie** : Auth / AuthZ / Crypto / Injection / Data exposure / Config / Mobile / Dépendances / Logging / DoS / Autre
- **Fichier(s)** : `apps/api/src/routers/auth.ts:42-58`
- **Surface d'attaque** : qui peut exploiter, depuis où (réseau, mobile, base, etc.)
- **Pré-requis pour exploiter** : (ex : "aucun, public", "compte authentifié", "accès au device", "MITM réseau actif")
- **Impact concret pour Tanren** : Pas générique. Spécifique. Ex : "Permet à n'importe qui d'énumérer les emails de tous les comptes via l'endpoint OTP."

### Code en cause
\`\`\`ts
// snippet exact, 5-15 lignes
\`\`\`

### Pourquoi c'est un problème
2-4 phrases. Pédagogique mais sans baratin.

### Comment exploiter (proof of concept)
Si exploitable depuis l'extérieur, donne un `curl` ou un script court qui démontre. Si l'exploit nécessite des conditions complexes, décris-les. Si tu ne peux pas démontrer concrètement, dis-le.

### Fix recommandé
- **Approche** : 1-2 phrases sur la stratégie
- **Effort estimé** : XS (< 1h) / S (< 1/2j) / M (1j) / L (2-3j) / XL (> 3j)
- **Régression possible** : oui/non + zone à retester
- **Ordre de priorité** : si plusieurs findings se chevauchent, indiquer le bon ordre de fix

### Références
- Lien CVE / CWE / OWASP / blog post pertinent (max 2)
```

### Sévérité — barème explicite (à appliquer rigoureusement)

| Niveau | Définition | Exemples Tanren |
|--------|------------|-----------------|
| **Critique** | Exploitation triviale (≤ 5 min sans outils), impact massif (PII en bulk, auth bypass total, RCE) | Auth bypass, dev procedure exposée en prod, leak en clair de tous les emails, secret en dur dans le bundle mobile |
| **Élevée** | Exploitation faisable mais demande effort/conditions, impact significatif (PII d'un utilisateur, escalation) | Brute-force OTP non rate-limité, injection SQL via Drizzle mal utilisé, IDOR sur sessions |
| **Modérée** | Exploitable mais limité, ou exigeant déjà un compromis partiel | Logs avec PII, manque de protection CSRF (si applicable), JWT sans rotation |
| **Faible** | Théoriquement exploitable, impact mineur, ou exigeant des conditions improbables | Headers de sécurité manquants, version banner exposée |
| **Smell** | Pas une faille, mais code qui rend une faille future plus probable | Magic strings, manque de validation `zod` sur input non-sensible |

⚠️ **Si tu hésites entre deux niveaux, prends le plus bas et explique ton raisonnement.** L'inflation de sévérité est une faute professionnelle.

---

## Domaines d'audit — Checklist de couverture obligatoire

Tu dois passer chaque domaine. Pour chaque, soit tu trouves un finding et tu le documentes, soit tu écris explicitement "✅ Pas de finding pour ce domaine — vérifications effectuées : [liste]".

### A. Authentification & Sessions

- [ ] **OTP email** (`apps/api/src/routers/auth.ts`)
  - Génération : entropie suffisante ? (≥ 6 chiffres → 1M combinaisons, faible)
  - Stockage : où, comment, TTL ?
  - Vérification : protection contre brute-force ? Compteur de tentatives ?
  - Réutilisation : OTP supprimé après usage ? Réémission limitée ?
  - Timing attacks : comparaison constant-time ?
- [ ] **Session tokens** (Redis)
  - Génération : `crypto.randomBytes` ou équivalent ? (jamais `Math.random`)
  - Entropie : ≥ 128 bits ?
  - TTL : raisonnable ? (jours, pas mois)
  - Invalidation : déconnexion réelle ? Sessions purgées sur changement de mot de passe / suppression de compte ?
  - Stockage côté mobile : `expo-secure-store` ou `AsyncStorage` ? (le second est UNE FAILLE)
- [ ] **Apple Sign-In / Google Sign-In**
  - Vérification d'identité : token JWT signé vérifié côté serveur (issuer, audience, signature, expiry) ?
  - Pas de "trust on first use" ? Pas de signature non vérifiée ?
  - Mapping authProvider → user : protection contre takeover (ex: créer un compte email puis Apple Sign-In sur le même email) ?
- [ ] **Procédures dev** (`devSignIn`, debug routes, etc.)
  - Désactivées en `NODE_ENV=production` ?
  - Si oui, retournent `NOT_FOUND` (pas `FORBIDDEN`) pour ne pas leak l'existence ?
- [ ] **Logout** : invalide le token côté serveur, pas seulement côté client ?

### B. Autorisation (AuthZ) & contrôle d'accès

- [ ] **`protectedProcedure`** (tRPC) : appliquée partout où nécessaire ? Aucune procédure sensible en `publicProcedure` par accident ?
- [ ] **IDOR** : chaque query/mutation qui prend un `id` en input vérifie que l'utilisateur courant possède bien la ressource ?
  - Exemple : `sessions.delete({ sessionId })` vérifie `session.userId === ctx.userId` ?
  - À auditer pour : sessions, exercises, weight entries, photos, plans, recipes, courses
- [ ] **Soft-deleted users** : impossible de se reconnecter / d'accéder via un token résiduel ?
- [ ] **Admin routes** : si elles existent, comment sont-elles protégées ? (rôle DB, header magique = NON, IP whitelist, etc.)

### C. Cryptographie

- [ ] **AES-256-GCM** sur emails (`cryptoService.ts`)
  - IV unique par opération (jamais réutilisé) ?
  - Auth tag vérifié au déchiffrement ?
  - Clé : longueur correcte (32 bytes) ? Source (env, pas hardcodée) ?
  - KDF : direct ou dérivé ? Si direct, est-ce acceptable ?
- [ ] **Hash email pour lookup** : `SHA-256(email + EMAIL_HASH_SALT)`
  - Salt présent ? Source (env) ?
  - Risque d'énumération si salt leaké : documenté ?
- [ ] **Pas d'usage de** : `MD5`, `SHA-1`, `crypto.createCipher` (deprecated, sans IV), `Math.random`
- [ ] **Mots de passe** : si pertinent (pas l'usage actuel), bcrypt/argon2/scrypt — pas SHA quoi que ce soit
- [ ] **JWT** (si présent) : algorithme `HS256`/`RS256` explicite, pas `none`, pas de fallback
- [ ] **Secrets dans le code** : grep tous les fichiers pour patterns suspects (clé API, token, password en dur)

### D. Validation d'input & injection

- [ ] **Zod** : chaque tRPC procedure a un schéma `z.object({})` strict en input ?
- [ ] **Drizzle** : aucune query construite avec template strings + concaténation ? Utilisation des helpers `eq()`, `and()`, `sql`-tagged-template ?
- [ ] **Email validation** : `z.string().email()` partout où un email est input
- [ ] **Tailles limitées** : strings non bornées (description workout, nom de plan, notes recette) qui pourraient faire un DoS via insertion énorme
- [ ] **HTML/Markdown user-generated** : si rendu côté mobile (workout notes, recipe instructions), risque XSS si `WebView` ou `dangerouslySetInnerHTML` quelque part
- [ ] **File uploads** (photos d'évolution, avatar) : si présent, validation type MIME, taille, et pas de path traversal sur le nom de fichier

### E. Exposition de données (PII)

- [ ] **Logs serveur** : aucun log ne contient email en clair, OTP, session token, body de requête contenant PII
- [ ] **Réponses API** : `users.me` retourne strictement les champs nécessaires ? Pas de `passwordHash`/`emailHash` qui sortent par accident
- [ ] **Erreurs tRPC** : ne leakent pas la stack trace en production ? Le message d'erreur ne dit pas "Email john@x.com pas trouvé" (énumération)
- [ ] **Cache Redis** : TTL approprié ? Données sensibles purgées à la déco ?
- [ ] **Sentry / crash reports** : si configuré, scrubbing des PII en place ? (email, IP, token, etc.)

### F. Mobile (Expo / React Native)

- [ ] **Bundle inspection** : faire l'exercice mental — qu'est-ce qui se retrouve dans le bundle ?
  - Variables `EXPO_PUBLIC_*` : visibles côté client. Aucune donnée sensible dedans ?
  - Logs `console.log` en debug : strippés en prod ?
  - URLs d'API : pointent vers prod ? Pas de `localhost` qui traîne ?
- [ ] **Stockage local**
  - `expo-secure-store` pour les tokens (keychain/keystore) — vérifier
  - `AsyncStorage` ne contient pas de données sensibles (token, email en clair)
  - `MMKV` (s'il est introduit) : encryption activée ?
- [ ] **Deep links** : AASA / `assetlinks.json` corrects ? Pas de gestion de deep link qui exécute du code arbitraire ?
- [ ] **Certificate pinning** : présent ? Si non, OK pour beta mais à flagger pour production
- [ ] **Permissions** : Android `manifest` / iOS `Info.plist` demandent uniquement ce qui est strictement nécessaire ?
- [ ] **Jailbreak/root detection** : présent ? Pas obligatoire mais à mentionner
- [ ] **Screen recording / screenshots** : si app affiche des données sensibles, `FLAG_SECURE` Android / `isProtectedDataAvailable` iOS ?

### G. Configuration & secrets

- [ ] **`.env`** : présent dans `.gitignore` ?
- [ ] **Historique git** : `git log --all -- .env` ne trouve rien ? `git log -S "BEGIN PRIVATE KEY"` ?
- [ ] **`process.env.X`** : grep pour toutes les usages, vérifier qu'aucun secret backend n'est lu côté mobile
- [ ] **`EXPO_PUBLIC_*`** : tous les usages sont vraiment OK pour être publics ?
- [ ] **CORS** (Fastify) : whitelist explicite, pas `*` ouvert ?
- [ ] **Helmet / headers** : `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` (pour le site web séparé)

### H. Rate limiting & DoS

- [ ] **`@fastify/rate-limit`** ou équivalent installé et configuré ?
- [ ] **Endpoints publics** (auth.requestOtp, auth.verifyOtp, signup) : limites strictes ?
- [ ] **Endpoints authentifiés gourmands** (génération de plan IA, export, photo upload) : limités par user ?
- [ ] **Redis backing** : limites persistent à travers les redémarrages / multi-instances ?
- [ ] **Coût des requêtes IA** : un utilisateur malveillant peut-il vider ton budget OpenAI/Anthropic ? Quota par user ?

### I. Base de données

- [ ] **Connexion** : SSL forcé ? `?sslmode=require` dans la connection string ?
- [ ] **Credentials** : password fort (généré, pas humain), stocké uniquement dans Railway env ?
- [ ] **Backups** : actifs ? Encryption at rest ?
- [ ] **Schémas** : indexes manquants qui permettraient un DoS via query lourde ?
- [ ] **Soft delete** : si implémenté, queries non-admin filtrent bien `WHERE deleted_at IS NULL` partout ?
- [ ] **Migrations** : script de migration ne contient aucun secret en dur ? Pas de `INSERT` de user admin avec password hardcodé ?

### J. Dépendances

- [ ] **`npm audit`** : run-le, mais ne reporte que les vulnérabilités **réellement applicables** au code Tanren (ex: une CVE dans une lib server-side n'est pas critique si elle n'est pas utilisée sur un endpoint public)
- [ ] **Dépendances "abandonnées"** : packages avec dernier release > 2 ans, faible nombre de mainteneurs, qui touchent à la sécurité (auth, crypto, http)
- [ ] **Lockfile** : `package-lock.json` / `pnpm-lock.yaml` committé ? Pas de `^` qui permet drift ?
- [ ] **Postinstall scripts** : aucun package suspect avec `postinstall` non-trivial ?

### K. Logging & observabilité

- [ ] **Logs production** : pas de PII (vérifié au domaine E aussi mais re-check sous angle obs)
- [ ] **Sentry** : DSN dans `EXPO_PUBLIC_*` côté mobile (acceptable mais public) ; côté API en `process.env` privé
- [ ] **Trace sampling** : pas 100% en prod (coût + leak potentiel)
- [ ] **Alertes** : sur quoi alerte le système ? (5xx, latence, échecs auth) — manquant = blind spot

### L. Site web (Astro `tanren-web`)

> Périmètre limité car audit séparé prévu, mais à mentionner :

- [ ] **Form waitlist Resend** : protégé contre spam (captcha, rate limit, honeypot) ?
- [ ] **Variables d'env** : `RESEND_API_KEY` côté serveur uniquement, jamais dans le bundle client
- [ ] **Headers Vercel** : `Strict-Transport-Security`, `Content-Security-Policy`, `Permissions-Policy` configurés ?
- [ ] **AASA / assetlinks** : intacts, signés (pour iOS) ?

---

## Annexes du rapport

### Annexe 1 — Hypothèses non vérifiables
Liste exhaustive de tout ce que tu n'as pas pu vérifier depuis le repo (config Railway, contenu réel des secrets, état du DNS, configuration CDN, etc.). Format : "Hypothèse : [X]. Pour vérifier, [Ramy doit faire Y]."

### Annexe 2 — Smells (non-findings)
Choses qui ne sont pas des failles mais qui méritent d'être notées pour la santé long terme du code. Max 10 items.

### Annexe 3 — Hors scope
Bugs fonctionnels non-sécuritaires découverts pendant l'audit. Max 5 items, sinon ouvrir un issue séparé.

### Annexe 4 — Stratégie de threat modeling
Top 5 menaces concrètes pour Tanren à ce stade :
1. Énumération d'utilisateurs via OTP / Apple Sign-In
2. Brute-force OTP par botnet
3. Compromise de la clé AES → leak de tous les emails
4. Compromise du token Resend → spam massif depuis le domaine `send.tanren.fr`
5. ... (à compléter par Claude après audit)

Pour chaque, lister le contrôle existant + le contrôle manquant.

### Annexe 5 — Surface d'attaque externe
Liste des endpoints exposés publiquement (sans auth) :
- `POST /trpc/auth.requestOtp`
- `POST /trpc/auth.verifyOtp`
- `POST /trpc/auth.signInWithApple`
- `POST /trpc/auth.signInWithGoogle`
- `GET /health` (si présent)
- `[autres à découvrir]`

Pour chacun : quotes du code de validation + contrôles présents.

---

# 🛑 STOP après Phase 1

Une fois `SECURITY_AUDIT_REPORT.md` rédigé, **arrête tout travail**. Pas de commit, pas de modification de code. Affiche un récapitulatif :

```
═══════════════════════════════════════════════
PHASE 1 TERMINÉE — Rapport d'audit produit
═══════════════════════════════════════════════
Findings :
  - Critique  : X
  - Élevée    : Y
  - Modérée   : Z
  - Faible    : W
  - Smells    : V

Top 3 urgences :
  1. [SEV-1.X] Titre
  2. [SEV-1.Y] Titre
  3. [SEV-2.X] Titre

Verdict : [OK / OK avec fixes / BLOQUANT]

Effort estimé pour Critique + Élevée : N jours

→ Lis SECURITY_AUDIT_REPORT.md et valide pour passer à la Phase 2.
═══════════════════════════════════════════════
```

Et **attends explicitement la validation de Ramy** avant de continuer.

---

# PHASE 2 — Checklist exécutable

> Livrable : `SECURITY_FIX_CHECKLIST.md` à la racine. À ne produire qu'après validation Phase 1.

## Principe

Convertir les findings du rapport en **plan d'action ordonné**. Pas de rédaction philosophique, du concret.

## Structure

### 0. Avant tout

```markdown
## Pré-requis avant de démarrer les fixes

- [ ] Snapshot de la DB de production via Railway (point-in-time recovery activé)
- [ ] Vérifier que `main` est verte sur CI (si CI existe ; sinon noter "pas de CI")
- [ ] Communiquer à la beta : "Maintenance prévue le [date]" — uniquement si downtime attendu
- [ ] Branche dédiée : `git checkout -b security/audit-2026-05`
```

### 1. Quick wins (XS / S — total < 1 jour)

Liste numérotée, ordre d'exécution recommandé. Format :

```markdown
- [ ] **#1 — [SEV-X.Y] Titre du finding**
  - Fichier(s) : `apps/api/src/routers/auth.ts:42`
  - Action : 1-2 phrases concrètes
  - Test : comment vérifier que c'est fixé
  - Effort : XS (~ 15 min)
  - Risque : aucun / faible / [détail]
```

### 2. Sprint sécurité (M / L — 2-4 jours)

Mêmes structures, mais regroupées par domaine cohérent (auth, AuthZ, crypto…) pour minimiser les context switches.

### 3. Long terme (XL — > 3 jours, à planifier séparément)

Liste avec note "à inclure dans le prochain cycle de dev".

### 4. À ne PAS faire maintenant

Findings dont le fix risque d'introduire plus de problèmes qu'il n'en règle. Justifier pourquoi attendre.

### 5. Fixes "infra" — à faire par Ramy hors code

```markdown
- [ ] Activer SSL forcé sur la DB Railway (Settings > Database > Require SSL)
- [ ] Tourner toutes les API keys exposées (Resend, Sentry, OpenAI…)
- [ ] Configurer alertes Sentry sur les 5xx + auth failures
- [ ] [...]
```

### 6. Plan de régression

Pour chaque fix qui touche du code utilisateur :
```markdown
- Fix #1 → Tester : login OTP, login Apple, refresh token, logout
- Fix #3 → Tester : création workout, modification, suppression, partage
- [...]
```

## Validation Phase 2

Une fois `SECURITY_FIX_CHECKLIST.md` produit, **arrête à nouveau**. Affiche :

```
═══════════════════════════════════════════════
PHASE 2 TERMINÉE — Checklist produite
═══════════════════════════════════════════════
Quick wins  : N items (~ X heures total)
Sprint      : N items (~ X jours total)
Long terme  : N items (à planifier)
Infra       : N items (action Ramy)

→ Valide la checklist avant que je commence les patches.
   Tu peux retirer / réordonner / commenter chaque item.
═══════════════════════════════════════════════
```

**Attente explicite de validation.**

---

# PHASE 3 — Patches

> Pas de livrable unique : une PR par fix (ou groupe cohérent).

## Règles

1. **Une PR = un fix** (ou groupe trivialement lié, ex: même finding sur 3 routes).
2. **Branche par PR** : `security/sev-1-1-otp-bruteforce` (slug du finding).
3. **Commit message** :
   ```
   fix(security): [SEV-X.Y] Titre court

   Référence : SECURITY_AUDIT_REPORT.md#sev-x-y

   Avant : [comportement vulnérable]
   Après : [comportement corrigé]

   Tests : [liste des tests ajoutés / scénarios couverts]
   ```
4. **Tests obligatoires** pour chaque fix de sévérité ≥ Modérée. Format Vitest, dans `apps/api/src/routers/*.test.ts` ou équivalent mobile.
5. **Pas de réécriture opportuniste**. Tu fixes uniquement la faille. Si tu vois du code à refactorer, tu l'ajoutes en commentaire `// TODO(security-audit-2026-05)` mais tu ne le touches pas dans ce PR.

## Ordre d'exécution

Suis strictement l'ordre validé en Phase 2. Pour chaque item :

1. `git checkout -b security/sev-X-Y-slug`
2. Implémente le fix
3. Ajoute les tests
4. Run `npm run typecheck && npm run lint && npm test` localement
5. Commit avec le format ci-dessus
6. Push, ouvre la PR
7. **Stop. Attends merge ou commentaires de Ramy.**
8. Passe au suivant.

## Format de présentation par PR

Avant de pousser, affiche :

```
═══════════════════════════════════════════════
PR PRÊTE — security/sev-X-Y-slug
═══════════════════════════════════════════════
Finding   : [SEV-X.Y] Titre
Fichiers  : N modifiés, M ajoutés
Tests     : K ajoutés, tous verts en local
Régression: [zone à retester par Ramy]
Effort    : X (estimé) → Y (réel)

Diff résumé :
  + apps/api/src/routers/auth.ts (3 lignes ajoutées)
  + apps/api/src/middleware/rateLimit.ts (nouveau fichier)
  + apps/api/src/routers/auth.test.ts (1 test ajouté)

→ Push + PR ouverte sur GitHub : [URL si possible]
   Tu peux merger directement ou commenter.
═══════════════════════════════════════════════
```

## Cas particuliers Phase 3

### Fix qui exige une migration DB
- Migration en deux phases : déploiement compatible avec ancienne+nouvelle structure, puis cleanup
- Ne JAMAIS dropper une colonne dans le même PR que celui qui arrête de l'écrire
- Documenter rollback dans le commit message

### Fix qui exige rotation de secret
- **N'exécute pas la rotation toi-même**. Marque comme "Action Ramy" dans la checklist.
- Le code peut être prêt pour la rotation (lecture de l'ancienne ET nouvelle clé), mais l'opération de rotation est manuelle.

### Fix qui invalide les sessions actives
- Mentionne explicitement : "Tous les utilisateurs seront déconnectés après ce déploiement."
- Demander à Ramy s'il préfère une migration douce (rolling) ou un cut net.

---

# Calibration finale — Comment réussir cet audit

## Le bon état d'esprit

Tu n'es pas un scanner de vulnérabilités. Tu es un dev senior qui aurait passé une journée à lire le code de Ramy avec en tête : *"qu'est-ce qui pourrait foirer concrètement quand on aura 5 000 utilisateurs et qu'on apparaîtra sur Reddit ?"*

Tu écris pour un dev solo qui n'a ni le temps ni l'envie de lire un rapport de pentest de 80 pages. Chaque finding doit être **actionnable en moins de 30 secondes de lecture**. Chaque sévérité doit être **défendable en argumentaire** si Ramy demande "pourquoi Critique et pas Élevée ?".

## Les 3 pièges classiques à éviter

1. **L'inflation de findings** — "j'ai écrit 47 findings pour avoir l'air sérieux". Non. Si tu as 12 findings réels, tu écris 12. Pas 47 dilués.
2. **L'inflation de sévérité** — "Critique" partout pour faire peur. Non. Une vraie Critique est rare. Si tu en as plus de 3, ré-évalue.
3. **Les recommandations gratuites** — "ajoutez WAF, SOC, ISO 27001". Non. Tanren est une beta solo. Recommande ce qui rentre dans les 2 prochaines semaines.

## Le test de qualité

Avant de soumettre la Phase 1, relis le rapport et demande-toi :

- Si je donne ce rapport à Ramy lundi matin, est-ce qu'il sait exactement quoi faire mardi matin ? **Si non, réécris.**
- Est-ce que chaque finding a un POC ou une démonstration concrète ? **Si non, c'est probablement du theater de sécurité.**
- Est-ce que je pourrais défendre chaque sévérité face à un CTO sceptique ? **Si non, baisse-la.**

---

## Lancement de l'audit

Quand tu es prêt à démarrer, affiche :

```
═══════════════════════════════════════════════
AUDIT SÉCURITÉ TANREN — DÉMARRAGE PHASE 1
═══════════════════════════════════════════════
Scope : Mobile + API + DB + observable infra
Mode  : Lecture statique, sans toucher au code
Output: SECURITY_AUDIT_REPORT.md

Plan d'audit (12 domaines) :
  A. Auth & Sessions
  B. AuthZ & contrôle d'accès
  C. Cryptographie
  D. Validation d'input & injection
  E. Exposition de données (PII)
  F. Mobile (Expo/RN)
  G. Configuration & secrets
  H. Rate limiting & DoS
  I. Base de données
  J. Dépendances
  K. Logging & observabilité
  L. Site web (limité)

Démarrage par : Domaine A (Auth & Sessions)
═══════════════════════════════════════════════
```

Puis commence à lire le code, méthodiquement, en suivant les domaines dans l'ordre.

**Tu ne sors de Phase 1 qu'avec un rapport complet, Ramy peut t'arrêter en cours s'il voit que ça part en biais — c'est normal.**

---

*Tanren — Forge ta sécurité aussi soigneusement que tes séances. Une faille après l'autre.*
*鍛 錬*
