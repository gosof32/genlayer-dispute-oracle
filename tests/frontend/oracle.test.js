import { describe, it, expect, vi } from "vitest";
import { decodeDispute, decodeHistory, fetchDispute, parseDisputeId, ContractDataError } from "../../src/lib/oracle.js";
import { rawDispute, rawVerdict } from "./fixtures.js";

describe("strict decoding of contract responses", () => {
  it("decodes a dispute and its verdict", () => {
    const d = decodeDispute(rawDispute({ status: "RESOLVED", latest_verdict: rawVerdict() }));
    expect(d.status).toBe("RESOLVED");
    expect(d.latestVerdict.outcome).toBe("SUPPORTED");
  });
  it("decodes Map / bigint responses (raw calldata)", () => {
    const m = new Map(Object.entries(rawDispute({ id: 3n, current_round: 0n, reassessments_used: 0n, max_reassessments: 1n })));
    expect(decodeDispute(m).id).toBe(3);
  });
  it.each([
    ["hex string", "0x5245534f4c5645445f56414c4944"],
    ["null", null],
    ["unknown status", rawDispute({ status: "RESOLVED_VALID" })],
    ["unknown outcome", rawDispute({ status: "RESOLVED", latest_verdict: rawVerdict({ outcome: "VALID" }) })],
    ["missing field", (({ claim, ...rest }) => rest)(rawDispute())],
  ])("rejects malformed response: %s", (_, raw) => {
    expect(() => decodeDispute(raw)).toThrow(ContractDataError);
  });
  it("rejects malformed history", () => {
    expect(() => decodeHistory({})).toThrow(ContractDataError);
  });
  it("validates dispute ids", () => {
    expect(parseDisputeId("4")).toBe(4);
    for (const bad of ["", "-1", "1.5", "abc"]) expect(() => parseDisputeId(bad)).toThrow();
  });
});

describe("failed contract reads", () => {
  it("propagates RPC errors instead of substituting data", async () => {
    const readClient = { readContract: vi.fn().mockRejectedValue(new Error("DISPUTE_NOT_FOUND")) };
    await expect(fetchDispute(readClient, "0xabc", 9)).rejects.toThrow("DISPUTE_NOT_FOUND");
  });
});
