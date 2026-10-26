// Fidelity audit: take every quotation in a tier-2 study and look for it in the tier-1 texts.
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// usage: node bin/schop-audit.js <secondary.txt> [min length]
// One line per quotation: MATCH + file (and the study's page) or "no match".
// NOTE: "no match" is not proof of misquotation - the study may quote an English translation,
// or a work whose German text is not in the corpus yet. Every line must be read, not just the %.
//
// PASS 35 CHANGED THE MATCHING, and it matters. The tool used to compare raw strings, so a study
// printed in Fraktur (long s, broken hyphenation) never matched a normalised primary text, and
// Gwinner's audits came out at a flat 0 per cent. Now both sides go through the same fold: long s
// to s, sharp s to ss, f to s (the scan prints f for the long s), hyphen-at-line-end removed,
// everything else down to letters, digits and spaces. A zero after folding is worth something; a
// zero before folding is a statement about typefaces. Use --unfolded for the old behaviour.
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const FOLD = args.indexOf("--unfolded") < 0;
const sec = args.find(a => !a.startsWith("--"));
const MIN = +(args.find(a => /^\d+$/.test(a)) || 70);

const fold = s => FOLD ? s
  .toLowerCase().replace(/ſ/g, "s").replace(/ß/g, "ss").replace(/f/g, "s")
  .replace(/[-–—]\s+/g, "").replace(/[^a-zäöü0-9 ]/g, " ").replace(/\s+/g, " ").trim()
  : s.replace(/\s+/g, " ");

let prim = [];
function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* walk(p); else if (p.endsWith(".txt")) yield p; } }
for (const f of walk(process.env.SCHOP_TEXTS || "texts")) {
  if (f.includes("/secondary/")) continue;
  const t = fs.readFileSync(f, "utf8");
  prim.push({ f: path.basename(f), t: fold(t) });
}

const raw = fs.readFileSync(sec, "utf8");
const pages = [...raw.matchAll(/\{(\d{1,3})\}|\[\[(?:p\. |S\. )?(\d{1,3})\]\]/g)];
const pageAt = idx => { let p = ""; for (const m of pages) { if (m.index < idx) p = m[1] || m[2]; else break; } return p; };
const flat = raw.replace(/[\u201c\u201d\u201e]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
const flatFolded = fold(raw);
const out = [];
const QRX = /"([^"]{40,})"/g;
for (const m of flat.matchAll(QRX)) {
  const core = m[1].replace(/\{?\[?\[?(?:p\. |S\. )?\d{1,3}\]?\}?/g, " ").replace(/\s+/g, " ").trim();
  if (core.length < MIN) continue;
  const cf = fold(" " + m[1] + " ");
  const frags = [];
  const a = Math.max(20, Math.min(95, cf.length - 20));
  frags.push(cf.slice(10, 10 + a));            // the opening, past the fold boundary
  if (cf.length > 90) frags.push(cf.slice(Math.floor(cf.length / 2) - 45, Math.floor(cf.length / 2) + 45));
  frags.push(cf.slice(-(a + 5)));              // the close
  let hit = null, which = "";
  for (const [i, fr] of frags.entries()) {
    if (fr.length < 30) continue;
    for (const p of prim) { if (p.t.indexOf(fr) >= 0) { hit = p.f; which = ["opening", "middle", "close"][i]; break; } }
    if (hit) break;
  }
  out.push({ page: pageAt(m.index), q: core.slice(0, 78), hit, which });
}
let ok = 0;
out.forEach((r, i) => {
  if (r.hit) ok++;
  console.log(String(i + 1).padStart(2) + ". " + (r.hit ? "MATCH " + r.hit + " (" + r.which + ")" : "no match              ") +
    (r.page ? "  [study p." + r.page + "]" : "             ") + "  | " + r.q);
});
console.log("---");
console.log("quotations tested: " + out.length + ", found in tier 1: " + ok +
  (out.length ? ", " + Math.round(100 * ok / out.length) + "%" : "") + (FOLD ? "" : "  (UNFOLDED, old behaviour)"));
