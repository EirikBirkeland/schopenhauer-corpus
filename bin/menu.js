#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// menu.js - the door the owner asked for: a search is pre-contextualised, so the
// corpus needs no warning labels and a model cannot mistake a rumour for his prose.
//
//   node bin/menu.js                          the menu
//   node bin/menu.js 1 "phrase"               his own texts            -> HIS:
//   node bin/menu.js 2 "phrase"               authorized writers       -> SECONDARY:
//   node bin/menu.js 3 "phrase"               gossip and sayings       -> GOSSIP:/SAYING:
//   node bin/menu.js -a "phrase"              every shelf at once, tag on every hit
//
// Options: -n N (max hits, default 6)
// A negative on door 1 is a report about THIS corpus and these folds: the print's
// spelling as read, the long s folded to s, and f folded to s for the scan layers.
const fs = require("fs"), path = require("path");
const T = "texts", S = "texts/secondary", R = ".";

const args = process.argv.slice(2);
let max = 6;
const mi = args.indexOf("-n");
if (mi >= 0) { max = parseInt(args[mi + 1], 10) || 6; args.splice(mi, 2); }
const ai = args.indexOf("-a");
const all = ai >= 0; if (all) args.splice(ai, 1);

if (!args.length) {
  console.log("Which shelf to search?\n" +
    "  1  his own texts                 (" + T + ")         tier 1\n" +
    "  2  authorized writers about him  (" + S + ")  tier 2\n" +
    "  3  gossip and sayings            (gossip.txt, quotes.txt)  tier 3\n" +
    "usage: node bin/menu.js 1|2|3 \"phrase\" [-n N]  |  node bin/menu.js -a \"phrase\"");
  process.exit(0);
}
const door = all ? "a" : args.shift();
const q = args.join(" ");
if (!q) { console.error("give me a phrase"); process.exit(1); }

const fold = s => s.replace(/ſ/g, "s").replace(/ß/g, "ss").replace(/-/g, "");
const foldF = s => fold(s).replace(/f/g, "s");
const qf = fold(q), qff = foldF(q);

const DOORS = {
  "1": { dirs: [{ d: T, kind: "HIS" }], files: [], label: "his own texts" },
  "2": { dirs: [{ d: S, kind: "SECONDARY" }], files: [], label: "authorized writers" },
  "3": { dirs: [], files: [R + "/gossip.txt", R + "/quotes.txt"], label: "gossip and sayings" },
  "a": { dirs: [{ d: T, kind: "HIS" }, { d: S, kind: "SECONDARY" }],
	 files: [R + "/gossip.txt", R + "/quotes.txt"], label: "every shelf" }
};
const sh = DOORS[door];
if (!sh) { console.error("door must be 1, 2 or 3 (or -a)"); process.exit(1); }

function coord(text, idx) {
  const before = text.slice(0, idx);
  const s = [...before.matchAll(/\[\[?S\.?\s*(\d{1,4})\]?\]/g)].pop();
  const z = [...before.matchAll(/\[(\d{2,4})\]/g)].pop();
  const g = [...before.matchAll(/(?:§|\$)[.\s]*(\d{2,4})/g)].pop();
  const out = []; if (s) out.push("S. " + s[1]); if (z) out.push("[" + z[1] + "]"); if (g) out.push("§ " + g[1]);
  return out.join(" ");
}
function record(text, idx) {
  const ids = [...text.slice(0, idx).matchAll(/^([GQ]-\d+)\b/gm)].map(m => m[1]);
  return ids.length ? ids[ids.length - 1] : "";
}

const seen = [];
function snippet(src, i, len) {
  return src.slice(Math.max(0, i - 70), i + len + 110).replace(/\s+/g, " ").trim();
}
function scan(file, kind, raw, verbatim) {
  const cut = raw.indexOf("\n\n", raw.indexOf("Source:"));
  const b = raw.slice(cut < 0 ? 0 : cut);
  const passes = verbatim ? [[b, q, ""]] : [[fold(b), qf, ""], [foldF(b), qff, " (f-folded)"]];
  for (const [src, query, mode] of passes) {
    let from = 0;
    while (seen.length < max) {
      const i = src.indexOf(query, from);
      if (i < 0) break;
      from = i + query.length;
      const snip = snippet(src, i, query.length);
      const key = path.basename(file) + "|" + snip.slice(0, 40).toLowerCase().replace(/f/g, "s");
      if (seen.some(x => x[5] === key)) continue;
      seen.push([kind, path.basename(file).replace(/\.txt$/, ""),
	verbatim ? record(b, i) : coord(b, i), mode, snip, key]);
      if (verbatim) break;
    }
    if (seen.length >= max) break;
  }
}
for (const f of sh.files) scan(f, path.basename(f) === "gossip.txt" ? "GOSSIP" : "SAYING", fs.readFileSync(f, "utf8"), true);
for (const { d, kind } of sh.dirs) {
  for (const f of fs.readdirSync(d).filter(x => x.endsWith(".txt")).sort()) {
    if (seen.length >= max) break;
    scan(path.join(d, f), kind, fs.readFileSync(path.join(d, f), "utf8"), false);
  }
}
for (const [kind, f, place, mode, snip] of seen) {
  console.log(kind.padEnd(9) + "| " + f + (place ? "  " + (/\w-\d\d/.test(place) ? place : "[" + place + "]") : "") + mode);
  console.log("          " + JSON.stringify(snip).slice(0, 260));
}
console.log("(" + seen.length + " hit" + (seen.length === 1 ? "" : "s") + " in " + sh.label + " for " + JSON.stringify(q) +
  "; a negative on door 1 = not found with the print's spelling, the old long s read as s, and in the scanned files f read as s)");
