// de.wikisource.org wikitext -> plain text for the Schopenhauer corpus.
// Keeps scan page markers ({{Seite|524||img}} -> [S. 524]) and drops template blocks.
// usage: node bin/wikitext-txt.js <raw.wiki>   (page title needed only for the header)
const fs = require("fs");
let t = fs.readFileSync(process.argv[2], "utf8");
const fields = {};
t = t.replace(/\{\{[A-Za-z]*[Dd]aten\n([\s\S]*?)\}\}/, (m, body) => {   // Textdaten / ADBDaten
  body.split("\n").forEach(l => {
    const m2 = l.match(/^\s*\|([A-ZÄÖÜ_]+)=(.*)$/);
    if (m2) fields[m2[1]] = m2[2].trim();
  });
  return "";
});
t = t.replace(/\{\{Entscheidungstext\n([\s\S]*?)\}\}/, (m, body) => {   // court-record header block
  body.split("\n").forEach(l => {
    const m2 = l.match(/^\s*\|([A-ZÄÖÜ_ ]+)=(.*)$/);
    if (m2) fields[m2[1].trim()] = m2[2].trim();
  });
  return "";
});
// the page numbers of the print the scan was taken from, as coloured [n] spans
t = t.replace(/<span[^>]*>\s*\[(\d{1,3})\]\s*<\/span>/g, "\n[S. $1]\n");
t = t.replace(/\{\{Anker\|\d+\}\}/g, "");
t = t.replace(/\{\{Seite\|(\d+)[^}]*\}\}/g, (m, p) => "\n[S. " + p + "]\n");
t = t.replace(/\{\{[^{}]*\}\}/g, " ").replace(/\{\{[^{}]*\}\}/g, " ");
t = t.replace(/<tt>([\s\S]*?)<\/tt>/g, "$1");
t = t.replace(/<br\s*\/?>/gi, "\n");
t = t.replace(/<[^>]+>/g, "");
t = t.replace(/'\'''([^']+)'''/g, "$1");                    // bold+italic
t = t.replace(/'''([^']*)'''/g, "$1").replace(/''([^']*)''/g, "$1");
t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
t = t.replace(/-{([^}]*)}-/g, "$1");
t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d));
t = t.split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).filter((l, i, a) => l !== "" || (i && a[i - 1] !== "")).join("\n");
const meta = Object.keys(fields).filter(k => fields[k]).map(k => "# " + k.toLowerCase() + ": " + fields[k].replace(/\[\[|\]\]/g, ""));
console.log(meta.join("\n"));
console.log(t.trim());
