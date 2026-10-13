# GTN News

React/Vite news site with Supabase for shared stories, staff authentication, ad management, and uploaded media.

## Connect a Supabase project

1. Create a Supabase project and copy its Project URL and publishable key into a local `.env` file using `.env.example` as a template. These two values are public client configuration; never put a secret/service role key in Vite environment variables.
2. Apply `supabase/migrations/202610130001_initial_backend.sql` in the Supabase SQL Editor (or deploy it with the Supabase CLI).
3. Create the first staff user from the Supabase Auth dashboard. Confirm its email, then promote it to super admin in SQL Editor:

   ```sql
   update public.staff_profiles
   set role = 'super_admin'
   where email = 'admin@example.com';
   ```

4. Configure an SMTP sender in Supabase Auth so invitations can be delivered. Add the deployed site URL to Auth URL Configuration's allowed redirect URLs.
5. Deploy the `invite-reporter` Edge Function (`supabase functions deploy invite-reporter`) and set `APP_URL` to the production site URL as a function secret. The function uses Supabase's injected service role secret server-side to invite accounts; it verifies the caller is a super admin before issuing invitations.
6. Deploy the Vite app with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` set in the hosting provider's build environment.

The reporter invitation email contains a secure password setup link. The app never emails or stores a reporter's plaintext password. The super admin role is granted in the database and cannot be self-assigned from the browser.

## Roles

- **Reporter:** sign in, publish stories, and edit or delete their own stories and editorial media.
- **Super admin:** all reporter actions, plus invite reporters and manage advertisements and ad media.
- **Public visitors:** read published stories and active advertisements; no sign-in is required.

Database Row Level Security enforces these permissions. Keep the Supabase service role key exclusively in Supabase's server-side function secrets.

## Content notes

The existing sample stories, category names, and YouTube channel/video list in `src/data` remain bundled demo/editorial presentation content. New stories and advertisements are stored centrally in Supabase. Uploaded story and ad media is stored in public Supabase Storage buckets; use a dedicated streaming/video provider for large or high-volume video delivery.

The app uses browser local storage only for the authenticated session token. Accounts, roles, stories, advertisements, and uploaded files are stored in Supabase.
