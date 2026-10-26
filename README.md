# Schopenhauer corpus

This repo contains:
1) the original writings of Arthur Schopenhauer (1788–1860)
2) acceptable-quality writings about him
3) gossipy claims made about him

The user can query this data using the included tools.
Suitable for RAG.

The three are kept separate, so you always know whether a quote is his, a scholar's, or hearsay.

When using RAG, ensure the LLM is strictly aware of the hierarchy of reliability.

![SourceTypes.jpg](/SourceTypes.jpg)

## How one may think about mismatches
- When Schopenhauer (1) and scholars (2) agree with one another, we can assume that something about his life is probably true.
- When gossipers (3) disagrees with Schopenhauer (1) and scholars (2), that may be a baseless pernicious or deluded claim made to serve the originator's agenda.
- When scholars (2) and gossipers (3) disagree with Schopenhauer (1), then we should not draw hasty conclusions, but meticulously look into the matter.
- When Schopenhauer (1) and gossipers (3) are aligned, while scholars (2) are not, then it may be worth looking into what's going on. May it be that gossipers' agendas or natural biases happen to coincide with Schopenhauer, while certain scholars find the position to be lacking in evidence?

## The three text types

1. **His own texts** (`texts/`). The published works in the German originals, with public-domain English translations alongside where they exist. Letters and the manuscript remains (*Nachlass*) are his words but were not published by him. Conversations recorded by visitors (*Gespräche*) are his words as others remembered them. Each file states which it is.
2. **Studies of his work** (`texts/secondary/`). Biographies and expositions, ranked by fidelity rather than reputation: the quotations each study attributes to him are checked against shelf 1, and the ranking is in `secondary.txt`.
3. **Claims and sayings** (`gossip.txt`, `quotes.txt`). Popular claims about him and sayings attributed to him. Each carries one verdict, such as his own words, condensed, half true, misattributed or invented, and wherever possible the passage in shelf 1 that settles it.

## Searching

`bin/menu.js` searches one shelf at a time and labels every hit with its shelf, so a claim from shelf 3 can never pass for his own words:

```
node bin/menu.js                      the menu
node bin/menu.js 1 "Die Musik ist"    shelf 1, his texts           hits tagged HIS
node bin/menu.js 2 "Pessimismus"      shelf 2, studies             hits tagged SECONDARY
node bin/menu.js 3 "seamstress"       shelf 3, claims and sayings  hits tagged GOSSIP or SAYING
node bin/menu.js -a "Pudel"           all shelves, each hit tagged
```

`-n N` sets the number of hits (default 6). Each hit gives the file and, where known, the page or section. Matching allows for the old prints: the long s (ſ) and an `f` misread for `s` in the scans are both treated as `s`.

A model given this corpus should search it through the shelves in the same way, never with a flat search over the whole folder.

## Files

- `texts/`: shelf 1, one file per work. Each opens with a header giving the tier, the title in German and English, the year, the edition, the translator, the copyright status, the source URL and the date fetched.
- `texts/secondary/`: shelf 2, in the same format.
- `gossip.txt`, `quotes.txt`: shelf 3, written for reading. `gossip.tsv`, `quotes.tsv`: the same records as tables.
- `catalogue.txt`: every item with its edition, tier and source, the quotation checks, and a log of every change.
- `index.txt`: one line per text, built from the files' own headers.
- `secondary.txt`: the ranking of shelf 2 by quotations found verbatim in shelf 1.
- `pairs.txt`: which English file translates which German one.
- `english-contents.txt`: what each English volume contains, and how far each correspondence has been verified.
- `gaps.txt`: what the collection still lacks.
- `NOTICE.md`: sources and copyright. `LICENSE`: the licence.
- `bin/`: Node.js scripts with no dependencies, runnable from any folder.

## Tools

- `bin/menu.js`: the shelf search above.
- `bin/schop-grep.js`: a plain search over the texts with the same spelling allowances.
- `bin/schop-audit.js`: checks quotations against shelf 1.
- `bin/schop-pages.js`: recovers printed page numbers from the page headers in the scans.
- `bin/schop-pair.js`: compares a translation with its original, passage by passage.
- `bin/schop-texts.js`, `bin/zeno-get.js`, `bin/ia-search.js`, `bin/ia-read.js`, `bin/wikitext-txt.js`: fetch texts and give them their headers.
- `npm run check` validates the headers; `npm run index`, `npm run shelves` and `npm run aids` rebuild `index.txt`, the shelf-3 tables, and `secondary.txt` with `english-contents.txt`.

## Quoting from it

- Page numbers come from the page headers printed in the scans. Where none could be read, the page is left unnumbered, never guessed. A `0` in the index means: cite by section, not page.
- Section numbers belong to an edition. The 1877 collected *Parerga* numbers its sections one ahead of the 1851 first edition, and the English volumes split and reorder the German ones, so a § is cited with its edition.
- Some works exist in two independent English translations, so a quotation names its translator.
- NO DATA means searched and not found. UNVERIFIED means found in only one source.

## Sources and licence

The texts are in the public domain: Schopenhauer died in 1860, and the English translations here were published between 1883 and 1907. The German transcriptions come from zeno.org (the *Zürcher Ausgabe*), de.wikisource.org and scans on archive.org; each file names its source, and `NOTICE.md` has the details. The arrangement, the lists and the scripts are released under the GNU General Public License, version 3 or later: see `LICENSE`.
