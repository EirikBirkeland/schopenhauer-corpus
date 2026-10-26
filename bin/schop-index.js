#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// Make a finding aid for the collection: one line per text, read off its own header block.
// Nothing here is remembered or copied by hand - a file that lacks a header shows up as a
// defect rather than as a neat line. usage: node bin/schop-index.js [outdir]
const fs = require("fs");
const OUT = process.argv[2] || ".";
const dirs = [OUT + "/texts", OUT + "/texts/secondary"];
const rows = [];
const get = (t, k) => { const m = t.match(new RegExp("^# " + k + ": (.*)$", "m")); return m ? m[1].trim() : ""; };
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(x => x.endsWith(".txt")).sort()) {
    const t = fs.readFileSync(d + "/" + f, "utf8");
    const words = t.split(/\s+/).length;
    const coords = (t.match(/\[\s*(?:S\.|p\.)\s*\d{1,4}\]|\[\d{2,4}\]/g) || []).length;
    const tier = get(t, "tier") || t.split("\n")[0];
    rows.push({
      file: f.replace(/\.txt$/, ""),
      tier: tier.replace(/^#\s*/, "").split("|")[0].replace(/TIER\s*/ig, "T").trim().slice(0, 11),
      where: d.endsWith("secondary") ? "secondary" : "main",
      title: (get(t, "title") || "NO TITLE IN HEADER").split(" (")[0].slice(0, 34),
      year: (get(t, "year") || "?").replace(/[^0-9/, -].*$/, "").slice(0, 12),
      lang: /_de(_|\b)/.test(f) ? "de" : /_en(_|\b)/.test(f) ? "en" : /_la(_|\b)/.test(f) ? "la" : "?",
      tr: /none/i.test(get(t, "translator")) ? "orig" : (get(t, "translator") || "?").slice(0, 28),
      words, coords,
      url: get(t, "source") || "NO URL",
      rights: get(t, "copyright") || "?"
    });
  }
}
rows.sort((a, b) => a.file.localeCompare(b.file));
const W = [58, 12, 9, 34, 11, 4, 8, 8, 6];
const head = ["file", "tier", "shelf", "title", "year", "lang", "transl", "words", "pages"];
const line = r => [r.file, r.tier, r.where, r.title, r.year, r.lang, r.tr, r.words, r.coords];
const fmt = r => line(r).map((x, i) => String(x).padEnd(W[i]).slice(0, W[i])).join("  ").replace(/\s+$/, "");
const txt = ["INDEX OF THE SCHOPENHAUER CORPUS  -  made by bin/schop-index.js from each file's own",
  "header, so a missing header shows as a defect. \"pages\" counts recovered printed-page",
  "coordinates found in the file ([S. n], [p. n], or a bracketed folio); 0 means the file must",
  "be cited by section, chapter or paragraph - see each header and the catalogue's GAP list.",
  "", fmt({ file: head[0], tier: head[1], where: head[2], title: head[3], year: head[4], lang: head[5], tr: head[6], words: head[7], coords: head[8] }),
  "-".repeat(146)]
  .concat(rows.map(fmt)).concat([
    "-".repeat(146),
    rows.length + " files | " + rows.filter(r => r.where === "main").length + " on the main shelf, " + rows.filter(r => r.where === "secondary").length + " secondary",
    "words: " + rows.reduce((s, r) => s + r.words, 0).toLocaleString("en") + " | recovered page coordinates: " + rows.reduce((s, r) => s + r.coords, 0).toLocaleString("en"),
    "languages: " + Object.entries(rows.reduce((m, r) => (m[r.lang] = (m[r.lang] || 0) + 1, m), {})).map(e => e[0] + " x" + e[1]).join(", "),
    "files with no page coordinate: " + rows.filter(r => !r.coords).length]).join("\n") + "\n";
fs.writeFileSync(OUT + "/index.txt", txt);
fs.writeFileSync(OUT + "/index.tsv", head.join("\t") + "\n" + rows.map(r => line(r).join("\t")).join("\n") + "\n");
console.log("wrote index.txt and index.tsv (" + rows.length + " files)");
