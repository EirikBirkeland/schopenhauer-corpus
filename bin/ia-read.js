#!/usr/bin/env node
// Readability score for a Fraktur OCR text layer. Usage: node bin/ia-read.js FILE [FILE...]
// The point is to decide, before reading a page of it, whether this OCR can be QUOTED.
// Fraktur OCR that has failed is recognisable without looking: every "und" comes out
// "unb", the long s is gone (so no "ſ" at all), and the commonest words of the language
// stop appearing. A good Fraktur layer keeps "und" and keeps the long s.
const fs = require("fs");
const STOP = ["und", "der", "die", "das", "ist", "nicht", "sich", "ein", "eine", "aber", "als", "auch", "werden", "sein", "welche"];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, "utf8");
  const toks = t.toLowerCase().split(/[^a-zäöüß\u017f]+/).filter(Boolean);
  const n = toks.length || 1;
  const count = w => toks.filter(x => x === w).length;
  let stopHits = 0; for (const w of STOP) stopHits += count(w);
  const c = re => (t.match(re) || []).length;
  const score = (stopHits / n * 100).toFixed(2);
  console.log(
    p.replace(/^.*\//, "").padEnd(34),
    "words:", String(t.split(/\s+/).length).padStart(7),
    "| common-word %:", score.padStart(5),
    "| und:", String(count("und")).padStart(5),
    "| unb:", String(count("unb")).padStart(5),
    "| long-s:", String(c(/\u017f/g)).padStart(6),
    "| [S.:", String(c(/\[S\.?\s?\d/g)).padStart(5),
    "| verdict:", (count("unb") > 3 * count("und") && c(/\u017f/g) === 0) ? "SHREDDED (do not quote)"
      : (stopHits / n > 0.05 ? "readable" : "thin: check by eye")
  );
}
