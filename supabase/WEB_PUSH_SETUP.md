# Browser push setup

Push alerts require HTTPS (localhost is fine for development), a one-time browser opt-in, and a VAPID key pair. Keep the private key in Supabase secrets only.

1. Generate a VAPID pair locally with `node scripts/generate-vapid-keys.mjs`. Copy the public key to the frontend environment as `VITE_WEB_PUSH_PUBLIC_KEY`. Do not commit or expose the private key.
2. Configure Supabase secrets:

   ```sh
   supabase secrets set WEB_PUSH_PUBLIC_KEY='the-public-key' WEB_PUSH_PRIVATE_KEY='the-private-key'
   ```

   `WEB_PUSH_SUBJECT` is optional; the function uses the project's `SUPABASE_URL` if it is unset.
3. Apply the migration and deploy both functions:

   ```sh
   supabase db push
   supabase functions deploy manage-push-subscription --no-verify-jwt
   supabase functions deploy send-push-notifications
   ```

4. In Vercel, add `VITE_WEB_PUSH_PUBLIC_KEY` to the Production environment (and Preview if needed), then redeploy. Vite embeds this public key during the build, so changing the variable does not update an existing deployment.

On supported browsers, GTN requests notification permission after the visitor's first click or keyboard interaction. If accepted, the device subscription is saved automatically. Visitors can later manage notification permission in their browser settings. On iPhone or iPad, install GTN from Safari using Share → Add to Home Screen, then open the Home Screen app before granting push permission; iOS does not enable web push for an ordinary browser tab.
