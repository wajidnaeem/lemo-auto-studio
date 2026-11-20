# Connect YouTube, Facebook and Instagram (direct, no Zapier)

Your keys go into **GitHub Secrets** of this private repo: Settings → Secrets and variables → Actions → **New repository secret**.
Nobody can read a secret after it is saved (not you, not Claude); only the `post-film` Action uses it.
Safety: keep the repo private, no collaborators, two-factor login on GitHub. You can cancel any key at any time (see the end).

You will save 6 secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`, `META_PAGE_ID`, `META_PAGE_TOKEN`, `IG_USER_ID`.

---

## Part A: YouTube (about 20 minutes)

1. Go to **console.cloud.google.com** and sign in with the Google account that owns your YouTube channel.
2. Top bar → project menu → **New project** → name `lemo-auto-studio` → Create. Make sure it is selected.
3. Menu → **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
4. **APIs & Services → OAuth consent screen** (or "Google Auth Platform"):
   - User type **External** → app name `Lemo Auto-Studio`, your email for support and developer contact → Save.
   - **Audience / Test users**: add your own Gmail.
   - **Publish the app** ("Publishing status: In production" → Publish). This stops the key from expiring after 7 days.
     Google will say the app is unverified; that is fine for your own channel.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**, name `studio`.
   - **Authorized redirect URIs** → add exactly: `https://developers.google.com/oauthplayground`
   - Create → copy the **Client ID** and **Client secret**.
6. Get the refresh token:
   - Open **developers.google.com/oauthplayground**.
   - Click the gear ⚙ (top right) → tick **Use your own OAuth credentials** → paste Client ID and Client secret.
   - Left box "Input your own scopes": `https://www.googleapis.com/auth/youtube.upload` → **Authorize APIs**.
   - Sign in with your channel's account. On "Google hasn't verified this app" → **Advanced → Go to Lemo Auto-Studio (unsafe)**
     (it is your own app) → Allow. If you have several channels, pick the right one.
   - **Exchange authorization code for tokens** → copy the **Refresh token**.
7. In GitHub (this repo) → Settings → Secrets and variables → Actions → add:
   - `YT_CLIENT_ID` = Client ID
   - `YT_CLIENT_SECRET` = Client secret
   - `YT_REFRESH_TOKEN` = Refresh token

**Important YouTube rule:** videos uploaded through a new, un-audited Google project are set to **Private** by YouTube.
Until the audit is approved, open YouTube Studio and switch each video to Public (one click; the board reminds you).
To remove this: apply for the free **YouTube API Services audit** (search "YouTube API Services Audit and Quota Extension Form",
choose your project, say it uploads your own original cartoon films to your own channel). Approval usually takes a few weeks.

---

## Part B: Facebook Page + Instagram (about 25 minutes)

Before you start: you need a **Facebook Page**, and an **Instagram Professional account (Business or Creator)**
linked to that Page (Instagram app → Settings → Account type and tools → switch to Professional; then link the Page).

1. Go to **developers.facebook.com** → My Apps → **Create app** → use case **Other** → type **Business** →
   name `Lemo Auto-Studio` → Create.
2. In the app dashboard: **Add products** → add **Instagram** (Instagram API with Facebook Login) and **Facebook Login for Business**.
3. Open **Graph API Explorer** (developers.facebook.com/tools/explorer):
   - Meta App: `Lemo Auto-Studio`. User or Page: **Get User Access Token**.
   - Tick permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`,
     `instagram_basic`, `instagram_content_publish` → **Generate Access Token** → allow, choose your Page and Instagram account.
4. Make the token long-lived: click the **ⓘ** next to the token → **Open in Access Token Tool** → **Extend Access Token** → copy it.
5. Back in Graph API Explorer, paste the long-lived token in the token box and run `GET me/accounts`.
   In the answer, find your Page: copy its **id** (= `META_PAGE_ID`) and its **access_token** (= `META_PAGE_TOKEN`).
   A Page token made from a long-lived user token does not expire.
6. Run `GET <your page id>?fields=instagram_business_account` → copy the `id` inside `instagram_business_account` (= `IG_USER_ID`).
7. In GitHub → Settings → Secrets and variables → Actions → add `META_PAGE_ID`, `META_PAGE_TOKEN`, `IG_USER_ID`.
8. In the app dashboard, switch the app from **Development** to **Live** (top bar). Meta asks for a privacy policy URL;
   any page of yours with a short privacy note works. Your own Page and Instagram need no App Review, because you are the app's admin.

---

## Test it

Tell Claude "secrets added". Claude starts the `post-film` Action with a test film, set to **YouTube only, private**, first.
You can also run it yourself: repo → **Actions → post-film → Run workflow**.

## Cancel a key at any time
- YouTube: **myaccount.google.com → Security → Your connections to third-party apps** → Lemo Auto-Studio → remove.
- Facebook/Instagram: **Facebook Settings → Business integrations** → remove Lemo Auto-Studio.
- Then delete the secrets in GitHub. Nothing else holds a copy.
