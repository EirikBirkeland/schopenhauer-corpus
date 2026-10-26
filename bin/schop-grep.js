// Schopenhauer corpus search: find a quote across texts/ and report where it is.
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// usage: node bin/schop-grep.js "phrase with ... gaps" [-i]
// Reports: file name, the nearest preceding printed page marker if the file has {n} markers,
// and the matched line. Case-insensitive, whitespace-normalised. '...' in the query = any gap.
const fs = require("fs");
const path = require("path");
const FOLD_FS = process.env.SCHOP_FOLD_FS === "1" || process.argv.includes("-f");
let q = process.argv.slice(2).filter(a => a !== "-i" && a !== "-f").join(" ");
q = q.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));  // let \u00a7 work in a shell quote
if (!q) { console.log('usage: node bin/schop-grep.js "quote"'); process.exit(0); }
const rx = new RegExp(q.split(/\s*\.\.\.\s*/).map(s => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")).join("[\\s\\S]{0,400}?"), "gi");
function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p); else if (p.endsWith(".txt")) yield p;
  }
}
let hits = 0;
// Long s and sharp s folded, so a modern-spelling query still finds a Fraktur OCR text
// ("Wiſſenſchaft", "Straſse"). The fold keeps an index map, so the printed page markers
// and quotations reported back are the file's own characters, not the folded ones.
function fold(s) {
  let out = "", map = new Int32Array(s.length + 1), n = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]; let f = ch;
    if (ch === "\u017f") f = "s"; else if (ch === "\u00df") f = "ss"; else if (ch === "\u1e9e") f = "SS";
    else if (FOLD_FS && ch === "f") f = "s";
    for (let k = 0; k < f.length; k++) map[n++] = i;
    out += f;
  }
  map[n] = s.length;
  return { t: out, map };
}
const qf = q.replace(/\u017f/g, "s").replace(/\u00df/g, "ss");
const qff = FOLD_FS ? qf.replace(/f/g, "s") : qf;
const rxf = new RegExp(qff.split(/\s*\.\.\.\s*/).map(s => s.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")).join("[\\s\\S]{0,400}?"), "gi");
for (const f of walk(process.env.SCHOP_TEXTS || "texts")) {
  const t = fs.readFileSync(f, "utf8");
  const fo = (FOLD_FS || /[ſßẞ]/.test(t)) ? fold(t) : { t, map: null };
  const hay = fo.t;
  rxf.lastIndex = 0;
  let m;
  while ((m = rxf.exec(hay))) {
    hits++;
    const at = fo.map ? fo.map[m.index] : m.index;
    const endAt = fo.map ? Math.min(t.length, fo.map[m.index + m[0].length - 1] + 1) : m.index + m[0].length;
    // nearest printed page marker: wikisource [S. n], Beer's {n}, or the [p. n] recovered
    // from running heads; plus, in the Zeno files, the enclosing section name
    const before = t.slice(0, at);
    const ws = [...before.matchAll(/\[S\. (\d+)\]/g)].pop();
    const br = [...before.matchAll(/\{(\d{1,3})\}/g)].pop();
    const pn = [...before.matchAll(/\[p\. (\d{1,4})\]/g)].pop();
    // In the Zeno files the edition's page stands as a bare [462]. A footnote number is
    // bracketed too, but small; so only a 2-4 digit mark is reported, and it is reported
    // as a bracket, not as "S.", to keep the doubt visible.
    const zb = [...before.matchAll(/\[(\d{2,4})\]/g)].pop();
    const sec = [...before.matchAll(/\n\s*\u00a7\s?(\d{1,3})\s*[.:]?/g)].pop();
    const zen = [...before.matchAll(/\[\[SECTION ([^\]]+)\]\]/g)].pop();
    const pg = ws ? "S. " + ws[1] : (br ? "p. " + br[1] : (pn ? "p. " + pn[1] : (zb ? "[" + zb[1] + "]" : "")));
    const where = [pg, sec ? "\u00a7 " + sec[1] : "", zen ? "in " + zen[1].replace(/\+/g, " ").slice(0, 46) : ""].filter(Boolean).join(" ");
    const s = Math.max(0, at - 130), e = Math.min(t.length, endAt + 130);
    const line = t.slice(s, e).replace(/\s+/g, " ").trim();
    console.log(path.basename(f) + (where ? "  [" + where + "]" : "") + "\n    …" + (line.length > 340 ? line.slice(0, 340) + "…" : line));
    if (hits > 40) { console.log("(more hits suppressed)"); break; }
  }
}
console.log("total hits: " + hits);
