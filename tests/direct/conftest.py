import json
import sys
from pathlib import Path

import pytest

GENVM_VERSION = "v0.2.16"  # matches the contract header
CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "dispute_resolution_oracle.py")

CLAIMANT_URL = "https://evidence.example.org/claimant"
RESPONDENT_URL = "https://evidence.example.org/respondent"

ETH_PAGE = (
    "Ethereum - History. The Ethereum network went live on 30 July 2015 "
    "with the Frontier release, after a crowdsale held in 2014."
)
CONTRA_PAGE = (
    "Errata. Contrary to some reports, the Frontier release did not ship in 2014; "
    "the network launched in July 2015."
)

CLAIM = "The Ethereum mainnet launched in 2015."
CRITERIA = (
    "SUPPORTED if a cited source states the Ethereum network went live (Frontier) in 2015; "
    "REFUTED if a cited source states a launch year other than 2015."
)


def llm(outcome, source="claimant", quote="", reasoning="ok"):
    return json.dumps(
        {"outcome": outcome, "decisive_source": source, "quote": quote, "reasoning": reasoning}
    )


@pytest.fixture
def oracle(direct_vm, direct_deploy):
    direct_vm.check_pickling = True
    return direct_deploy(CONTRACT, sdk_version=GENVM_VERSION)


@pytest.fixture
def module(oracle):
    """The loaded contract module, to unit-test its pure helpers."""
    return sys.modules[type(oracle).__module__]


@pytest.fixture
def make_dispute(direct_vm, oracle, direct_alice, direct_bob):
    def _make(respondent=None, claim=CLAIM, criteria=CRITERIA, url=CLAIMANT_URL):
        resp = "" if respondent is None else respondent
        with direct_vm.prank(direct_alice):
            return oracle.create_dispute(claim, criteria, url, resp)
    return _make


def addr_hex(a):
    return a.as_hex.lower()
