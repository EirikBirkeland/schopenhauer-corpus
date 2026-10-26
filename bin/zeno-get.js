// usage: node bin/zeno-get.js <zeno-work-url> [out.txt]
// Crawls one Zeno.org work (Zeno holds a work as one page per section) into one
// plain-text file. HTML is stripped, the edition's own page markers ([27] and the
// like) are kept, and Zeno's "Quelle:/Lizenz:/Kategorien:" footer is dropped.
// Zeno serves windows-1252; the output is UTF-8.
// The origin refuses connections at times, so every attempt also tries the
// Wayback Machine copy of the same page (id_ mode = the original bytes).
// env: ZENO_CACHE=dir (per-work cache, makes a rerun cheap), ZENO_PREFIXES="a,b"
const { execSync } = require("child_process");
const fs = require("fs");

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const PREFIXES = (process.env.ZENO_PREFIXES ||
  "http://www.zeno.org,https://web.archive.org/web/2024id_/http://www.zeno.org").split(",");

function sleep(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
  catch (e) { const t = Date.now(); while (Date.now() - t < ms) { } }
}
function tryOne(u, mustContain) {
  let out = "";
  try {
    out = execSync(`curl -sSg -L --connect-timeout 15 --max-time 120 -A ${JSON.stringify(UA)} ${JSON.stringify(u)}`,
      { maxBuffer: 1 << 28, encoding: "buffer" }).toString("latin1");
  } catch (e) { out = (e.stdout || "").toString("latin1"); }
  return (out.length > 500 && (!mustContain || out.includes(mustContain))) ? out : null;
}
function get(path, mustContain) {
  for (let i = 0; i < 8; i++) {
    for (const p of PREFIXES) {
      const out = tryOne(p + path, mustContain);
      if (out) return out;
    }
    sleep(4000);
  }
  throw new Error("gave up on " + path);
}

const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', szlig: "ß", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’", hellip: "…", ndash: "–", mdash: "—", middot: "·", times: "×", laquo: "«", raquo: "»", deg: "°", sect: "§", para: "¶", dagger: "†", agrave: "à", eacute: "é", ccedil: "ç", egrave: "è", oelig: "œ", aacute: "á", iacute: "í", uacute: "ú" };
function decode(t) {
  t = t.replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d));
  t = t.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)));
  t = t.replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENT ? ENT[n] : m));
  return t;
}
function clean(t) {
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6|title)>/gi, "\n");
  t = t.replace(/<(h[1-6])[^>]*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = decode(t);
  t = t.replace(/\u00ad/g, "").replace(/[ \t]+/g, " ");
  t = t.split("\n").map(l => l.replace(/^ /, "").trimEnd()).filter((l, i, a) => l !== "" || (i && a[i - 1] !== ""));
  return t.join("\n").trim();
}
function mainText(html) {
  // Zeno's page is: chrome (zenoCOHeadline + zenoCOHeader with breadcrumb and Amazon links),
  // then <div class="zenoCOMain"> = the text, then <div class="zenoCOFooter"> = Quelle/Lizenz.
  const foot = html.indexOf('class="zenoCOFooter"');
  const end = foot > 0 ? foot : html.length;
  let start = html.indexOf('class="zenoCOMain"');
  if (start >= 0) {
    start = html.indexOf(">", start) + 1;
  } else {                                   // some Zeno works have no zenoCOMain wrapper
    const at = html.indexOf('id="zenoCOText"');
    if (at < 0) throw new Error("zenoCOMain/zenoCOText not found");
    start = html.indexOf(">", at) + 1;
    const hl = chunk => chunk.replace(/<div class="zenoHEParents"[\s\S]*?(<div class="zenoCOHeadline")/, "$1");
    html = hl(html);                          // (kept for the older markup)
  }
  let chunk = html.slice(start, end);
  chunk = chunk.replace(/<[^>]*$/, "");          // the cut can fall inside a tag
  chunk = chunk.replace(/<script[\s\S]*?<\/script>/gi, "");
  return clean(chunk);
}
// the part of a URL below the host, with any Wayback prefix removed
function zenoPath(u) {
  let p = decodeURIComponent(u.replace(/^https?:\/\/[^/]+/, ""));
  const wb = p.match(/^\/web\/[^/]+\/https?:\/\/[^/]+(\/.*)$/);
  if (wb) p = wb[1];
  return p.replace(/\/$/, "");
}
const enc = p => encodeURI(p).replace(/#/g, "%23").replace(/\[/g, "%5B").replace(/\]/g, "%5D");

const workPath = zenoPath(process.argv[2]);
const out = process.argv[3];
let html = get(workPath, "zenoCOHeadline");
const links = [...html.matchAll(/<a href="([^"]+)"/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, ""));
const sections = [];
const seen = new Set();
for (const l of links) {
  const p = decodeURIComponent(l);
  if (!p.startsWith(workPath) || p === workPath || seen.has(p)) continue;
  seen.add(p); sections.push(p);
}
const leaves = sections.filter(p => !sections.some(q => q !== p && q.startsWith(p + "/")));
console.log("work:", workPath);
console.log("sections found:", leaves.length);
leaves.forEach(s => console.log("  -", s.replace(workPath + "/", "")));
if (out) {
  const parts = [], failed = [];
  const cacheDir = (process.env.ZENO_CACHE || "work/schop/zenocache");
  try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) { }
  leaves.forEach((s, n) => {
    const cf = cacheDir + "/" + String(n).padStart(3, "0") + ".html";
    let t = null;
    try {
      let h = fs.existsSync(cf) && fs.statSync(cf).size > 900 ? fs.readFileSync(cf, "latin1") : null;
      if (!h) { h = get(enc(s), 'id="zenoCOText"'); fs.writeFileSync(cf, h, "latin1"); sleep(3000); }
      t = mainText(h);
    } catch (e) { failed.push(s + "  (" + e.message + ")"); }
    if (t !== null) { parts.push("[[SECTION " + s.replace(workPath + "/", "") + "]]\n" + t); process.stderr.write("ok" + t.length + " "); }
    else process.stderr.write("FAIL ");
  });
  fs.writeFileSync(out, parts.join("\n\n"));
  console.log("\nsections ok:", parts.length, " failed:", failed.length);
  failed.forEach(f => console.log("  FAILED " + f));
  console.log("wrote", out, fs.statSync(out).size, "bytes");
}
