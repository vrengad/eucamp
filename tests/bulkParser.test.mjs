import assert from "node:assert/strict";
import { parseBulkPackingLines } from "../utils/bulkParser.js";

// ── 1. Simple name-only lines with stickyCategory ──────────────
const simple = parseBulkPackingLines("Milk\nBread\nCurd", "Food");
assert.equal(simple.valid.length, 3);
assert.equal(simple.invalid.length, 0);
assert.equal(simple.valid[0].category, "Food");
assert.equal(simple.valid[1].name, "Bread");
assert.equal(simple.valid[2].name, "Curd");
// Each name-only line should default qty and note to ""
assert.equal(simple.valid[0].qty, "");
assert.equal(simple.valid[0].note, "");

// ── 2. Rich line with all pipe-separated fields ────────────────
const rich = parseBulkPackingLines("Milk | Food | 2 bottles | buy before trip\n|Food|1|oops");
assert.equal(rich.valid.length, 1);
assert.equal(rich.valid[0].name, "Milk");
assert.equal(rich.valid[0].category, "Food");
assert.equal(rich.valid[0].qty, "2 bottles");
assert.equal(rich.valid[0].note, "buy before trip");
assert.equal(rich.invalid.length, 1);
// The invalid line should report missing name
assert.equal(rich.invalid[0].lineNo, 2);
assert.equal(rich.invalid[0].reason, "Missing item name");

// ── 3. Empty input ─────────────────────────────────────────────
const empty = parseBulkPackingLines("");
assert.equal(empty.valid.length, 0);
assert.equal(empty.invalid.length, 0);

// ── 4. Whitespace-only and blank lines are skipped ─────────────
const blanks = parseBulkPackingLines("  \n\n  \n", "Food");
assert.equal(blanks.valid.length, 0);
assert.equal(blanks.invalid.length, 0);

// ── 5. Tabs are normalized to spaces ───────────────────────────
const tabbed = parseBulkPackingLines("Towel\t|\tHygiene\t|\t3\t|\tbig ones");
assert.equal(tabbed.valid.length, 1);
assert.equal(tabbed.valid[0].name, "Towel");
assert.equal(tabbed.valid[0].category, "Hygiene");
assert.equal(tabbed.valid[0].qty, "3");
assert.equal(tabbed.valid[0].note, "big ones");

// ── 6. Category falls back to stickyCategory when empty ────────
const fallback = parseBulkPackingLines("Soap |  | 1 bar", "Hygiene");
assert.equal(fallback.valid.length, 1);
assert.equal(fallback.valid[0].name, "Soap");
assert.equal(fallback.valid[0].category, "Hygiene");
assert.equal(fallback.valid[0].qty, "1 bar");

// ── 7. Category falls back to "Other" when no stickyCategory ──
const noSticky = parseBulkPackingLines("Soap |  | 1 bar");
assert.equal(noSticky.valid.length, 1);
assert.equal(noSticky.valid[0].category, "Other");

// ── 8. Name-only line defaults to "Other" without stickyCategory
const nameOnly = parseBulkPackingLines("Blanket");
assert.equal(nameOnly.valid.length, 1);
assert.equal(nameOnly.valid[0].name, "Blanket");
assert.equal(nameOnly.valid[0].category, "Other");
assert.equal(nameOnly.valid[0].qty, "");
assert.equal(nameOnly.valid[0].note, "");

// ── 9. Missing name with pipe separator → invalid ──────────────
const missingName = parseBulkPackingLines("| Food | 2");
assert.equal(missingName.valid.length, 0);
assert.equal(missingName.invalid.length, 1);
assert.equal(missingName.invalid[0].lineNo, 1);
assert.equal(missingName.invalid[0].reason, "Missing item name");

// ── 10. Mixed valid and invalid lines ──────────────────────────
const mixed = parseBulkPackingLines(
  "Sunscreen | Health | 1 bottle\n| | |\nHat | Clothing\n  \n|| qty_only"
);
assert.equal(mixed.valid.length, 2);
assert.equal(mixed.invalid.length, 2);
assert.equal(mixed.valid[0].name, "Sunscreen");
assert.equal(mixed.valid[0].category, "Health");
assert.equal(mixed.valid[0].qty, "1 bottle");
assert.equal(mixed.valid[1].name, "Hat");
assert.equal(mixed.valid[1].category, "Clothing");
// Missing-name invalids
assert.equal(mixed.invalid[0].lineNo, 2);
assert.equal(mixed.invalid[1].lineNo, 4);

// ── 11. Qty and note default to "" when omitted after pipe ─────
const partial = parseBulkPackingLines("Tent | Camping Gear");
assert.equal(partial.valid.length, 1);
assert.equal(partial.valid[0].name, "Tent");
assert.equal(partial.valid[0].category, "Camping Gear");
assert.equal(partial.valid[0].qty, "");
assert.equal(partial.valid[0].note, "");

// ── 12. Extra pipe-separated fields are preserved ──────────────
const extra = parseBulkPackingLines("Knife | Kitchen | 1 | sharp | extra field");
assert.equal(extra.valid.length, 1);
assert.equal(extra.valid[0].name, "Knife");
assert.equal(extra.valid[0].note, "sharp");

// ── 13. Leading/trailing whitespace in fields is trimmed ───────
const spacy = parseBulkPackingLines("  Pillow  |  Sleeping  |  2  |  soft  ");
assert.equal(spacy.valid.length, 1);
assert.equal(spacy.valid[0].name, "Pillow");
assert.equal(spacy.valid[0].category, "Sleeping");
assert.equal(spacy.valid[0].qty, "2");
assert.equal(spacy.valid[0].note, "soft");

// ── 14. Multiple invalid lines get correct lineNo ──────────────
const multiInvalid = parseBulkPackingLines("| Food\n| Health\n| Clothing");
assert.equal(multiInvalid.invalid.length, 3);
assert.equal(multiInvalid.invalid[0].lineNo, 1);
assert.equal(multiInvalid.invalid[1].lineNo, 2);
assert.equal(multiInvalid.invalid[2].lineNo, 3);
multiInvalid.invalid.forEach((entry) => {
  assert.equal(entry.reason, "Missing item name");
});

// ── 15. Line number accounts for blank lines being filtered ────
const gapped = parseBulkPackingLines("Apple\n\n\n| Food");
assert.equal(gapped.valid.length, 1);
assert.equal(gapped.valid[0].name, "Apple");
// After filtering blanks, "|Food" is the 2nd non-empty line
assert.equal(gapped.invalid.length, 1);
assert.equal(gapped.invalid[0].lineNo, 2);

// ── 16. stickyCategory used on name-only but not on piped lines
const stickyMix = parseBulkPackingLines("Water\nJuice | Drinks | 1L", "Food");
assert.equal(stickyMix.valid.length, 2);
assert.equal(stickyMix.valid[0].category, "Food");   // name-only → sticky
assert.equal(stickyMix.valid[1].category, "Drinks");  // explicit category wins

console.log("bulk parser tests passed");
