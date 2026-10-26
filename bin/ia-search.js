// usage: node bin/ia-search.js <search words> [rows]
// A small Internet Archive advanced-search client: prints identifier | year | title.
// Quoted phrases and field syntax are passed straight through, so "title:(x y)" works too.
const { execSync } = require("child_process");
const words = process.argv.slice(2)[0] || "schopenhauer";
const rows = process.argv.slice(2)[1] || "8";
const q = encodeURIComponent(words).replace(/%20/g, "+");
const url = "https://archive.org/advancedsearch.php?q=" + q +
  "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&fl%5B%5D=creator&fl%5B%5D=mediatype" +
  "&rows=" + rows + "&page=1&sort%5B%5D=year+asc&output=json";
const out = execSync(`curl -sSg --max-time 90 ${JSON.stringify(url)}`, { maxBuffer: 1 << 26 }).toString();
let j; try { j = JSON.parse(out); } catch (e) { console.log("not JSON:", out.slice(0, 200)); process.exit(1); }
console.log("query:", words, "| found:", j.response.numFound);
for (const d of j.response.docs) {
  console.log("  ", String(d.identifier).padEnd(34), "|", (d.year || "?"), "|", (d.mediatype || "?").toString()[0], "|",
    String(d.title).replace(/\s+/g, " ").slice(0, 62));
}
