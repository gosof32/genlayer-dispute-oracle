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
# ⚖️ DisputeResolutionOracle — Decentralized Arbitration Platform

A complete dApp and Intelligent Contract primitive built on **GenLayer** that provides autonomous, AI-driven dispute resolution through multi-validator consensus.

---

## 🌟 Architecture & Core Workflow
1. **Intelligent Contract (`DisputeResolutionOracle.py`):** Manages dispute states, stores claims on-chain, and executes non-deterministic AI evaluations using `gl.exec_prompt`.
2. **Frontend Dashboard (`index.html`):** Provides a clean web interface for users to submit claims and trigger decentralized resolution.
3. **GenLayer Consensus:** Eliminates centralized single-point-of-failure oracles by letting validator ensembles evaluate claims collaboratively.

---

## 🚀 How to Test & Run
1. Open [GenLayer Studio](https://studio.genlayer.com).
2. Create `DisputeResolutionOracle.py` and paste the contract code.
3. Deploy the contract instance to the network.
4. Call `create_dispute` to register a claim.
5. Call `resolve_dispute` to trigger validator consensus (`gl.exec_prompt`).
6. Open `index.html` locally to view the frontend interface.
