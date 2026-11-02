// Helpers for Paystack's Nigerian bank list (names vary slightly, so match loosely).

/** Shown first when nothing is typed, in this order. */
const POPULAR = [
  /^access bank$/i, /guaranty trust|^gtbank/i, /^zenith/i, /^first bank/i, /united bank for africa|^uba\b/i,
  /^fidelity/i, /first city monument|^fcmb/i, /^union bank/i, /stanbic/i, /^sterling/i, /^wema/i, /^ecobank/i,
  /^polaris/i, /^keystone/i, /^opay|\(opay\)/i, /moniepoint/i, /palmpay/i, /^kuda/i,
]

/** Nicknames people type, mapped to words in the official names. */
const ALIASES = {
  gtb: 'guaranty trust', gtbank: 'guaranty trust', gtco: 'guaranty trust', uba: 'united bank for africa',
  fcmb: 'first city monument', firstbank: 'first bank', fbn: 'first bank', stanbic: 'stanbic', ibtc: 'stanbic',
  monie: 'moniepoint', palm: 'palmpay', opay: 'opay', diamond: 'access', skye: 'polaris', eco: 'ecobank',
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Banks matching a search, best matches first; popular banks first when the search is empty. */
export function searchBanks(banks, query) {
  const q = norm(query || '')
  if (!q) {
    const popular = POPULAR.map((re) => banks.find((b) => re.test(b.name))).filter(Boolean)
    const seen = new Set(popular.map((b) => b.code))
    return { popular, rest: banks.filter((b) => !seen.has(b.code)) }
  }
  const target = ALIASES[q.replace(/ /g, '')] ?? q
  const words = target.split(' ')
  const scored = banks
    .map((b) => {
      const name = norm(b.name)
      if (!words.every((w) => name.includes(w))) return null
      const rank = name.startsWith(target) ? 0 : name.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2
      return { b, rank }
    })
    .filter(Boolean)
    .sort((x, y) => x.rank - y.rank || x.b.name.localeCompare(y.b.name))
  return { popular: [], rest: scored.map((x) => x.b) }
}
