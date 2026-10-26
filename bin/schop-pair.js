#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// bin/schop-pair.js - measure one translation against its original, span against span.
//
//   node bin/schop-pair.js <english-file> <german-file> <english-start-label> [options]
//
//     --en-end=STR     the heading that ends the English section (default: end of file)
//     --de-start=STR   a label inside the German file to start from (default: body start)
//     --de-end=STR     a label to stop at (default: end of file)
//     --probe=DE:EN    a German stem and the English word to look for; repeat it.
//
// Extents, the ratio WITH the labels it was measured between, both openings and both
// endings, the furniture each print carries, and the fold used for the probes. It never
// invents a boundary: a label that is not found stops the run, because a guessed seam is
// worse than no seam (rule 45). Positions are RAW offsets into the file, not folded ones -
// a folded index and a raw index are not the same number, which is how this tool was wrong
// on its first outing. German labels are tried twice: as spelled, and with the long-s and
// f-for-s shapes that scans print (rules 21, 39).
const fs = require("fs");
const D = "texts/";
const args = process.argv.slice(2);
const pos = args.filter(a => a.indexOf("--") !== 0);
const opt = n => { const a = args.find(x => x.startsWith("--" + n + "=")); return a ? a.slice(n.length + 3) : null; };
if (pos.length < 3) {
  console.log("usage: node bin/schop-pair.js <en> <de> <en-start> [--en-end=] [--de-start=] [--de-end=] [--probe=de:en]");
  process.exit(1);
}
const read = n => fs.readFileSync(n.indexOf("/") >= 0 ? n : D + n, "utf8");
const EN = read(pos[0]), DE = read(pos[1]);
const w = s => s.split(/\s+/).filter(Boolean).length;
const fold = s => s.toLowerCase().replace(/\u017f/g, "s").replace(/\u00df/g, "ss").replace(/f(?=[a-zäöü])/g, "s")
  .replace(/\u00e4/g, "a").replace(/\u00f6/g, "o").replace(/\u00fc/g, "u").replace(/[^a-zäöü ]/g, " ").replace(/\s+/g, " ");
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// a label becomes two patterns: plain (spaces loose, case loose) and long-s tolerant
function patterns(label) {
  const plain = new RegExp(label.split(/\s+/).map(esc).join("\\s*"), "gi");
  const fraktur = new RegExp(label.toLowerCase().split(/\s+/).map(x => esc(x).replace(/s/g, "[s\u017f]").replace(/f/g, "[fs]").replace(/u/g, "[uu]")).join("\\s*"), "gi");
  return [plain, fraktur];
}
function find(t, label, last) {
  for (const re of patterns(label)) {
    let m, hit = -1, firstHit = -1;
    while ((m = re.exec(t)) !== null) { if (firstHit < 0) firstHit = m.index; hit = m.index; }
    if (hit >= 0) return last ? hit : firstHit;
  }
  return -1;
}
function findFirstAfter(t, label, from) {
  for (const re of patterns(label)) {
    re.lastIndex = from;
    const m = re.exec(t);
    if (m) return m.index;
  }
  return -1;
}
const bodyStart = t => { const lines = t.split("\n"); let i = 0; while (i < lines.length && /^\s*(#|\[|$)/.test(lines[i])) i++; return t.indexOf(lines.slice(i).join("\n")); };

function span(t, startLabel, endLabel, name) {
  let s = 0;
  if (startLabel) { s = find(t, startLabel, true); if (s < 0) { console.log("  " + name + ": start label not found: " + startLabel); return null; } }
  else { s = Math.max(0, bodyStart(t)); }
  let e = t.length;
  if (endLabel) {
    const tail = t.slice(s + 20);
    const i = find(tail, endLabel, false);
    if (i < 0) { console.log("  " + name + ": end label not found: " + endLabel); return null; }
    e = s + 20 + i;
  }
  return { s, e, text: t.slice(s, e) };
}
const OCCN = opt("occ") ? +opt("occ") : null;
const ALL = (()=>{ for (const re of patterns(pos[2])) { const out=[]; let m; while((m=re.exec(EN))!==null) out.push(m.index); if(out.length) return out; } return []; })();
if (pos[2]) console.log("occurrences of the english start label: " + ALL.length + " at " + ALL.slice(0,12).join(",") + (ALL.length>12?"...":"") + "\n  (pass --occ=N to choose the Nth; the LAST is not always the body, and the FIRST is usually the contents list)");
const spanLast = o => span(EN, o, opt("en-end"), "english");
A = OCCN !== null && ALL[OCCN-1] !== undefined
  ? (function(){ const s0 = ALL[OCCN-1]; const e0 = opt("en-end") ? findFirstAfter(EN, opt("en-end"), s0 + 20) : EN.length; const ee = e0 < 0 ? EN.length : e0; return { s: s0, e: ee, text: EN.slice(s0, ee) }; })()
  : span(EN, pos[2], opt("en-end"), "english");
const B = span(DE, opt("de-start"), opt("de-end"), "german");
if (!A || !B) { console.log("STOPPED: a label missed, so nothing is measured."); process.exit(0); }

console.log("\nENGLISH " + pos[0] + "  @" + A.s + ".." + A.e + "   " + w(A.text) + " words");
console.log("GERMAN  " + pos[1] + "  @" + B.s + ".." + B.e + "   " + w(B.text) + " words");
console.log("RATIO English/German: " + (w(A.text) / w(B.text)).toFixed(2) + "   (between the labels named above; a file is a container, rule 45)");
console.log("\nOPENINGS (as printed)");
console.log("  DE: " + JSON.stringify(DE.slice(B.s, B.s + 300).replace(/\s+/g, " ")).slice(0, 330));
console.log("  EN: " + JSON.stringify(EN.slice(A.s, A.s + 300).replace(/\s+/g, " ")).slice(0, 330));
console.log("\nENDINGS (last 260 characters of each span)");
console.log("  DE: " + JSON.stringify(DE.slice(Math.max(B.s, B.e - 260), B.e).replace(/\s+/g, " ")).slice(0, 300));
console.log("  EN: " + JSON.stringify(EN.slice(Math.max(A.s, A.e - 260), A.e).replace(/\s+/g, " ")).slice(0, 300));
const marks = t => (w(t) + " words, " + ((t.match(/(?:\u00a7|\$)\s?\.\s?\d{1,3}/g) || []).length) + " paragraph numbers, " +
  ((t.match(/\[\[(?:S\. )?[\dp. ]*\d+\]\]|\[S\. \d+\]/g) || []).length) + " page markers");
console.log("\nFURNITURE   German span: " + marks(B.text));
console.log("            English span: " + marks(A.text));
console.log("\nPROBES (fold: long s to s, f for long s, ss for sharp s, umlauts resolved, single spaces kept)");
const probes = args.filter(a => a.startsWith("--probe=")).map(a => a.slice(8));
if (!probes.length) console.log("  none asked for; add --probe=germanstem:englishword");
for (const pr of probes) {
  const [de, en] = pr.split(":");
  const i = find(DE, de, false);
  const j = en ? findFirstAfter(A.text, en, 0) : -1;
  console.log("  " + de.padEnd(20) + (i < 0 ? "German: absent   " : "German: @" + String(i).padEnd(7)) +
    "| " + (en || "").padEnd(16) + (j < 0 ? "English: absent" : "English: @" + j));
  if (i >= 0) console.log("      DE: " + JSON.stringify(DE.slice(i, i + 200).replace(/\s+/g, " ")).slice(0, 240));
  if (j >= 0) console.log("      EN: " + JSON.stringify(A.text.slice(Math.max(0, j - 80), j + 160).replace(/\s+/g, " ")).slice(0, 240));
}
console.log("\nNow write what this measured into the register and the catalogue; a printout is not a record.");
