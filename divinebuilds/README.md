# Divinebuilds — portfolio & app store

Plain HTML, CSS and JavaScript. No framework, no build step. Open
`index.html` in a browser to preview it.

```
index.html        The page (nav, hero, apps, websites, about, contact, footer)
data.js           ← EDIT THIS: contact details, apps and websites
css/styles.css    All styling (colors are at the top under :root)
js/main.js        Builds the cards from data.js + small effects
img/              Favicon, social preview image, app icons, site screenshots
downloads/        Put your .apk files here
```

All links in the site are relative, so it works on any address, including
the free `.pages.dev` one.

## 1. Your contact details

They live in the `CONFIG` object at the top of `data.js`:

- `email`: used for the Email button and shown as text.
- `whatsapp`: digits only with country code (`2348028139086`), used for the wa.me link.
- `phoneDisplay`: how the number is shown on the page (`+234 802 813 9086`).
- `youtube`: your channel link.
- `socials`: optional extra links (GitHub, X, ...). Any left as `""` are hidden.

## 2. Add a new app

In `data.js`, copy an object in the `APPS` array, paste it after the last
one (with a comma between them) and fill it in:

```js
{
  name: "My New App",
  description: "One short line about what it does.",
  tags: ["Expo", "Supabase"],
  icon: "img/apps/my-new-app.png",   // square image, or "" to show the first letter
  apkUrl: "downloads/my-new-app.apk",
  testflightUrl: "https://testflight.apple.com/join/XXXXXX",
  status: "beta"                      // "live", "beta" or "in-progress"
},
```

Any link left as `""` shows a disabled **Coming soon** button.

Websites work the same way in the `WEBSITES` array. Put a screenshot in
`img/sites/` (16:10 looks best) and set `image` to its path.

## 3. Replace an APK link

1. Build your APK (with Expo: `eas build -p android --profile preview`, which gives an `.apk`).
2. Copy the file into `downloads/`, e.g. `downloads/money-trail.apk`.
3. In `data.js`, set `apkUrl: "downloads/money-trail.apk"`.
4. Redeploy (see below). For a new version, overwrite the file with the same name.

Cloudflare Pages has a **25 MB limit per file**. If your APK is bigger, upload
it somewhere else (for example as a GitHub Release asset) and paste that full
URL into `apkUrl` instead.

## 4. Deploy to Cloudflare Pages (free)

You don't need a domain. Cloudflare gives every project a free address
like `divinebuilds.pages.dev`.

### Option A: connect GitHub (recommended, redeploys on every push)

1. Sign up or log in at <https://dash.cloudflare.com> (free plan is fine).
2. In the left menu, open **Workers & Pages**.
3. Click **Create** (or **Create application**), choose the **Pages** tab,
   then **Connect to Git**.
4. Authorise GitHub and pick this repository.
5. **Project name:** type `divinebuilds`. This becomes your address,
   `divinebuilds.pages.dev`. If it's taken, Cloudflare tells you; try
   `divinebuilds-apps` or similar.
6. **Production branch:** the branch you want live (usually `main`).
7. **Build settings:**
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`divinebuilds`**
8. Click **Save and Deploy**. It takes under a minute.

After that, every push to the production branch updates the site.

### Option B: upload the folder (no GitHub needed)

1. **Workers & Pages** → **Create** → **Pages** tab → **Upload assets**.
2. Enter the project name (e.g. `divinebuilds`) and click **Create project**.
3. Drag in the **contents** of the `divinebuilds` folder (or the folder itself) and click **Deploy site**.
4. To update later: open the project → **Create deployment** → upload again.

### Where to find your .pages.dev address

- Right after deploying, Cloudflare shows a **Visit site** link.
- Any time later: **Workers & Pages** → click your project. The address
  (`https://<project-name>.pages.dev`) is shown at the top of the project page.
- Each deployment also gets its own preview link
  (`https://<random>.<project-name>.pages.dev`). Share the short one without
  the random part; that always shows the latest version.

### Social preview image (optional)

`index.html` points `og:image` at `img/og-image.png`. Some apps (WhatsApp
included) only show the preview when it's a full address. Once you know your
`.pages.dev` address you can change it to e.g.
`https://divinebuilds.pages.dev/img/og-image.png`.
