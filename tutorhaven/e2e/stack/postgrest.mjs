// Test-only: translates the subset of PostgREST requests that supabase-js sends
// (as used by the web and iOS apps) into SQL against a real Postgres, executed
// as the caller's role, so Row Level Security and grants apply exactly as on Supabase.
const IDENT = /^[a-z_][a-z0-9_]*$/
const ident = (s) => {
  if (!IDENT.test(s)) throw httpError(400, `Invalid identifier "${s}"`)
  return `"${s}"`
}
export const httpError = (status, message, code = 'PGRST100') => Object.assign(new Error(message), { status, body: { message, code, details: null, hint: null } })

/** Splits on commas that are not inside parentheses or quotes. */
function splitTop(s) {
  const out = []
  let depth = 0, cur = '', quoted = false
  for (const ch of s) {
    if (ch === '"') quoted = !quoted
    if (!quoted && ch === '(') depth++
    if (!quoted && ch === ')') depth--
    if (!quoted && depth === 0 && ch === ',') { out.push(cur); cur = '' } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

export function parseSelect(s) {
  return splitTop(s || '*').map((item) => {
    const paren = item.indexOf('(')
    if (paren === -1) {
      if (item === '*') return { type: 'star' }
      const [a, b] = item.split('::')[0].split(':')
      return b ? { type: 'col', alias: a, name: b } : { type: 'col', alias: a, name: a }
    }
    const head = item.slice(0, paren)
    const inner = item.slice(paren + 1, -1)
    const [aliasPart, rest] = head.includes(':') ? head.split(':') : [null, head]
    const [table, hint] = rest.split('!')
    return { type: 'embed', alias: aliasPart || table, table, hint: hint || null, children: parseSelect(inner) }
  })
}

let schemaCache = null
export async function loadSchema(pool) {
  if (schemaCache) return schemaCache
  const fks = (await pool.query(`
    select c.conname, c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent,
      array(select a.attname::text from unnest(c.conkey) with ordinality k(n, i) join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.n order by k.i) as child_cols,
      array(select a.attname::text from unnest(c.confkey) with ordinality k(n, i) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.n order by k.i) as parent_cols
    from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`)).rows
  const uniques = new Set((await pool.query(`
    select c.conrelid::regclass::text || '.' || a.attname as k
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype in ('u', 'p') and array_length(c.conkey, 1) = 1 and c.connamespace = 'public'::regnamespace`)).rows.map((r) => r.k))
  const strip = (t) => t.replace(/^public\./, '')
  schemaCache = { fks: fks.map((f) => ({ ...f, child: strip(f.child), parent: strip(f.parent) })), uniques: new Set([...uniques].map(strip)) }
  return schemaCache
}

function objectExpr(nodes, table, alias, schema, ctx) {
  const parts = []
  let star = false
  for (const n of nodes) {
    if (n.type === 'star') star = true
    else if (n.type === 'col') parts.push(`'${n.alias}', ${alias}.${ident(n.name)}`)
    else parts.push(`'${n.alias}', ${embedExpr(n, table, alias, schema, ctx)}`)
  }
  const built = parts.length ? `jsonb_build_object(${parts.join(', ')})` : null
  if (star) return built ? `(to_jsonb(${alias}) || ${built})` : `to_jsonb(${alias})`
  return built ?? `'{}'::jsonb`
}

function embedExpr(n, fromTable, fromAlias, schema, ctx) {
  const target = n.table
  ident(target)
  let candidates = schema.fks.filter((f) => (f.child === fromTable && f.parent === target) || (f.child === target && f.parent === fromTable))
  if (n.hint) candidates = candidates.filter((f) => f.conname === n.hint || f.child_cols.includes(n.hint))
  if (candidates.length !== 1) throw httpError(400, `Could not find a single relationship between ${fromTable} and ${target}`, 'PGRST200')
  const fk = candidates[0]
  const a = `t${++ctx.n}`
  const obj = objectExpr(n.children, target, a, schema, ctx)
  if (fk.child === fromTable) {
    const on = fk.child_cols.map((c, i) => `${a}.${ident(fk.parent_cols[i])} = ${fromAlias}.${ident(c)}`).join(' and ')
    return `(select ${obj} from public.${ident(target)} ${a} where ${on} limit 1)`
  }
  const on = fk.child_cols.map((c, i) => `${a}.${ident(c)} = ${fromAlias}.${ident(fk.parent_cols[i])}`).join(' and ')
  const oneToOne = fk.child_cols.length === 1 && schema.uniques.has(`${target}.${fk.child_cols[0]}`)
  if (oneToOne) return `(select ${obj} from public.${ident(target)} ${a} where ${on} limit 1)`
  return `coalesce((select jsonb_agg(${obj}) from public.${ident(target)} ${a} where ${on}), '[]'::jsonb)`
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'columns', 'on_conflict'])
const listOf = (v) => v.replace(/^[({]|[)}]$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''))

