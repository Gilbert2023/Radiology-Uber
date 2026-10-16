# Putting the Academy online, with accounts and the admin dashboard

This is a step-by-step guide for non-developers. It takes about 20–30 minutes and the free plans of both services are enough to start.

- **Supabase** stores learner accounts and progress. It also gives you a control panel where you can see all the raw data.
- **Vercel** hosts the website at a public web address.

You will copy two values from Supabase into Vercel. Nothing else needs code.

---

## Part A: Create the database (Supabase)

1. Go to **https://supabase.com**, click **Start your project** and sign in with GitHub.
2. Click **New project**.
   - **Name:** `mrso-academy`
   - **Database password:** click *Generate a password* and save it somewhere safe. You rarely need it.
   - **Region:** choose the one closest to your learners.
   - Click **Create new project** and wait about 2 minutes.
3. Set up the tables and security rules:
   - In the left menu click **SQL Editor**, then **New query**.
   - Open the file `apps/mrso-academy/supabase/schema.sql` from this repository on GitHub and click the **Copy raw file** button.
   - Paste it into the SQL editor and click **Run**. You should see *Success. No rows returned*.
4. Copy your two keys:
   - Go to **Project Settings** (gear icon), then **API** (it may be called **API Keys** / **Data API**).
   - Copy the **Project URL** (it looks like `https://abcdxyz.supabase.co`).
   - Copy the **anon public** key. Newer dashboards may call it the **publishable** key.
   - ⚠️ Never copy or share the **service_role** / **secret** key. It bypasses all security.

## Part B: Put the website online (Vercel)

1. Go to **https://vercel.com** and sign up with GitHub.
2. Click **Add New… → Project** and **Import** the `radiology-uber` repository. If you don't see it, click *Adjust GitHub App permissions* and allow it.
3. On the configure screen:
   - **Root Directory:** click *Edit* and choose `apps/mrso-academy`.
   - **Framework Preset:** Next.js (detected automatically).
   - Open **Environment Variables** and add:

     | Name | Value |
     |---|---|
     | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from A4 |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key from A4 |
4. Click **Deploy**. After 1–2 minutes you get a web address such as `https://mrso-academy.vercel.app`. That is your live site.

> Vercel publishes the repository's **main** branch. Merge the Academy pull request into `main` first. Alternatively, go to Vercel → Settings → Git → **Production Branch** and set it to the branch containing the Academy.

## Part C: Connect the two

In Supabase go to **Authentication → URL Configuration**:

- **Site URL:** your Vercel address, for example `https://mrso-academy.vercel.app`
- **Redirect URLs:** add `https://mrso-academy.vercel.app/**`

Without this, the links in confirmation and password-reset emails point to the wrong place.

**Emails (recommended before inviting many learners):** Supabase's built-in email sender can only send a small number of emails per hour and is meant for testing. For real use, go to **Authentication → Emails → SMTP Settings** and connect an email service such as Resend, Brevo or your organisation's mail server.

## Part D: Make yourself the administrator

1. Open your live site, click **Sign in → Create account**, and register with your own email. Then click the link in the confirmation email.
2. In Supabase open **SQL Editor → New query**, paste the line below (with your email), and click **Run**:
   ```sql
   update public.profiles set role = 'admin' where email = 'YOUR-EMAIL@example.com';
   ```
3. Refresh the website. A yellow **Admin** link appears at the top. You only do this once. After that you can make other people admins from the dashboard.

---

## Using the admin dashboard (`/admin`)

| Tab | What you can do |
|---|---|
| **Overview** | Total learners, active in the last 7 days, new sign-ups, average progress, completion records issued, average capstone score, sign-ups per week, recently active learners |
| **Learners** | Search and filter everyone. Click a learner to see their module progress, exam attempts, topic strengths and weaknesses, lab scores and recent activity |
| **Content analytics** | Which topics learners struggle with, the 10 most-missed questions, and how many learners finished each module |
| **Export CSV** | A spreadsheet of all learners and their results |

Actions on a learner:

- **Revoke / restore record:** cancels their course completion record. They see "revoked".
- **Disable / enable account:** they can still sign in, but nothing they do is saved.
- **Make admin / remove admin:** gives or removes access to this dashboard. You cannot remove your own admin rights or disable yourself.
- **Reset progress:** permanently erases their progress.

## Seeing the "background" data directly (Supabase control panel)

- **Authentication → Users:** every account with email, sign-up date and last sign-in. Here you can **delete** an account, **send a password reset**, or resend a confirmation email.
- **Table Editor → `profiles`:** name, email, role, disabled and revoked flags for each learner.
- **Table Editor → `progress`:** each learner's full saved progress (in the `state` column).
- **Database → Backups:** available on paid plans. On the free plan, use *Export CSV* regularly.

## Updating the site later

Any change merged into the `main` branch on GitHub is published automatically by Vercel within a couple of minutes.

## Good to know

- **Anyone can sign up for free.** To turn off new sign-ups, go to Supabase → **Authentication → Sign In / Providers** and disable *Allow new users to sign up*.
- People can still use the site as **guests** without an account. Their progress stays in their own browser only and doesn't appear in the admin dashboard. If they create an account later, their guest work is added to it.
- **Scores are calculated in the learner's browser.** A technically skilled user could fake their own results. Treat the dashboard as a learning tracker, not as proof of competence. Invigilated exams would need server-side marking.
- Keep learner numbers and email usage within the free-plan limits, or upgrade if you grow.
