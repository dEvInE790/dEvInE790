import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { seedCategories } from "./seed-catalogue";
import { seedProjects } from "./seed-projects";
import { seedTestimonials } from "./seed-testimonials";

/**
 * Cloudflare D1 access. The schema is created — and filled with the site's
 * original content — automatically the first time the database is used, so
 * no manual migration step is needed after deploying.
 */

const SCHEMA_VERSION = "1";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    singular TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    intro TEXT NOT NULL DEFAULT '',
    cover_src TEXT NOT NULL DEFAULT '',
    cover_alt TEXT NOT NULL DEFAULT '',
    customisation TEXT NOT NULL DEFAULT '[]',
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    features TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    UNIQUE (category_id, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seed_key TEXT UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_src TEXT NOT NULL,
    image_alt TEXT NOT NULL DEFAULT '',
    video_src TEXT,
    size TEXT NOT NULL DEFAULT 'regular',
    focus TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT NOT NULL,
    name TEXT NOT NULL,
    detail TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, sort)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts (ip, ts)`,
];

export type Env = CloudflareEnv;

/** Cloudflare bindings, or null when running somewhere without them (e.g. plain `next start`). */
export async function getEnv(): Promise<Env | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env && (env as Env).DB ? (env as Env) : null;
  } catch {
    return null;
  }
}

let ready: Promise<void> | null = null;

async function migrate(db: D1Database) {
  const version = await db
    .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
    .first<{ value: string }>()
    .catch(() => null);
  if (version?.value === SCHEMA_VERSION) return;

  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));

  // Claim the one-time seeding job; only one instance wins if several start at once.
  const claim = await db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('seeded', ?)").bind(String(Date.now())).run();
  if (claim.meta.changes === 1) await seed(db);

  await db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").bind(SCHEMA_VERSION).run();
}

async function seed(db: D1Database) {
  for (const [ci, c] of seedCategories.entries()) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO categories (slug, name, singular, tagline, intro, cover_src, cover_alt, customisation, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(c.slug, c.name, c.singular, c.tagline, c.intro, c.cover.src, c.cover.alt, JSON.stringify(c.customisation), ci)
      .run();
    const row = await db.prepare("SELECT id FROM categories WHERE slug = ?").bind(c.slug).first<{ id: number }>();
    if (!row) continue;
    await db.batch(
      c.products.map((p, pi) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO products (category_id, slug, name, summary, description, features, images, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(row.id, p.slug, p.name, p.summary, p.description, JSON.stringify(p.features), JSON.stringify(p.images), pi)
      )
    );
  }
  if (seedProjects.length) {
    await db.batch(
      seedProjects.map((p, i) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO projects (seed_key, title, category, description, image_src, image_alt, video_src, size, focus, sort)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(p.id, p.title, p.category, p.description, p.image.src, p.image.alt, p.video ?? null, p.size, p.focus ?? null, i)
      )
    );
  }
  if (seedTestimonials.length) {
    await db.batch(
      seedTestimonials.map((t, i) =>
        db.prepare("INSERT INTO testimonials (quote, name, detail, sort) VALUES (?, ?, ?, ?)").bind(t.quote, t.name, t.detail ?? null, i)
      )
    );
  }
}

/** The ready-to-use database, or null when no D1 binding is available. */
export async function getDb(): Promise<D1Database | null> {
  const env = await getEnv();
  if (!env) return null;
  if (!ready) {
    ready = migrate(env.DB).catch((err) => {
      ready = null; // retry on the next request
      throw err;
    });
  }
  await ready;
  return env.DB;
}

/** Like getDb, but throws a clear error — for admin operations that cannot work without a database. */
export async function requireDb(): Promise<D1Database> {
  const db = await getDb();
  if (!db) throw new Error("The content database is not available. Deploy to Cloudflare (or run `npm run preview`) to use the admin area.");
  return db;
}