function condition(col, expr, alias, params) {
  const c = `${alias}.${ident(col)}`
  let negate = false
  if (expr.startsWith('not.')) { negate = true; expr = expr.slice(4) }
  const dot = expr.indexOf('.')
  const op = expr.slice(0, dot), val = expr.slice(dot + 1)
  const p = (v) => { params.push(v); return `$${params.length}` }
  let sql
  switch (op) {
    case 'eq': sql = `${c} = ${p(val)}`; break
    case 'neq': sql = `${c} <> ${p(val)}`; break
    case 'gt': sql = `${c} > ${p(val)}`; break
    case 'gte': sql = `${c} >= ${p(val)}`; break
    case 'lt': sql = `${c} < ${p(val)}`; break
    case 'lte': sql = `${c} <= ${p(val)}`; break
    case 'like': sql = `${c}::text like ${p(val.replace(/\*/g, '%'))}`; break
    case 'ilike': sql = `${c}::text ilike ${p(val.replace(/\*/g, '%'))}`; break
    case 'in': sql = `${c} = any(${p(listOf(val))})`; break
    case 'cs': sql = `${c} @> ${p(val)}`; break
    case 'cd': sql = `${c} <@ ${p(val)}`; break
    case 'ov': sql = `${c} && ${p(val)}`; break
    case 'is': sql = `${c} is ${({ null: 'null', true: 'true', false: 'false' })[val] ?? 'null'}`; break
    default: throw httpError(400, `Unsupported operator ${op}`)
  }
  return negate ? `not (${sql})` : sql
}

function whereClause(searchParams, alias, params) {
  const conds = []
  for (const [k, v] of searchParams.entries()) {
    if (RESERVED.has(k)) continue
    conds.push(condition(k, v, alias, params))
  }
  const or = searchParams.get('or')
  if (or) {
    const parts = splitTop(or.replace(/^\(|\)$/g, '')).map((part) => {
      const dot = part.indexOf('.')
      return condition(part.slice(0, dot), part.slice(dot + 1), alias, params)
    })
    conds.push(`(${parts.join(' or ')})`)
  }
  return conds.length ? `where ${conds.join(' and ')}` : ''
}

function orderClause(spec, alias) {
  if (!spec) return ''
  return 'order by ' + spec.split(',').map((s) => {
    const [col, ...mods] = s.split('.')
    return `${alias}.${ident(col)} ${mods.includes('desc') ? 'desc' : 'asc'}${mods.includes('nullsfirst') ? ' nulls first' : mods.includes('nullslast') ? ' nulls last' : ''}`
  }).join(', ')
}

/** Runs one REST request. `exec(sql, params)` runs as the caller. Returns { status, body }. */
export async function handleRest({ method, table, searchParams, body, prefer, accept }, exec, pool) {
  ident(table)
  const schema = await loadSchema(pool)
  const params = []
  const ctx = { n: 0 }
  const nodes = parseSelect(searchParams.get('select'))
  const obj = objectExpr(nodes, table, 't0', schema, ctx)
  const where = whereClause(searchParams, 't0', params)
  let rows
  if (method === 'GET' || method === 'HEAD') {
    const limit = searchParams.get('limit') ? `limit ${Number(searchParams.get('limit'))}` : ''
    const offset = searchParams.get('offset') ? `offset ${Number(searchParams.get('offset'))}` : ''
    rows = (await exec(`select ${obj} as r from public.${ident(table)} t0 ${where} ${orderClause(searchParams.get('order'), 't0')} ${limit} ${offset}`, params)).map((r) => r.r)
  } else if (method === 'POST') {
    const list = Array.isArray(body) ? body : [body]
    const cols = [...new Set(list.flatMap((r) => Object.keys(r)))].map((c) => (ident(c), c))
    params.push(JSON.stringify(list))
    const upsert = (prefer.includes('resolution=merge-duplicates') || prefer.includes('resolution=ignore-duplicates'))
      ? ` on conflict ${searchParams.get('on_conflict') ? `(${searchParams.get('on_conflict').split(',').map(ident).join(', ')})` : ''} do ${prefer.includes('ignore') ? 'nothing' : 'update set ' + cols.map((c) => `${ident(c)} = excluded.${ident(c)}`).join(', ')}` : ''
    rows = (await exec(`with ins as (insert into public.${ident(table)} (${cols.map(ident).join(', ')})
      select ${cols.map(ident).join(', ')} from jsonb_populate_recordset(null::public.${ident(table)}, $${params.length}::jsonb)${upsert} returning *)
      select ${obj} as r from ins t0`, params)).map((r) => r.r)
  } else if (method === 'PATCH') {
    const cols = Object.keys(body ?? {})
    cols.forEach(ident)
    params.push(JSON.stringify(body))
    const n = params.length
    rows = (await exec(`with upd as (update public.${ident(table)} t0 set ${cols.map((c) => `${ident(c)} = (jsonb_populate_record(null::public.${ident(table)}, $${n}::jsonb)).${ident(c)}`).join(', ')} ${where} returning t0.*)
      select ${obj} as r from upd t0`, params)).map((r) => r.r)
  } else if (method === 'DELETE') {
    rows = (await exec(`with del as (delete from public.${ident(table)} t0 ${where} returning t0.*) select ${obj} as r from del t0`, params)).map((r) => r.r)
  } else {
    throw httpError(405, 'Method not allowed')
  }

  const wantsObject = (accept || '').includes('vnd.pgrst.object')
  if (wantsObject) {
    if (rows.length !== 1) throw httpError(406, 'JSON object requested, multiple (or no) rows returned', 'PGRST116')
    return { status: 200, body: rows[0] }
  }
  if (method !== 'GET' && !prefer.includes('return=representation')) return { status: method === 'POST' ? 201 : 204, body: null }
  return { status: method === 'POST' ? 201 : 200, body: rows }
}
