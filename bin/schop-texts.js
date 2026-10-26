// build texts/*.txt for the Schopenhauer corpus: strip Project Gutenberg boilerplate,
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// prepend the required header (tier, titles, year, edition, translator, copyright, source URL, date fetched).
// usage: node bin/schop-texts.js <spec.json>
const fs = require("fs");
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const TODAY = process.env.SCHOP_DATE || new Date().toISOString().slice(0, 10);
for (const it of spec) {
  if (!it.src || !fs.existsSync(it.src) || fs.statSync(it.src).size < 200) { console.log("SKIP (no source yet) " + it.out); continue; }
  let t = fs.readFileSync(it.src, "utf8");
  if (it.kind === "pg") {
    let i = t.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK");
    if (i < 0) { console.log("NO PG START " + it.src); continue; }
    t = t.slice(i);
    t = t.replace(/^\*\*\* START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n/, "");
    const j = t.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
    if (j > 0) t = t.slice(0, j);
  } else if (it.kind === "ws") {
    // already converted by bin/wikitext-txt.js (keeps [S. nnn] scan page markers)
  }
  if (it.page_head) {                    // running heads that carry the printed page number
    const re = new RegExp(it.page_head, "g");
    t = t.replace(re, (...a) => {
      const g = a.slice(1).find(x => typeof x === "string" && /^\d+$/.test(x));
      const d = g || (a[0].match(/\d+/) || [""])[0];      // first group, else the digits in the match
      return " [p. " + d + "] ";
    });
    console.log("  page markers recovered: " + (t.match(/\[p\. \d+\]/g) || []).length + " in " + it.out);
  }
  t = t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim() + "\n";
  const L = [];
  L.push("# " + it.tier + (it.kindname ? " | " + it.kindname : ""));
  L.push("# title: " + it.title);
  if (it.titleEn) L.push("# title_en: " + it.titleEn);
  L.push("# year: " + it.year);
  L.push("# edition: " + it.edition);
  L.push("# translator: " + (it.translator || "none (German original)"));
  L.push("# copyright: " + it.rights);
  L.push("# source: " + it.url);
  L.push("# fetched: " + TODAY);
  if (it.note) L.push("# note: " + it.note);
  const head = L.join("\n") + "\n\n";
  fs.writeFileSync(it.out, head + t);
  const st = fs.statSync(it.out);
  console.log(String(Math.round(st.size / 1024)).padStart(6) + " KB  " + it.out + "  (" + t.split(/\s+/).length + " words)");
}
