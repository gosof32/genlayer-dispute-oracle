# ⚖️ DisputeResolutionOracle — GenLayer Intelligent Contract

A decentralized dispute arbitration primitive built on **GenLayer (v0.2.16)** utilizing live web searches (`gl.web_search`) and LLM consensus (`gl.exec_prompt`) to resolve claims securely on-chain.

## 🚀 How to Run in GenLayer Studio
1. Open [GenLayer Studio](https://studio.genlayer.com).
2. Create a file `DisputeResolutionOracle.py` and paste the code.
3. Click **Deploy**.
4. Call `create_dispute("Bitcoin crossed 100k USD in December 2024")` to submit a claim.
5. Call `resolve_dispute(0)` to trigger multi-validator AI consensus.
6. Call `get_dispute_status(0)` to retrieve the finalized status on-chain.


---

## 🆕 Milestone V2 Updates (`DisputeResolutionOracleV2.py`)
- **Multi-Category Tagging:** Claims can now be categorized (e.g., Crypto, Finance, News) for targeted search context.
- **Staker Attribution:** Tracks the address/account initiating the dispute for future slashing/reward mechanisms.
- **Enhanced LLM Prompting:** Prompt engine now instructs validators to act as domain-specific arbitrators based on the dispute category.
- **Expanded Viewer Method:** `get_dispute_details` returns category, staker address, claim text, and status in a single query.
