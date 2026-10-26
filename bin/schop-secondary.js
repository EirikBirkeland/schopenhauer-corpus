// The tier-2 shelf, ranked by what it can be PROVEN to quote, not by reputation.
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// usage: node bin/schop-secondary.js
// Writes secondary.txt (for reading) and secondary.tsv (for the machine).
// The numbers are FLOORS: a quotation counts only if a run of 30 characters of it is found
// verbatim in a tier-1 text. Two OCR layers sit between the study and the primary text, so the
// true rate is higher and nobody should quote these figures as a fidelity score.
const fs = require("fs");
const path = require("path");
const SPAN = +(process.env.SPAN || 30);

const fold = s => s.toLowerCase().replace(/ſ/g, "s").replace(/ß/g, "ss").replace(/f/g, "s")
  .replace(/[-–—]\s+/g, "").replace(/[^a-zäöü0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* walk(p); else if (p.endsWith(".txt")) yield p; } }
const prim = [];
for (const f of walk("texts")) {
  if (f.includes("/secondary/")) continue;
  prim.push(fold(fs.readFileSync(f, "utf8")));
}

// what is known about each study: who wrote it, in what language it quotes, and the verdict this
// collection has reached by reading it. The numbers below are measured here; the verdicts are ours.
const KNOWN = {
  28: { who: "Johannes Volkelt, Arthur Schopenhauer (1900)", lang: "German, quotes the works and cites volume and page", verdict: "First as an apparatus: the largest quotable body in the shelf and the only one that cites by volume and page - BUT in THIS copy the citations are footnote furniture and the OCR has chewed them (a passage ends with a bare 269) or with a garbled mark), so his references are human-checkable and machine-opaque (spot-check 49). Read for doctrine; test every quotation before use." },
  78: { who: "Julius Frauenstädt, Einleitung des Herausgebers (1877)", lang: "German", verdict: "The editor of the collected edition, with the papers in hand, 137 pages of doctrine and answer to opponents. It opens on a quotation of his own (WWV II ch. 40) and is therefore testable at the threshold. Advocacy as well as scholarship: he defended publishing the letters against Schopenhauer's prohibition (G-35)." },
  79: { who: "Julius Frauenstädt, Ein Lebensbild vom Herausgeber (1877)", lang: "German", verdict: "for biography, and it names its own sources (Memorabilien, Nachlass, Gwinner 1862, Lindner 1863). Where it agrees with Gwinner it is often a second COPY of the same story, not a second witness." },
  72: { who: "Wilhelm Gwinner, Arthur Schopenhauer aus persönlichem Umgange (1862)", lang: "German; quotes letters, talk and adversaries", verdict: "Little for doctrine, first for presence: the room, the bear-skin, the deathbed, the executor's speech. Its low quotation floor is evidence about what a memoir quotes, not proof of misquotation." },
  73: { who: "Wilhelm Gwinner, Schopenhauer und seine Freunde (1863)", lang: "German; the quarrel pamphlet", verdict: "the second volley in the quarrel over publishing the letters. The quotations it carries are largely Lindner's rhetoric, whose only other home in this collection is the pamphlet attacking them." },
  26: { who: "Helen Zimmern, Arthur Schopenhauer: His Life and His Philosophy (1876)", lang: "ENGLISH: she quotes in translation, so a German audit cannot see most of her apparatus", verdict: "Strong on letters and biography, weak on verbatim quotation: her quotation marks are not citations (G-03). Cite her for the story, not for the wording." },
  21: { who: "Margrieta Beer, Schopenhauer (1914)", lang: "ENGLISH original; a few German quotations survive", verdict: "A short study for beginners. Its handful of matches at 30 characters wants reading before use: a short match in a bilingual book is often chance or translation." },
  22: { who: "Thomas Whittaker, Schopenhauer (1909)", lang: "ENGLISH original", verdict: "Not auditable by this method at all: no quoted passage long enough to test. Absence of measurement, not proof of fidelity." },
  23: { who: "Friedrich Liepmann, Arthur Schopenhauer, Allgemeine Deutsche Biographie 32 (1891), pp. 333-346", lang: "German, but quotations are short", verdict: "A dictionary article: useful for the outline of the life and for contemporary framing, useless as a source of quotations." }
};

