import assert from "node:assert/strict";
import { parseBulkPackingLines } from "../utils/bulkParser.js";

const simple = parseBulkPackingLines("Milk\nBread\nCurd", "Food");
assert.equal(simple.valid.length, 3);
assert.equal(simple.invalid.length, 0);
assert.equal(simple.valid[0].category, "Food");

const rich = parseBulkPackingLines("Milk | Food | 2 bottles | buy before trip\n|Food|1|oops");
assert.equal(rich.valid.length, 1);
assert.equal(rich.valid[0].name, "Milk");
assert.equal(rich.valid[0].qty, "2 bottles");
assert.equal(rich.valid[0].note, "buy before trip");
assert.equal(rich.invalid.length, 1);

console.log("bulk parser tests passed");
