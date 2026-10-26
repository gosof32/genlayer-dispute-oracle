# Dispute Resolution Oracle — GenLayer

An **evidence-backed** dispute oracle built as a GenLayer Intelligent Contract with a React frontend that signs through the user's own wallet.

## What changed (review response)

| Review item | Fix |
|---|---|
| Verdicts based only on model common knowledge | Disputes now carry a falsifiable **claim**, objective **acceptance criteria** and an **HTTPS evidence URL**. A respondent can submit a **competing position + evidence**. The contract fetches each source with `gl.nondet.web.render`, the model must cite a **verbatim quote** from the decisive source, and the quote is checked deterministically against the fetched text. Outcome is `SUPPORTED`, `REFUTED` or **`INCONCLUSIVE`** (unverifiable quote, unretrievable/irrelevant evidence, conflicting sources). |
| Independent verification | Custom `gl.vm.run_nondet` validator: each validator **re-fetches the decisive source**, re-verifies the quote, runs its own evaluation, and agrees only on the same outcome. |
| Finalized verdicts overwritable | Strict `PENDING → RESOLVED` transition. `resolve_dispute` on a finalized dispute reverts (`DISPUTE_ALREADY_FINALIZED`). Errors (invalid model output, etc.) **revert** and never write a status. Reassessment is explicit via `request_reassessment` (parties only, once, after finalization, reason + optional new evidence recorded on-chain); every round's verdict is kept in `get_verdict_history`. |
| Hard-coded Hardhat signer | Removed. No private keys, key generation or `localStorage` keys in the frontend. Writes are signed by the user's wallet (MetaMask / EIP-1193) via `createClient({ account: address, provider: window.ethereum })` + `client.connect("studionet")`. |
| Fabricated judgments | Removed all fallbacks and hex→status conversion. Contract responses are strictly decoded (`src/lib/oracle.js`); malformed or failed reads show an explicit error and no verdict. Unknown dispute IDs revert with `DISPUTE_NOT_FOUND` in the contract. |
| Success on tx hash | The UI reports success only after the receipt is **FINALIZED**, consensus agreed and the execution **succeeded** (`src/lib/tx.js`). Failed executions are shown as errors. |
| Tests + verifiable deployment | 48 contract tests + 36 frontend tests, and a scripted Studionet lifecycle with finalized transactions (below). |

## Contract API (`contracts/dispute_resolution_oracle.py`)

Writes
- `create_dispute(claim, acceptance_criteria, evidence_url, respondent) -> id` — `respondent` is an address or `""` (anyone except the claimant may respond).
- `submit_counter_evidence(dispute_id, position, evidence_url)` — respondent only, once, before finalization.
- `resolve_dispute(dispute_id) -> verdict` — only while `PENDING` / `REASSESSMENT_PENDING`.
- `request_reassessment(dispute_id, reason, new_evidence_url) -> new_round` — claimant/respondent, once, after finalization.

Views: `get_dispute`, `get_dispute_status`, `get_verdict_history`, `get_dispute_count`.

Prompt-injection defences: untrusted text is stripped of prompt delimiters and kept inside data blocks, the prompt forbids following embedded instructions and using outside knowledge, quotes that look like instructions are rejected, and any decisive quote must literally exist in the fetched source.

## Verifiable deployment (GenLayer Studionet)

Contract: `0x6b375eA35dad7e417c7D41DAb61457bCf7554558` — full record in [`deployments/studionet.json`](deployments/studionet.json) (all transactions FINALIZED).

| Step | Tx hash | Execution |
|---|---|---|
| deploy | `0xee92b49882d1354981c6766111e93dc458a038324a82bd2dac3fa95c15368a03` | SUCCESS |
| create_dispute #0 | `0xf1e00930fd30f4506e85042bc521b5a224e2ae7a878fca6458717f8712c615bc` | SUCCESS |
| submit_counter_evidence #0 | `0x68c948a8a4a31e84917c1dbed8e05478112a59260b05d2ece60a327d594a7db6` | SUCCESS |
| resolve_dispute #0 → **SUPPORTED** | `0xd4edebbba1374af0127677613d124ee1bcf7f63e1a0fc9dd3e5ab2c2354dc734` | SUCCESS |
| resolve_dispute #0 again (rejected, finalized) | `0x8ff731c52d7cd737982ce3506f0405fa14c534bb454746730645be00037f2f71` | ERROR (expected) |
| create_dispute #1 | `0x40a45ccde1d54e5cc355915caf62b7fc4ee1bc2f4b95b6ecf6c1f165bcfe50ad` | SUCCESS |
| resolve_dispute #1 → **REFUTED** | `0x9ae97ccddde4000078c57c71fa59ab2936f293d747f4102a37bc6ead09e9687d` | SUCCESS |
| create_dispute #2 | `0xcc999ea7cbf67dd3e7e32587f16c3f1bbed6f441baeffdb56c3109a9f6a259bc` | SUCCESS |
| resolve_dispute #2 → **INCONCLUSIVE** | `0x4f005d98a471f3c7feb66f97af0f87e7a3494331a8265932a2a232e6057d0f37` | SUCCESS |
| request_reassessment #2 by non-party (rejected) | `0x8faf55719f1cb0760b7736b10848965b53eb5eda393cd792cea3bceeaca5145b` | ERROR (expected) |

Verify any of them with genlayer-js: `createClient({ chain: studionet }).getTransaction({ hash })`, or read state with `readContract({ address, functionName: "get_dispute", args: [0] })`.

Reproduce: `npm run lifecycle:studionet` (deploys a fresh instance and rewrites `deployments/studionet.json`). The script signs with a throwaway key because it runs headless; the dApp never holds keys.

## Run

```bash
npm install
cp .env.example .env        # set VITE_CONTRACT_ADDRESS
npm run dev                 # connect MetaMask; the app switches it to Studionet
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest                      # contract: evidence verification, invalid model output,
                            # adversarial prompts, finalized-state protection,
                            # reassessment, validator agreement/disagreement
npm test                    # frontend: wallet authorization, no hard-coded signer,
                            # strict decoding, failed reads, finalized-only success
```

Contract tests use `genlayer-test` direct mode (GenVM `v0.2.16` SDK, web and LLM mocked), so they are deterministic and need no node.