const rows = [];
for (const f of fs.readdirSync("texts/secondary").sort()) {
  const num = +f.slice(0, 2);
  const raw = fs.readFileSync("texts/secondary/" + f, "utf8");
  const head = {};
  for (const l of raw.split("\n")) {
    const m = l.match(/^#\s*(tier|title|year|edition|copyright|source|fetched)\s*:\s*(.*)$/i);
    if (m) head[m[1].toLowerCase()] = m[2];
    if (!/^#/.test(l) && l.trim()) break;
  }
  const words = raw.split(/\s+/).length;
  const flat = raw.replace(/[\u201c\u201d\u201e]/g, '"').replace(/\s+/g, " ");
  const quotes = [...flat.matchAll(/"([^"]{40,})"/g)].map(m => fold(" " + m[1] + " ")).filter(q => q.length >= SPAN + 12);
  let found = 0;
  for (const q of quotes) {
    const frag = q.slice(10, 10 + SPAN);
    if (prim.some(t => t.indexOf(frag) >= 0)) found++;
  }
  const k = KNOWN[num] || { who: "(unknown to the table: add it)", lang: "?", verdict: "unranked" };
  rows.push({ file: f, num, title: head.title || "", year: head.year || "", words, tested: quotes.length, found, floor: quotes.length ? Math.round(100 * found / quotes.length) : 0, who: k.who, lang: k.lang, verdict: k.verdict });
}
rows.sort((a, b) => b.found - a.found || b.tested - a.tested);

const auditable = rows.filter(r => !/^ENGLISH/i.test(r.lang));
const blind = rows.filter(r => /^ENGLISH/i.test(r.lang));
const L = [];
L.push("TIER 2 SHELF, RANKED BY QUOTATIONS PROVABLY FOUND IN THE PRIMARY TEXTS");
L.push("Made by bin/schop-secondary.js. Ranking is by measurement and by reading, never by reputation.");
L.push("");
L.push("HOW TO READ THE NUMBERS");
L.push("   tested = quoted passages of 40+ characters the study offers between quote marks.");
L.push("   provable = how many quoted passages were found word for word in one of his own texts,");
L.push("   over runs of " + SPAN + " characters, with capital letters and the old long s made to agree.");
L.push("   The figure is a FLOOR: two layers of OCR sit between a study and the primary text, and a");
L.push("   The longer the run demanded, the fewer the matches: always name the length with the figure.");
L.push("   CITE THE TOOL WITH THE NUMBER: the counts depend on how a quotation is cut out of the page,");
L.push("   so bin/schop-audit.js and this script disagree a little about the same study (Volkelt: 46");
L.push("   provable here, 34 there, both at 30 characters). Both are floors; neither is a fidelity score.");
L.push("   A study written in ENGLISH that quotes in translation is invisible to this test: its low");
L.push("   number means the method cannot see it, not that it misquotes. Such studies are listed apart,");
L.push("   and are NOT ranked against the German ones.");
L.push("");
L.push("AUDITABLE: written in German, so a quotation can be looked for in the primary texts");
auditable.forEach((r, i) => {
  L.push("RANK " + (i + 1) + ". file " + String(r.num).padStart(2, "0") + " | " + r.who);
  L.push("        " + r.file + " | " + r.words.toLocaleString("en-GB") + " words");
  L.push("        tested " + r.tested + " | provable " + r.found + " | floor " + r.floor + "% at " + SPAN + " characters");
  L.push("        " + r.verdict);
  L.push("");
});
L.push("NOT RANKED BY THIS TEST: English books, quoting in translation");
blind.forEach(r => {
  L.push("   file " + String(r.num).padStart(2, "0") + " | " + r.who);
  L.push("        tested " + r.tested + " | provable " + r.found + " (a German audit cannot see an English quotation)");
  L.push("        " + r.verdict);
  L.push("");
});
L.push("--------------------------------------------------------------------------------");
L.push("WHAT THIS SHELF IS FOR");
L.push("   A tier-2 item is worth what its references are worth. Where a study cites by volume and");
L.push("   page (file 28) its apparatus can be tested and it is worth more to a reader who must prove");
L.push("   a sentence; where a study reports talk and letters (files 72, 73) its value is presence, and");
L.push("   quoting it as though it quoted the published works will mislead. Never carry a secondary");
L.push("   sentence into an answer about doctrine without finding the primary place.");
fs.writeFileSync("secondary.txt", L.join("\n") + "\n");
const T = ["group\trank\tfile\tauthor_year\twords\ttested\tprovable\tfloor30\tnote"];
auditable.forEach((r, i) => T.push(["auditable", i + 1, r.num, r.who.replace(/\t/g, " "), r.words, r.tested, r.found, r.floor, r.lang.replace(/\t/g, " ")].join("\t")));
blind.forEach(r => T.push(["english", "-", r.num, r.who.replace(/\t/g, " "), r.words, r.tested, r.found, r.floor, r.lang.replace(/\t/g, " ")].join("\t")));
fs.writeFileSync("secondary.tsv", T.join("\n") + "\n");
console.log("wrote secondary.txt and secondary.tsv (" + auditable.length + " ranked, " + blind.length + " listed apart)");
auditable.forEach((r, i) => console.log("  rank " + (i + 1) + "  file " + String(r.num).padStart(2, "0") + "  tested " + String(r.tested).padStart(3) + "  provable " + String(r.found).padStart(2) + "  floor " + String(r.floor).padStart(2) + "%"));
blind.forEach(r => console.log("  listed  file " + String(r.num).padStart(2, "0") + "  tested " + String(r.tested).padStart(3) + "  provable " + String(r.found).padStart(2) + "  (English: this test cannot see it)"));
