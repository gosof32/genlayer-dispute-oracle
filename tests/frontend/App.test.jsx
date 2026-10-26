import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("genlayer-js", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("genlayer-js/chains", () => ({ studionet: {} }));

const { default: App } = await import("../../src/App.jsx");
const { decodeDispute, decodeHistory } = await import("../../src/lib/oracle.js");
import { CONTRACT, ALICE, rawDispute, rawVerdict } from "./fixtures.js";

const setup = (props = {}) => render(<App contractAddress={CONTRACT} readClient={{}} {...props} />);

describe("App", () => {
  it("shows an explicit configuration error without a contract address", () => {
    render(<App contractAddress="" readClient={{}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("VITE_CONTRACT_ADDRESS");
  });

  it("does not sign anything before the wallet is connected", async () => {
    const writeTx = vi.fn();
    setup({ writeTx });
    await userEvent.type(screen.getByLabelText("Claim"), "c");
    await userEvent.type(screen.getByLabelText("Acceptance criteria"), "k");
    await userEvent.type(screen.getByLabelText("Evidence URL"), "https://a.org");
    await userEvent.click(screen.getByText("Sign & submit"));
    expect(writeTx).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Connect your wallet");
  });

  it("shows the wallet error if the user rejects the connection", async () => {
    setup({ connect: vi.fn().mockRejectedValue(new Error("User rejected the request.")) });
    await userEvent.click(screen.getByText("Connect wallet"));
    expect(await screen.findByRole("alert")).toHaveTextContent("User rejected");
  });

  it("displays an explicit error and NO verdict when the contract read fails", async () => {
    setup({ fetchDispute: vi.fn().mockRejectedValue(new Error("DISPUTE_NOT_FOUND")) });
    await userEvent.type(screen.getByLabelText("Dispute ID"), "7");
    await userEvent.click(screen.getByText("Read"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not read dispute #7: DISPUTE_NOT_FOUND");
    expect(screen.queryByTestId("dispute-detail")).toBeNull();
    expect(document.body.textContent).not.toMatch(/SUPPORTED|RESOLVED_VALID|Bitcoin/);
  });

  it("displays an explicit error when the response is malformed", async () => {
    const fetchDispute = async () => ({ dispute: decodeDispute("0x5245534f4c564544"), history: [] });
    setup({ fetchDispute });
    await userEvent.type(screen.getByLabelText("Dispute ID"), "0");
    await userEvent.click(screen.getByText("Read"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Malformed contract response");
  });

  it("renders a pending dispute without inventing a verdict", async () => {
    setup({ fetchDispute: async () => ({ dispute: decodeDispute(rawDispute()), history: decodeHistory([{ round: 0, verdict: null, reassessment: null }]) }) });
    await userEvent.type(screen.getByLabelText("Dispute ID"), "0");
    await userEvent.click(screen.getByText("Read"));
    expect(await screen.findByTestId("dispute-status")).toHaveTextContent("PENDING");
    expect(screen.getByTestId("no-verdict")).toBeInTheDocument();
  });

  it("resolves through the wallet and reports success only after finalization", async () => {
    const resolved = { dispute: decodeDispute(rawDispute({ status: "RESOLVED", latest_verdict: rawVerdict() })), history: decodeHistory([{ round: 0, verdict: rawVerdict(), reassessment: null }]) };
    const pending = { dispute: decodeDispute(rawDispute()), history: decodeHistory([{ round: 0, verdict: null, reassessment: null }]) };
    const fetchDispute = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(resolved);
    let finish;
    const writeTx = vi.fn(({ onUpdate }) => new Promise((res) => {
      onUpdate({ phase: "signing" });
      onUpdate({ phase: "submitted", hash: "0xabc123abc123" });
      finish = () => { onUpdate({ phase: "finalized", hash: "0xabc123abc123" }); res({}); };
    }));
    setup({ fetchDispute, writeTx, connect: async () => ({ address: ALICE, client: { tag: "wallet" } }) });
    await userEvent.click(screen.getByText("Connect wallet"));
    await userEvent.type(screen.getByLabelText("Dispute ID"), "0");
    await userEvent.click(screen.getByText("Read"));
    await userEvent.click(await screen.findByText("Resolve via GenLayer consensus"));

    expect(writeTx.mock.calls[0][0]).toMatchObject({ walletClient: { tag: "wallet" }, functionName: "resolve_dispute", args: [0] });
    expect(screen.getByRole("status")).toHaveAttribute("data-phase", "submitted");
    expect(screen.getByRole("status")).not.toHaveTextContent("Finalized");

    finish();
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-phase", "finalized"));
    await waitFor(() => expect(screen.getByTestId("verdict")).toHaveTextContent("SUPPORTED"));
  });

  it("shows the failure when the finalized execution failed", async () => {
    const pending = { dispute: decodeDispute(rawDispute()), history: [] };
    const writeTx = vi.fn(async ({ onUpdate }) => {
      onUpdate({ phase: "submitted", hash: "0xdead" });
      throw new Error("Contract execution failed (ERROR): UserError(message='DISPUTE_ALREADY_FINALIZED')");
    });
    setup({ fetchDispute: async () => pending, writeTx, connect: async () => ({ address: ALICE, client: {} }) });
    await userEvent.click(screen.getByText("Connect wallet"));
    await userEvent.type(screen.getByLabelText("Dispute ID"), "0");
    await userEvent.click(screen.getByText("Read"));
    await userEvent.click(await screen.findByText("Resolve via GenLayer consensus"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveAttribute("data-phase", "error"));
    expect(screen.getByRole("status")).toHaveTextContent("DISPUTE_ALREADY_FINALIZED");
  });
});
