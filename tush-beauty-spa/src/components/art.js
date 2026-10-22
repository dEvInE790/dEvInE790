/**
 * Line-art panels used wherever a photo has not been supplied yet.
 * They are deliberately illustrations, not imitation photography, so nothing on
 * the site pretends to show the spa's interior or a client's result.
 *
 * Each panel is written to /assets/art/<motif>-<tone>.svg at build time.
 */

const TONES = {
  ivory: { bg1: '#f6f0e6', bg2: '#ece3d4', line: '#a88b5f', soft: '#dccfb9' },
  sand:  { bg1: '#ebe1d2', bg2: '#ddd0bc', line: '#8f7656', soft: '#cdbda4' },
  taupe: { bg1: '#cfc0ab', bg2: '#bba98f', line: '#6e5b45', soft: '#ab9878' },
};

const MOTIFS = {
  // Architectural arch with a low moon — calm, spatial.
  arch: (c) => `
    <path d="M250 820V470a150 150 0 0 1 300 0v350" stroke="${c.line}" stroke-width="1.6" fill="none"/>
    <path d="M280 820V475a120 120 0 0 1 240 0v345" stroke="${c.line}" stroke-width="0.9" fill="none" opacity=".6"/>
    <circle cx="400" cy="560" r="46" fill="${c.soft}" opacity=".7"/>
    <path d="M160 820h480" stroke="${c.line}" stroke-width="1.2"/>
    <path d="M200 846h400" stroke="${c.line}" stroke-width=".7" opacity=".5"/>`,

  // Eucalyptus sprig.
  sprig: (c) => {
    const leaves = [];
    const pts = [[402, 300, -28], [372, 360, 30], [418, 420, -24], [378, 480, 34], [424, 545, -20], [384, 610, 36], [430, 675, -18]];
    pts.forEach(([x, y, r], i) => {
      const rx = 34 - i * 1.5, ry = 24 - i;
      leaves.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" stroke="${c.line}" stroke-width="1.3" fill="${c.soft}" fill-opacity=".35"/>`);
    });
    return `
    <path d="M398 250c-6 120 26 230 6 360-8 52-2 120 18 190" stroke="${c.line}" stroke-width="1.5" fill="none"/>
    ${leaves.join('\n    ')}`;
  },

  // Balanced stones.
  stones: (c) => `
    <path d="M300 780c0-40 45-62 100-62s100 22 100 62-45 46-100 46-100-6-100-46z" stroke="${c.line}" stroke-width="1.5" fill="${c.soft}" fill-opacity=".4"/>
    <path d="M325 682c0-34 34-52 78-52s76 18 76 52-34 38-77 38-77-4-77-38z" stroke="${c.line}" stroke-width="1.4" fill="none"/>
    <path d="M350 598c0-28 24-42 54-42s52 14 52 42-24 30-53 30-53-2-53-30z" stroke="${c.line}" stroke-width="1.3" fill="${c.soft}" fill-opacity=".3"/>
    <path d="M374 528c0-20 13-30 30-30s29 10 29 30-14 22-30 22-29-2-29-22z" stroke="${c.line}" stroke-width="1.2" fill="none"/>
    <path d="M180 830h440" stroke="${c.line}" stroke-width="1"/>`,

  // Vessel with a single stem.
  vessel: (c) => `
    <path d="M352 520c-8 0-12 10-6 18 30 40-40 80-40 170 0 72 44 112 94 112s94-40 94-112c0-90-70-130-40-170 6-8 2-18-6-18z" stroke="${c.line}" stroke-width="1.5" fill="${c.soft}" fill-opacity=".35"/>
    <path d="M400 520c-4-90 18-170 66-240" stroke="${c.line}" stroke-width="1.3" fill="none"/>
    <ellipse cx="470" cy="300" rx="30" ry="13" transform="rotate(-50 470 300)" stroke="${c.line}" stroke-width="1.2" fill="none"/>
    <ellipse cx="440" cy="370" rx="26" ry="11" transform="rotate(35 440 370)" stroke="${c.line}" stroke-width="1.2" fill="none"/>
    <path d="M220 820h360" stroke="${c.line}" stroke-width="1"/>`,

  // Low sun over still water.
  sun: (c) => `
    <circle cx="400" cy="470" r="150" fill="${c.soft}" opacity=".55"/>
    <circle cx="400" cy="470" r="150" stroke="${c.line}" stroke-width="1.4" fill="none"/>
    <path d="M140 560h520" stroke="${c.line}" stroke-width="1.3"/>
    <path d="M220 600h360M280 636h240M340 668h120" stroke="${c.line}" stroke-width=".9" opacity=".6"/>`,
};

function artSvg(motif, tone = 'ivory') {
  const c = TONES[tone] || TONES.ivory;
  const draw = MOTIFS[motif] || MOTIFS.arch;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${c.bg1}"/>
      <stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 .07 0"/>
    </filter>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <rect width="800" height="1000" filter="url(#n)"/>
  <g stroke-linecap="round" stroke-linejoin="round">${draw(c)}
  </g>
</svg>
`;
}

module.exports = { artSvg, MOTIFS: Object.keys(MOTIFS), TONES: Object.keys(TONES) };
