# GTN Live Events

The public `/live-events` page checks GTN's `@gusiitelevisionnetwork` YouTube channel for active live broadcasts. It lists only streams YouTube allows to be embedded. Selecting **Watch Live** opens the GTN player route and plays the YouTube stream inside the site. The events feed is cached for 15 minutes to keep YouTube API usage under control.

1. In Google Cloud Console, create an API key and enable **YouTube Data API v3** for the project. Restrict the key to that API.
2. Add the API key as a Supabase secret:

   ```sh
   supabase secrets set YOUTUBE_API_KEY='your-api-key'
   ```

3. Apply the cache migration and deploy the Edge Function:

   ```sh
   supabase db push
   supabase functions deploy youtube-live-events --no-verify-jwt
   ```

The function resolves the channel ID from GTN's existing YouTube handle, so no channel ID needs to be copied into the app. If no broadcast is active, the page displays **No live events right now**. Embedding depends on the stream's YouTube settings; streams that do not permit embedding are excluded so the Watch Live action can stay on the GTN site.
