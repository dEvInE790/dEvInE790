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

## 1. Fill in your details

Open `data.js` and replace everything marked `TODO` in `CONFIG`:

- `email`: your email address (used for the "Email me" button).
- `whatsapp`: your number, **digits only** with country code, e.g. `2348012345678`.
- `socials`: paste full links. Leave any as `""` and its button is hidden.

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
4. Redeploy. For a new version, overwrite the file with the same name.

Cloudflare Pages has a **25 MB limit per file**. If your APK is bigger, upload
it somewhere else (a GitHub Release, Cloudflare R2, Google Drive direct link)
and paste that full URL into `apkUrl` instead.

## 4. Deploy to Cloudflare Pages

**Option A, drag and drop (fastest):**
Cloudflare dashboard → Workers & Pages → Create → Pages → *Upload assets* →
drag in the `divinebuilds` folder → Deploy.

**Option B, from GitHub (redeploys on every push):**
Cloudflare dashboard → Workers & Pages → Create → Pages → *Connect to Git* →
pick this repo, then:

- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: **`divinebuilds`**

After it's live, you can add your own domain under the project's
*Custom domains* tab.

### Social preview image

`index.html` points `og:image` at `img/og-image.png`. WhatsApp and most
socials need a **full URL** there, so once you have your domain, change it to
e.g. `https://divinebuilds.com/img/og-image.png`.
