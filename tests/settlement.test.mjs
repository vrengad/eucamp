import assert from "node:assert/strict";
import { summarizeExpenses, buildSettlement } from "../utils/settlement.js";

const families = ["a", "b", "c"];

const data = [
  { amount: 90, paidBy: "a", sharedWith: ["a", "b", "c"] },
  { amount: 30, paidBy: "b", sharedWith: ["a", "b"] }
];

const summary = summarizeExpenses(data, families);
assert.equal(summary.paidTotals.a, 90);
assert.equal(summary.paidTotals.b, 30);
assert.equal(summary.paidTotals.c, 0);

assert.equal(summary.owedTotals.a, 45);
assert.equal(summary.owedTotals.b, 45);
assert.equal(summary.owedTotals.c, 30);

assert.equal(summary.net.a, 45);
assert.equal(summary.net.b, -15);
assert.equal(summary.net.c, -30);

const settlement = buildSettlement(summary.net);
assert.deepEqual(settlement, [
  { from: "c", to: "a", amount: 30 },
  { from: "b", to: "a", amount: 15 }
]);

console.log("settlement tests passed");
