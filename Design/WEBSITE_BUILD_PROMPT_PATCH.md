# PATCH — WEBSITE_BUILD_PROMPT.md · Update Resend API

> **À appliquer SUR le `WEBSITE_BUILD_PROMPT.md` original.** Ces modifications reflètent les changements de l'API Resend en novembre 2025 : les Contacts sont maintenant globaux (pas besoin d'`audienceId`) et les Contact Properties remplacent le hack `firstName` du prompt original.
>
> **Pour Claude Code** : applique ces overrides quand tu rencontres les sections concernées du prompt principal.

---

## Override 1 — Variables d'environnement (section 2.6)

**Retire** la variable suivante de `.env.example` et `.env.local` :
```
RESEND_AUDIENCE_ID=...
```

**Le `.env.example` final ressemble à** :
```bash
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Tanren <noreply@send.tanren.fr>
RESEND_REPLY_TO=support@tanren.fr

# Site
PUBLIC_SITE_URL=https://tanren.fr
```

---

## Override 2 — Wrapper Resend (section 7.2)

**Remplace** le contenu de `src/lib/resend.ts` par :

```ts
import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error('RESEND_API_KEY is required');
}

export const resend = new Resend(apiKey);

export const RESEND_FROM = import.meta.env.RESEND_FROM_EMAIL ?? 'Tanren <noreply@send.tanren.fr>';
export const RESEND_REPLY_TO = import.meta.env.RESEND_REPLY_TO ?? 'support@tanren.fr';
```

(la constante `RESEND_AUDIENCE_ID` est retirée — plus nécessaire)

---

## Override 3 — Endpoint waitlist (section 7.3)

**Remplace** le `POST` handler de `src/pages/api/waitlist.ts` par cette version qui utilise les Contact Properties :

```ts
import type { APIRoute } from 'astro';
import { waitlistSchema } from '../../lib/validators';
import { resend, RESEND_FROM, RESEND_REPLY_TO } from '../../lib/resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { email, platform, level, frequency } = parsed.data;

    // 1. Add to Resend Contacts (global, no audienceId needed since v2025-11)
    //    Properties must exist in dashboard: platform, level, frequency (all string type)
    const contactResult = await resend.contacts.create({
      email,
      unsubscribed: false,
      properties: {
        platform,
        level,
        frequency,
      },
    });

    if (contactResult.error) {
      // Resend returns 'already_exists' as an error — treat as success (idempotent)
      const errorMsg = contactResult.error.message?.toLowerCase() ?? '';
      const isDuplicate = errorMsg.includes('already') || errorMsg.includes('exists');

      if (!isDuplicate) {
        console.error('[waitlist] Resend contact error:', contactResult.error);
        return new Response(JSON.stringify({
          ok: false,
          error: 'Impossible de t\'inscrire. Réessaie dans un instant.',
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      // If duplicate, update properties (in case the user changed their level/frequency)
      try {
        await resend.contacts.update({
          email,
          properties: { platform, level, frequency },
        });
      } catch (updateErr) {
        // Non-critical, log and continue
        console.warn('[waitlist] Could not update existing contact:', updateErr);
      }
    }

    // 2. Send confirmation email
    const emailResult = await resend.emails.send({
      from: RESEND_FROM,
      replyTo: RESEND_REPLY_TO,
      to: email,
      subject: 'Ta demande d\'accès Tanren · 鍛錬',
      html: confirmationEmailHtml({ email, level }),
    });

    if (emailResult.error) {
      // Log but don't fail — the contact is in the audience, that's what matters
      console.error('[waitlist] Resend email error:', emailResult.error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[waitlist] Unexpected error:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: 'Erreur serveur. Réessaie dans un instant.',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

function confirmationEmailHtml({ email, level }: { email: string; level: string }): string {
  // ... (le HTML reste identique au prompt original, ne pas changer)
  // copier le contenu du prompt principal section 7.3 fonction confirmationEmailHtml
}
```

**Note importante sur le SDK** :
- La méthode `resend.contacts.create({ email, properties })` est disponible depuis le SDK Node `resend@4.0.0+`
- La méthode `resend.contacts.update({ email, properties })` permet de mettre à jour un contact existant par email (sans avoir besoin de son `id`)
- Si le SDK `resend` actuel n'expose pas encore `properties` dans son typing TypeScript, faire un appel direct via `fetch` au endpoint REST :
  ```ts
  await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      unsubscribed: false,
      properties: { platform, level, frequency },
    }),
  });
  ```

---

## Override 4 — Setup pré-déploiement (section 10.2)

**Modifie** la liste des Environment Variables Vercel : retire `RESEND_AUDIENCE_ID`.

Liste finale des env vars Vercel :

| Variable | Valeur |
|----------|--------|
| `RESEND_API_KEY` | (depuis Resend dashboard → API Keys) |
| `RESEND_FROM_EMAIL` | `Tanren <noreply@send.tanren.fr>` |
| `RESEND_REPLY_TO` | `support@tanren.fr` |
| `PUBLIC_SITE_URL` | `https://tanren.fr` |

---

## Override 5 — Setup manuel des Contact Properties

**Avant de tester l'endpoint en local ou prod**, l'utilisateur doit créer 3 Contact Properties dans le dashboard Resend :

1. Aller sur [resend.com](https://resend.com) → **Audience** → onglet **Properties**
2. Cliquer **Create property** (ou bouton équivalent) 3 fois pour créer :
   - Key : `platform`, Type : `string`
   - Key : `level`, Type : `string`
   - Key : `frequency`, Type : `string`
3. Sauvegarder

**Sans ces properties créées au préalable, le `contacts.create` avec `properties: {...}` échouera** (Resend rejette les properties non déclarées).

**Alternative via API** (si l'utilisateur préfère scripter) :
```bash
for prop in platform level frequency; do
  curl -X POST 'https://api.resend.com/contact-properties' \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"key\": \"$prop\", \"type\": \"string\"}"
done
```

---

## Override 6 — Annexe Resend Audiences (à la fin du prompt)

**Remplace** la note "Sur Resend Audiences" par :

> ### Sur Resend Contacts & Properties
>
> Depuis novembre 2025, Resend a unifié son système :
> - Les Contacts sont des entités globales (pas liés à un `audienceId`)
> - Les Contact Properties permettent de stocker des champs custom proprement (plus besoin du hack `firstName` prefix)
> - Les Topics et Segments servent à organiser les contacts pour les Broadcasts (envois marketing groupés)
>
> Pour la V1 du site Tanren, on stocke les inscriptions waitlist directement dans Contacts avec 3 properties (platform, level, frequency). Pour prioriser les invitations beta, l'utilisateur peut :
> 1. Aller dans Resend → Audience → Contacts
> 2. Filtrer par property (ex : `level=avance` pour inviter les avancés en premier)
> 3. Sélectionner manuellement et envoyer un Broadcast d'invitation
>
> Si la waitlist dépasse plusieurs centaines d'inscrits et que tu veux faire de l'analyse fine ou de l'automation conditionnelle, considère passer à un vrai stockage applicatif (Postgres sur Railway, ou Supabase) avec un workflow d'invitation custom.

---

*Patch dated 2026-04-26. Reflects Resend's "New Contacts Experience" launched November 2025.*
