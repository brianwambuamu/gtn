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

4. Build and deploy the website with `VITE_WEB_PUSH_PUBLIC_KEY` set in its hosting environment. Rebuild after changing frontend environment variables.

The public header shows an Alerts button on supported browsers. Visitors choose to enable it themselves. They can turn it off with the same button or block it later in the browser's site notification settings. On iOS, visitors must add the site to their Home Screen before browser push is available.
