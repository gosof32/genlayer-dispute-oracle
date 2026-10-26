// Reproducible end-to-end lifecycle on GenLayer Studionet.
//
//   npm run lifecycle:studionet
//
// Deploys contracts/dispute_resolution_oracle.py, then drives the full
// claim lifecycle and records every transaction hash with its finalized
// status in deployments/studionet.json. This script signs with a throwaway
// key (DEPLOYER_PRIVATE_KEY env var, or a freshly generated one) because it
// runs headless. The dApp itself never holds a key: users sign with their wallet.

import fs from "node:fs";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { describeReceipt } from "../src/lib/tx.js";

const WAIT = { status: "FINALIZED", retries: 200, interval: 3000 };
const claimant = createAccount(process.env.DEPLOYER_PRIVATE_KEY || generatePrivateKey());
const respondent = createAccount(generatePrivateKey());
const outsider = createAccount(generatePrivateKey());
const client = createClient({ chain: studionet });

const log = [];
const json = (v) => JSON.parse(JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)));

async function step(label, account, fn, expectOk = true) {
  process.stdout.write(`- ${label} ... `);
  const hash = await fn(account);
  const receipt = await client.waitForTransactionReceipt({ hash, ...WAIT });
  const d = describeReceipt(receipt);
  const entry = { label, hash, from: account.address, status: d.status, consensus: d.consensus,
    execution: d.execution, ok: d.ok, expected_ok: expectOk, return_value: d.returnValue ?? null, error: d.error };
  log.push(entry);
  console.log(d.ok ? "FINALIZED/SUCCESS" : `FINALIZED/${d.execution} (${d.returnValue ?? d.error})`);
  if (d.ok !== expectOk) throw new Error(`Unexpected outcome for "${label}": ${JSON.stringify(entry)}`);
  return { hash, receipt, d };
}

const write = (address, functionName, args) => (account) =>
  client.writeContract({ account, address, functionName, args, value: 0n });
const read = (address, functionName, args) => client.readContract({ address, functionName, args });

const code = fs.readFileSync(new URL("../contracts/dispute_resolution_oracle.py", import.meta.url), "utf8");

const deploy = await step("deploy contract", claimant, (account) => client.deployContract({ account, code, args: [] }));
const address = deploy.receipt.data?.contract_address ?? deploy.receipt.recipient ?? deploy.receipt.to_address;
console.log(`  contract: ${address}`);

const BTC = "https://en.wikipedia.org/api/rest_v1/page/summary/Bitcoin";
const ETH = "https://en.wikipedia.org/api/rest_v1/page/summary/Ethereum";

// Dispute 0: supported by evidence, contested by a respondent.
await step("create_dispute #0 (supported claim)", claimant, write(address, "create_dispute", [
  "Bitcoin began to be used as a currency in 2009.",
  "SUPPORTED if a cited source states bitcoin use as a currency began in 2009; REFUTED if a cited source gives a different year.",
  BTC, respondent.address,
]));
await step("submit_counter_evidence #0 (respondent)", respondent, write(address, "submit_counter_evidence", [
  0, "Bitcoin was in use as a currency only from 2010.", ETH,
]));
await step("resolve_dispute #0", outsider, write(address, "resolve_dispute", [0]));
await step("resolve_dispute #0 again (must be rejected: finalized)", outsider, write(address, "resolve_dispute", [0]), false);

// Dispute 1: refuted by the cited evidence.
await step("create_dispute #1 (refutable claim)", claimant, write(address, "create_dispute", [
  "The bitcoin white paper was published in 2011.",
  "SUPPORTED if a cited source states the bitcoin white paper was published in 2011; REFUTED if a cited source states it was published in another year.",
  BTC, "",
]));
await step("resolve_dispute #1", outsider, write(address, "resolve_dispute", [1]));

// Dispute 2: evidence silent on the claim -> INCONCLUSIVE (no common-knowledge verdict).
await step("create_dispute #2 (evidence does not cover claim)", claimant, write(address, "create_dispute", [
  "The Ethereum mainnet launched in 2015.",
  "SUPPORTED if a cited source states the Ethereum network launched in 2015; REFUTED if a cited source states another launch year.",
  ETH, "",
]));
await step("resolve_dispute #2", outsider, write(address, "resolve_dispute", [2]));

// Auditable reassessment of dispute 2 with better evidence... but only a party may ask.
await step("request_reassessment #2 by outsider (must be rejected)", outsider, write(address, "request_reassessment", [
  2, "I disagree", "",
]), false);

const disputes = [];
for (const id of [0, 1, 2]) {
  disputes.push({ dispute: json(await read(address, "get_dispute", [id])), history: json(await read(address, "get_verdict_history", [id])) });
}

const out = {
  network: "studionet",
  rpc: studionet.rpcUrls.default.http[0],
  contract: address,
  generated_at: new Date().toISOString(),
  transactions: log,
  final_state: disputes,
};
fs.mkdirSync(new URL("../deployments/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../deployments/studionet.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("\nWrote deployments/studionet.json");
for (const { dispute } of disputes) {
  console.log(`  #${dispute.id} ${dispute.status} -> ${dispute.latest_verdict?.outcome}  quote: ${dispute.latest_verdict?.quote}`);
}
