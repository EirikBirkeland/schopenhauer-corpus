#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// Which English file carries this German text? Measured, not remembered: share STEMED stems
// (six letters) between each German file and each English one. Scholarly translations keep
// their Latinate vocabulary, so "metaphy", "paralip", "somnamb" cross the language; the count
// of shared distinctive stems is the pairing evidence. A German chapter with no strong English
// candidate is a GAP in the translation shelf, which is worth knowing on its own.
// usage: node bin/schop-pairs.js [--all]
const fs = require("fs");
const D = "texts";
const STOP = new Set(("und der die das dem den des ein eine über auch als noch schon seine ihrer ihres dieses jenes nicht nichts man kann muss soll wurde werden worden wenn aber sondern weil damit davon daraus hierzu worin wobei sowie dieser dieser solchen unseres ihrem seinem ihren ihren einem einem etwas alles viele einige mehr weniger wenig ist sind war waren sein haben hatte hätte würde wäre mir mich mein dein ihr ihn uns euch euch unsrer").split(" "));
const body = f => fs.readFileSync(f, "utf8").replace(/^#.*\n/g, "").replace(/^\n+/, "").replace(/\[[Sp]?\.?\s*\d+\]/g, " ");
const stems = t => {
  const s = new Set();
  for (let w of t.toLowerCase().replace(/\u017f/g, "s").replace(/[^a-zäöüß]/g, " ").split(/\s+/)) {
    w = w.replace(/[äöü]/g, x => ({ ä: "ae", ö: "oe", ü: "ue" })[x]).replace(/ß/g, "ss");
    if (w.length < 7 || STOP.has(w)) continue;
    s.add(w.slice(0, 6));
  }
  return s;
};
const files = fs.readdirSync(D).filter(x => x.endsWith(".txt"));
const de = files.filter(x => /_de(_|\b)/.test(x)).map(x => [x, stems(body(D + "/" + x))]);
const en = files.filter(x => /_en(_|\b)/.test(x)).map(x => [x, stems(body(D + "/" + x))]);
const deOnly = process.argv.includes("--all") ? de : de.slice(0, 400);
const rows = [];
const out = [];
for (const [f, g] of deOnly) {
  const scored = en.map(([e, s]) => { let n = 0; for (const k of g) if (s.has(k)) n++; return [e, n, n / Math.sqrt(g.size * s.size)]; })
    .sort((a, b) => b[2] - a[2]);
  const top = scored[0], second = scored[1];
  rows.push({ f, best: top[0], s: top[2], n: top[1], second: second[0], s2: second[2], size: g.size });
}
for (const r of rows) {
  const verdict = r.s < 0.02 ? "NO English counterpart found" : r.s < 0.05 ? "weak - partial overlap only" : "paired";
  console.log(r.f.slice(0, 50).padEnd(52), "->", (r.best || "").slice(0, 38).padEnd(40),
    r.s.toFixed(3), "| next:", (r.second || "").slice(0, 24).padEnd(26), r.s2.toFixed(3), "|", verdict);
}

// write the table into the collection, with its own calibration stated
const txt = ["GERMAN TEXTS AND THE ENGLISH FILES THAT CARRY THEM  -  made by bin/schop-pairs.js.",
 "Measured, not remembered: the count of shared STEMED stems (six letters, long s folded) between",
 "each German file and each English one, divided by the geometric mean of their stem sets. The",
 "score separates a true pair from noise only for long texts: the pairs already verified by hand",
 "score 0.058 to 0.310 (27 to 15, 31 to 15, 30 to 19, 04 to 13, 01 to 08, 02 to 10, 03 to 11),",
 "while short chapters land in the same range as unrelated files. So a line below PROPOSES a",
 "carrying volume; a quotation is still paired by reading a passage, as passes 7 and 8 did.",
 "A German file whose best score is under 0.02 has no English counterpart on this shelf at all.",
 ""].concat(rows.map(r => {
  const v = r.s < 0.02 ? "no counterpart" : r.s < 0.05 ? "weak - too short to judge" : "proposed pair";
  return r.f + "\n    -> " + r.best + "  (" + r.s.toFixed(3) + ")   | next: " + r.second + " (" + r.s2.toFixed(3) + ")   | " + v;
})).join("\n") + "\n";
fs.writeFileSync("pairs.txt", txt);
console.log("wrote pairs.txt");
