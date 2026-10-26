import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const createClient = vi.fn();
vi.mock("genlayer-js", () => ({ createClient: (...a) => createClient(...a) }));
vi.mock("genlayer-js/chains", () => ({ studionet: { id: 61999, name: "studionet" } }));

const { connectWallet, writeAndFinalize } = await import("../../src/lib/wallet.js");
import { receipt, ALICE } from "./fixtures.js";

beforeEach(() => createClient.mockReset());

describe("wallet authorization", () => {
  it("fails clearly when no wallet is installed", async () => {
    await expect(connectWallet(null)).rejects.toThrow(/No browser wallet/);
  });

  it("requests accounts from the wallet and signs through the provider (no key)", async () => {
    const provider = { request: vi.fn().mockResolvedValue([ALICE]) };
    const client = { connect: vi.fn().mockResolvedValue(undefined) };
    createClient.mockReturnValue(client);
    const w = await connectWallet(provider);
    expect(provider.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    const cfg = createClient.mock.calls[0][0];
    expect(cfg.account).toBe(ALICE);           // an address string, not a private-key account
    expect(cfg.provider).toBe(provider);
    expect(client.connect).toHaveBeenCalledWith("studionet");
    expect(w.address).toBe(ALICE);
  });

  it("surfaces a rejected wallet request", async () => {
    const provider = { request: vi.fn().mockRejectedValue(new Error("User rejected the request.")) };
    await expect(connectWallet(provider)).rejects.toThrow("User rejected");
  });

  it("refuses to write without a connected wallet", async () => {
    await expect(writeAndFinalize({ walletClient: null })).rejects.toThrow(/Connect your wallet/);
  });

  it("waits for FINALIZED and fails when execution failed", async () => {
    const walletClient = { writeContract: vi.fn().mockResolvedValue("0xhash") };
    const readClient = { waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt({ exec: "ERROR" })) };
    const phases = [];
    await expect(writeAndFinalize({ walletClient, readClient, address: "0xc", functionName: "resolve_dispute", args: [0], onUpdate: (u) => phases.push(u.phase) }))
      .rejects.toThrow(/execution failed/);
    expect(readClient.waitForTransactionReceipt).toHaveBeenCalledWith(expect.objectContaining({ hash: "0xhash", status: "FINALIZED" }));
    expect(phases).toEqual(["signing", "submitted"]);
  });

  it("reports success only after a successful finalized receipt", async () => {
    const walletClient = { writeContract: vi.fn().mockResolvedValue("0xhash") };
    const readClient = { waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt()) };
    const phases = [];
    await writeAndFinalize({ walletClient, readClient, address: "0xc", functionName: "create_dispute", args: [], onUpdate: (u) => phases.push(u.phase) });
    expect(phases).toEqual(["signing", "submitted", "finalized"]);
  });
});

describe("no hard-coded signer in the frontend", () => {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(e.name) && files.push(p);
  });
  walk(path.resolve(__dirname, "../../src"));

  it.each(files)("%s contains no private key, key generation or local key storage", (file) => {
    const src = fs.readFileSync(file, "utf8");
    expect(src).not.toMatch(/0x[0-9a-fA-F]{64}/);
    expect(src).not.toMatch(/generatePrivateKey|createAccount\s*\(|privateKey|localStorage/);
  });
});
