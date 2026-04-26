# Domain Migration — External Secrets Checklist

All code references migrated from `tanren.app` to `tanren.fr`. Items below require manual action in external services.

## Railway (API hosting)
- [ ] Update `FROM_EMAIL` to `Tanren <noreply@send.tanren.fr>`
- [ ] Add `REPLY_TO_EMAIL=support@tanren.fr`
- [ ] Update `ALLOWED_ORIGINS` if set (add `https://tanren.fr`)
- [ ] Add `api.tanren.fr` as custom domain (Settings > Networking > Custom Domains)
- [ ] Add CNAME `api → <railway-id>.up.railway.app` in Squarespace DNS
- [ ] Verify SSL cert provisioned (`curl -I https://api.tanren.fr/health`)
- [ ] Keep old Railway URL active until mobile app is rebuilt with new API URL

## Expo / EAS Secrets
- [ ] Update `EXPO_PUBLIC_API_URL` to `https://api.tanren.fr` (when Railway custom domain is ready)
- [ ] Rebuild Android: `eas build --platform android --profile preview`
- [ ] Submit new build to Play Store internal testing

## Google Cloud Console (OAuth)
- [ ] OAuth Client (Web): update Authorized JavaScript origins (add tanren.fr)
- [ ] OAuth Client (Web): update Authorized redirect URIs
- [ ] OAuth consent screen: update App home page to `https://tanren.fr`
- [ ] OAuth consent screen: update privacy/terms URLs
- [ ] OAuth consent screen: update Authorized domains (add tanren.fr)

## Apple Developer Console (before first iOS TestFlight build)
- [ ] Create App ID matching `ios.bundleIdentifier`
- [ ] Enable "Sign In with Apple" capability on App ID
- [ ] (Optional for mobile-only) Create Services ID `fr.tanren.signin`
- [ ] Configure Email Sources: add `send.tanren.fr`, merge SPF with Resend
- [ ] Test Apple Sign-in flow in local build before TestFlight

## Squarespace DNS
- [ ] CNAME `api` → `<railway-id>.up.railway.app`
- [ ] Verify Resend DNS records on `send.tanren.fr` are still valid

## Resend
- [ ] Confirm `send.tanren.fr` domain is verified in Resend dashboard
- [ ] Send test OTP email, confirm SPF/DKIM PASS in headers
- [ ] Verify reply-to (`support@tanren.fr`) reaches iCloud+ mailbox

## Play Store Console
- [ ] Update privacy policy URL in store listing to `https://tanren.fr/privacy`
- [ ] Update store listing description if it mentions `tanren.app`

Once all items checked, delete this file and tag: `git tag domain-migration-complete`.
