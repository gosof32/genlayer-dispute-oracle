export const ALICE = "0x1111111111111111111111111111111111111111";
export const BOB = "0x2222222222222222222222222222222222222222";
export const CONTRACT = "0x34e8127670b688b34C508c23165D68Cf2E998C52";

export const rawDispute = (over = {}) => ({
  id: 0,
  claimant: ALICE,
  respondent: "",
  claim: "Bitcoin began to be used as a currency in 2009.",
  acceptance_criteria: "SUPPORTED if a cited source states 2009.",
  claimant_evidence_url: "https://en.wikipedia.org/api/rest_v1/page/summary/Bitcoin",
  respondent_position: "",
  respondent_evidence_url: "",
  status: "PENDING",
  current_round: 0,
  reassessments_used: 0,
  max_reassessments: 1,
  created_at: "2026-10-25T00:00:00Z",
  latest_verdict: null,
  ...over,
});

export const rawVerdict = (over = {}) => ({
  dispute_id: 0, round: 0, outcome: "SUPPORTED", decisive_source: "claimant",
  decisive_url: "https://en.wikipedia.org/api/rest_v1/page/summary/Bitcoin",
  quote: "Use of bitcoin as a currency began in 2009", reasoning: "Source states 2009.",
  resolved_by: BOB, resolved_at: "2026-10-25T00:01:00Z", ...over,
});

// Studio-style receipts as returned by genlayer-js waitForTransactionReceipt.
export const receipt = ({ status = "FINALIZED", consensus = "MAJORITY_AGREE", exec = "SUCCESS", result } = {}) => ({
  status_name: status,
  result_name: consensus,
  consensus_data: { leader_receipt: [{ execution_result: exec, result: result ?? JSON.stringify({ status: exec === "SUCCESS" ? "return" : "rollback", payload: { readable: exec === "SUCCESS" ? "null" : "UserError(message='DISPUTE_ALREADY_FINALIZED')" } }) }] },
});
