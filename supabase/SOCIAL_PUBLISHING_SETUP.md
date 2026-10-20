# Social publishing setup

News Cut publishing runs through Supabase Edge Functions. Provider tokens are encrypted with `SOCIAL_TOKEN_ENCRYPTION_KEY` and are never returned to the browser.

## Configure provider apps

Use the callback URL below in both the Meta and X developer consoles. It must match exactly:

```text
https://<your-supabase-project-ref>.supabase.co/functions/v1/social-oauth-callback
```

Set these Supabase secrets. Keep app secrets and encryption keys in Supabase; do not put them in `VITE_*` variables or commit them to the repository.

```sh
supabase secrets set \
  PUBLIC_APP_URL='https://<your-site-domain>' \
  SOCIAL_OAUTH_REDIRECT_URL='https://<your-supabase-project-ref>.supabase.co/functions/v1/social-oauth-callback' \
  SOCIAL_TOKEN_ENCRYPTION_KEY='<a-long-random-secret>' \
  META_APP_ID='<meta-app-id>' \
  META_APP_SECRET='<meta-app-secret>' \
  X_CLIENT_ID='<x-client-id>' \
  X_CLIENT_SECRET='<x-client-secret>'
```

The Meta app must be configured for Facebook Login and Instagram Graph API publishing. The Facebook account that connects must manage a Page; an Instagram account is included when it is a professional account connected to that Page. Meta may require app review and live mode before accounts outside the app's development roles can connect.

The X app must enable OAuth 2.0 user authentication with `tweet.read`, `tweet.write`, `users.read`, `media.write`, and `offline.access` scopes. X API access and usage may require a paid developer plan.

## Apply and deploy

```sh
supabase db push
supabase functions deploy social-oauth-start
supabase functions deploy social-oauth-callback --no-verify-jwt
supabase functions deploy social-account-admin
supabase functions deploy publish-news-cut
```

`social-news-cuts` storage is created by the migration and serves public image URLs required by Meta's publishing API. The server accepts the News Cut image, stores it there, and publishes its URL with the caption.

## WhatsApp Channels

The official WhatsApp Channels help documents channel updates in the WhatsApp app; the WhatsApp Business Platform API does not provide a public channel-posting endpoint. The News Cut workspace therefore downloads the image and copies its caption so an admin can publish the update manually from the GTN Channel.
