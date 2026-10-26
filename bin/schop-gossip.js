#!/usr/bin/env node
process.chdir(require("path").join(__dirname, ".."));   // the repo root: run these from anywhere
// Build the machine-readable face of shelf 3 from gossip.txt.
// The prose file is the authority; this only parses it, so the two cannot disagree.
//
//   node bin/schop-gossip.js          -> writes gossip.tsv, prints a census
//   node bin/schop-gossip.js --check  -> exits non-zero if a status word is off-vocabulary
const fs = require("fs");
const SRC = process.argv.filter(a => a.indexOf("--") !== 0)[2] || "gossip.txt";
const OUT = SRC.replace(/\.txt$/, ".tsv");

const VOCAB = ["HIS", "REPORTED", "HALF-TRUE", "CONDENSED", "MISFILED", "SECONDARY-ERROR", "UNSOURCED", "LIE", "NOT-HIS-HERE"];

const txt = fs.readFileSync(SRC, "utf8").split("\n");
const recs = [];
let cur = null;
for (const line of txt) {
  const m = line.match(/^([A-Z]-\d+)\s*\|\s*([^|]+?)\s*\|\s*(.+)$/);
  if (m) {
    const raw = m[2];
    const st = VOCAB.filter(v => raw === v || raw.indexOf(v + " ") === 0 || raw.indexOf(v + "(") === 0)[0];
    cur = { id: m[1], status: st || raw, note: st ? raw.slice(st.length).replace(/^[( ]+|\)+$/g, "").trim() : "",
      title: m[3].trim(), claim: "", here: "", answer: "", ref: "" };
    recs.push(cur); continue;
  }
  if (!cur) continue;
  const f = line.match(/^\s{3}(claim|here|answer|ref):\s*(.*)$/);
  if (f) {
    if (cur[f[1]] && !/[.;]$/.test(cur[f[1]])) cur[f[1]] += " " + f[2];
    else if (cur[f[1]]) cur[f[1]] += " " + f[2];
    else cur[f[1]] = f[2];
    continue;
  }
  const cont = line.match(/^\s{3,}(.*)$/);
  if (cont && cont[1] && !/^-+$/.test(cont[1]) && !/^\*/.test(cont[1])) {
    const last = ["claim", "here", "answer", "ref"].filter(k => cur[k]).pop();
    if (last) cur[last] += " " + cont[1];
    else cur.title += " " + cont[1];
  } else if (/^\S/.test(line) && line.trim()) cur = null;
}
// finish multi-line fields that ended mid-sentence
for (const r of recs) for (const k of ["claim", "here", "answer", "ref"]) r[k] = r[k].replace(/\s+/g, " ").trim();

const bad = recs.filter(r => VOCAB.indexOf(r.status) < 0 && !(r.status === "HIS" || /^HIS /.test(r.status)));
const tsv = ["id\tstatus\tstatus_qualifier\ttitle\tfiles_cited\tcarrier_witnesses\tref"].concat(
  recs.map(r => {
    const files = [...new Set([...r.here.matchAll(/file[s]?\s+([0-9]{2}(?:-[0-9]{2})?(?:,\s*[0-9]{2})*)/g)]
      .flatMap(m => m[1].split(",")).map(s => s.trim()).filter(Boolean))].join(",");
    const wits = [/\[p\. \d+\]/.test(r.here) ? "printed-page(recovered)" : "", /Gwinner/.test(r.here) ? "Gwinner" : "",
      /Zimmern/.test(r.here) ? "Zimmern" : "", /Beer/.test(r.here) ? "Beer" : "",
      /Whittaker/.test(r.here) ? "Whittaker" : "", /Volkelt/.test(r.here) ? "Volkelt" : "",
      /Liepmann/.test(r.here) ? "Liepmann" : ""].filter(Boolean).join(",");
    return [r.id, r.status, r.note || "-", r.title, files || "-", wits || "-", r.ref || "-"].join("\t");
  })
);
if (process.argv.indexOf("--check") >= 0 && bad.length) {
  console.error("off-vocabulary status: " + bad.map(b => b.id + "=" + b.status).join(", "));
  process.exit(1);
}
fs.writeFileSync(OUT, tsv.join("\n") + "\n");

const tally = {};
for (const r of recs) { const s = r.status.startsWith("HIS") ? "HIS" : r.status; tally[s] = (tally[s] || 0) + 1; }
console.log("records (" + SRC.split("/").pop() + "): " + recs.length + "  (statuses: " +
  VOCAB.filter(v => tally[v]).map(v => v + " " + tally[v]).join(", ") + ")");
const cased = recs.filter(r => /file \d\d/.test(r.here)).length;
console.log("records naming a file of this collection: " + cased + " of " + recs.length);
console.log("wrote " + OUT);
