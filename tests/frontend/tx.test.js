import { describe, it, expect } from "vitest";
import { describeReceipt, assertFinalizedSuccess } from "../../src/lib/tx.js";
import { receipt } from "./fixtures.js";

describe("receipt interpretation (success only after finalized execution)", () => {
  it("accepts FINALIZED + agreed consensus + SUCCESS", () => {
    expect(describeReceipt(receipt()).ok).toBe(true);
  });
  it("rejects a finalized transaction whose execution failed", () => {
    const d = describeReceipt(receipt({ exec: "ERROR" }));
    expect(d.ok).toBe(false);
    expect(d.error).toMatch(/execution failed/);
    expect(d.error).toMatch(/DISPUTE_ALREADY_FINALIZED/);
  });
  it("rejects non-finalized states", () => {
    for (const status of ["PENDING", "ACCEPTED", "UNDETERMINED", "CANCELED"]) {
      expect(describeReceipt(receipt({ status })).ok).toBe(false);
    }
  });
  it("rejects failed consensus", () => {
    expect(describeReceipt(receipt({ consensus: "DISAGREE" })).ok).toBe(false);
  });
  it("supports the non-studio receipt shape", () => {
    expect(describeReceipt({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" }).ok).toBe(true);
    expect(describeReceipt({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_ERROR" }).ok).toBe(false);
  });
  it("throws on missing receipts", () => {
    expect(() => assertFinalizedSuccess(undefined)).toThrow(/No receipt/);
  });
});
