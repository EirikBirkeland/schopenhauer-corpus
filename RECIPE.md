# RECIPE

Standing errand, barebones. Detail: `README.md`.

## The owner's brief

Build and continually update a curated, **tiered** Schopenhauer corpus for a RAG
collection.

- **Tier 1, primary** — his published German originals first, public-domain English
  alongside. Nachlass and letters are *unpublished*; Gespräche *reported*, not primary.
- **Tier 2, secondary** — studies ranked by quotations **checked against the primary
  texts**, not by reputation. Record quote, MATCH / PARTIAL / NO MATCH, and the place.
- **Tier 3, gossip** — popular claims and quotation-book formulas checked against primary
  passages. A claim his texts support stays tier 1.

Every item records German and English title, year, edition and translator, copyright,
source URL, date read, tier. Public-domain texts arrive as UTF-8 plain text, one file per
work, with a header block. Copyrighted editions are catalogued only.

Never estimate. **NO DATA** = searched and not found; **UNVERIFIED** = one source only.
Where editions disagree, show both. Page numbers are only worth their source; section
numbers are not universal; the print's spellings are search terms.

## Sidenotes the owner gave in session

- Gossip means "random books that pretend to speak about Schopenhauer and may only do so
  in part" — collect the **claim**, not the book.
- A loose sayings shelf, so the LLM can defend itself against "those stupid rumors".
- An invented quote ("I detest women, hrmph!") gets tagged, not believed.
- Better than a warning on every line: a **menu** pre-contextualising the search — (1) his
  texts, (2) third-party writers, (3) gossip, "a pack of lies and half-truths". Adopted;
  hence no per-line `LIE:` (`bin/menu.js`).
- "Tier 3, no cap on scope."
- Papers stay barebones: both under 300 words.
- This corpus is its own repo, ready for GitHub; raw scans and working files stay outside.
- Repeatedly AFK: continue autonomously — "you will be rewarded amply."
