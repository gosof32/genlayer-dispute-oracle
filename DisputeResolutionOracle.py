# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class DisputeResolutionOracle(gl.Contract):
    disputes: TreeMap[u256, str]
    dispute_statuses: TreeMap[u256, str]
    total_disputes: u256

    def __init__(self):
        self.disputes = TreeMap()
        self.dispute_statuses = TreeMap()
        self.total_disputes = u256(0)

    @gl.public.write
    def create_dispute(self, claim_details: str) -> u256:
        dispute_id = self.total_disputes
        self.disputes[dispute_id] = claim_details
        self.dispute_statuses[dispute_id] = "PENDING"
        self.total_disputes = u256(int(self.total_disputes) + 1)
        return dispute_id

    @gl.public.write
    def resolve_dispute(self, dispute_id: u256) -> str:
        claim_info = self.disputes[dispute_id]

        # Menggunakan exec_prompt langsung agar validator lebih mudah mencapai konsensus
        prompt = f"""
        Analyze this claim: "{claim_info}"
        Is this claim generally VALID or INVALID based on common knowledge and facts?
        Respond strictly with one word: VALID or INVALID.
        """

        try:
            consensus_result = str(gl.exec_prompt(prompt)).strip().upper()
        except Exception:
            consensus_result = "VALID"

        if "VALID" in consensus_result:
            self.dispute_statuses[dispute_id] = "RESOLVED_VALID"
        else:
            self.dispute_statuses[dispute_id] = "RESOLVED_INVALID"

        return self.dispute_statuses[dispute_id]

    @gl.public.view
    def get_dispute_status(self, dispute_id: u256) -> str:
        claim = self.disputes[dispute_id]
        status = self.dispute_statuses[dispute_id]
        return f"Claim: {claim} | Status: {status}"
