# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing


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
        # Mengambil data klaim
        claim_info = self.disputes[dispute_id]

        # Fungsi helper non-deterministik mengikuti pola resmi GenLayer
        def evaluate_claim() -> typing.Any:
            task = f"""
            Analyze this claim: "{claim_info}"
            Is this claim generally VALID or INVALID based on common knowledge and facts?
            Respond strictly in the following JSON format:
            {{
                "status": "VALID" or "INVALID"
            }}
            Do not include any extra text or formatting prefix/suffix.
            """
            
            result_str = (
                gl.nondet.exec_prompt(task)
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )
            return json.loads(result_str)

        try:
            # Menggunakan prinsip konsensus strict_eq seperti pada contoh resmi
            consensus_result = gl.eq_principle.strict_eq(evaluate_claim)
            final_status = consensus_result.get("status", "RESOLVED_VALID")
            
            if final_status == "VALID":
                self.dispute_statuses[dispute_id] = "RESOLVED_VALID"
            else:
                self.dispute_statuses[dispute_id] = "RESOLVED_INVALID"
                
        except Exception as err:
            error_msg = f"ERR: {str(err)[:45]}"
            self.dispute_statuses[dispute_id] = error_msg
            return error_msg

        return self.dispute_statuses[dispute_id]

    @gl.public.view
    def get_dispute_status(self, dispute_id: u256) -> str:
        claim = self.disputes[dispute_id]
        status = self.dispute_statuses[dispute_id]
        return f"Claim: {claim} | Status: {status}"
