#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// Recover printed pages in a finished text file from its RUNNING HEADS, in place.
// A running head is a line that gives a page number and a short title, and - the test that
// matters - repeats its title elsewhere in the same file: furniture repeats, prose does not.
// Pages are then accepted by a tolerant walk (a number counts only if it continues the
// sequence within four pages), so nothing is invented and no page is estimated.
// Where the OCR lost a head there is simply no marker.
// usage: node bin/schop-pages.js [--apply] [--loose REGEX] file [file ...]
// --loose accepts as a head any short line ending in a number whose text matches REGEX,
// instead of demanding that the title repeat: where a book's general running head comes out
// of the OCR garbled differently on every page ("Ehopenhauer, Parerga. II. 12", "Sqopenhauer,
// Parerga. II. 13"), repetition fails and a declared pattern is the honest instrument.
const fs = require("fs");
const APPLY = process.argv.includes("--apply");
const li = process.argv.indexOf("--loose");
const LOOSE = li > 0 ? new RegExp(process.argv[li + 1], "i") : null;
const files = process.argv.slice(2).filter(a => a !== "--apply" && a !== "--loose" && (!LOOSE || a !== process.argv[li + 1]));
const norm = s => s.toLowerCase().replace(/\u017f/g, "s").replace(/[\u00df]/g, "ss").replace(/f/g, "s").replace(/[^a-z]/g, "");
for (const path of files) {
  const raw = fs.readFileSync(path, "utf8");
  const nl = raw.indexOf("\n\n");
  const headBlock = raw.slice(0, nl);
  let body = raw.slice(nl + 2);
  const lines = body.split("\n");
  // 1. candidate head lines
  const cand = [];
  const tally = Object.create(null);
  lines.forEach((l, i) => {
    let m = l.match(/^\s*(\d{1,4})\s+(\S.{1,58})$/);
    let pg, txt;
    if (m) { pg = +m[1]; txt = m[2]; }
    else { m = l.match(/^(\S.{1,58}?)[.\s]+(\d{1,4})\s*$/); if (!m) return; pg = +m[2]; txt = m[1]; }
    const k = norm(txt);
    if (k.length < 5) return;
    (tally[k] || (tally[k] = [])).push(i);
    cand.push({ i, pg, key: k, txt });
  });
  const headKeys = new Set(Object.keys(tally).filter(k => tally[k].length >= 2));
  // 2. tolerant walk over the heads only
  let cur = 0, first = null, last = null;
  const accept = new Map();
  for (const c of cand) {
    if (LOOSE) { if (!LOOSE.test(c.txt) || c.txt.split(/\s+/).length > 10) continue; }
    else if (!headKeys.has(c.key)) continue;
    if (cur === 0) { if (c.pg >= 1 && c.pg <= 30) { cur = c.pg; first = last = c.pg; accept.set(c.i, c.pg); } continue; }
    if (c.pg > cur && c.pg <= cur + 12) { cur = c.pg; last = c.pg; accept.set(c.i, c.pg); }
  }
  const n = accept.size;
  const name = path.split("/").pop();
  const mode = LOOSE ? " (loose, declared pattern)" : "";
  if (n < 15) { console.log(name.slice(0, 56).padEnd(58), "heads:", String(n).padStart(4), " -> left as it is"); continue; }
  console.log(name.slice(0, 56).padEnd(58), "heads:", String(n).padStart(4), " S.", first, "-", last, APPLY ? "(applied)" + mode : "(dry run)" + mode);
  if (!APPLY) continue;
  body = lines.map((l, i) => accept.has(i) ? "[S. " + accept.get(i) + "]" : l).join("\n");
  const add = "\n# pages: " + n + " printed pages recovered by bin/schop-pages.js from running heads (" + (LOOSE ? "loose mode: a short line ending in a page number whose text matches a declared pattern, because this scan garbles the head title differently on every page" : "a head counts only where its title repeats elsewhere in the file") + ", and a page number only where it continues the sequence within twelve pages). Recovered, not invented: " +
    (first === null ? "" : "S. " + first + " to S. " + last + "; ") + "where the OCR lost a head there is no marker, so a citation should be checked against the scan.";
  fs.writeFileSync(path, headBlock + add + "\n\n" + body.replace(/^\n+/, ""));
}
