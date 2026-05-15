import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWalletActions } from "../../hooks/useWalletActions";
import { JsonOut } from "../../components/ui/JsonOut";
import { btn, card, inputStyle, labelStyle, row } from "../../styles/ui";

export default function ContractsPage() {
  const { session, chainId } = useAuth();
  const { writeContract } = useWalletActions();
  const [contract, setContract] = useState("");
  const [fn, setFn] = useState("");
  const [paramsJson, setParamsJson] = useState(
    '["0x68656c6c6f776f726c6400000000000000000000000000000000000000000000"]',
  );
  const [abiJson, setAbiJson] = useState("");
  const [fromOverride, setFromOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");

  const submit = async () => {
    setBusy(true);
    setOut("");
    try {
      let params: string[];
      const parsed = JSON.parse(paramsJson.trim()) as unknown;
      if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string")) {
        throw new Error("params must be a JSON array of strings");
      }
      params = parsed as string[];

      let abi: unknown[] | undefined;
      if (abiJson.trim()) {
        const a = JSON.parse(abiJson.trim()) as unknown;
        if (!Array.isArray(a)) throw new Error("abi must be a JSON array");
        abi = a as unknown[];
      }

      const cid = parseInt(chainId, 10);
      const fromAddr = (fromOverride.trim() || session?.walletAddress || "").trim();
      if (!fromAddr) throw new Error("fromAddress required");

      const body: Record<string, unknown> = {
        contractAddress: contract.trim(),
        functionName: fn.trim(),
        params,
        fromAddress: fromAddr,
        chainId: cid,
      };
      if (abi?.length) body.abi = abi;

      const data = await writeContract(body);
      setOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Contracts</h1>
        <p className="muted">POST /relayer/write-transaction</p>
      </header>
      <section style={card}>
        <div style={row}>
          <div>
            <div style={labelStyle}>Contract</div>
            <input style={inputStyle} value={contract} onChange={(e) => setContract(e.target.value)} placeholder="0x…" />
          </div>
          <div>
            <div style={labelStyle}>Function</div>
            <input style={inputStyle} value={fn} onChange={(e) => setFn(e.target.value)} />
          </div>
          <div>
            <div style={labelStyle}>Params (JSON strings[])</div>
            <textarea
              style={{ ...inputStyle, minHeight: 72, fontFamily: "monospace", fontSize: 11 }}
              value={paramsJson}
              onChange={(e) => setParamsJson(e.target.value)}
            />
          </div>
          <div>
            <div style={labelStyle}>ABI (optional)</div>
            <textarea
              style={{ ...inputStyle, minHeight: 80, fontFamily: "monospace", fontSize: 10 }}
              value={abiJson}
              onChange={(e) => setAbiJson(e.target.value)}
            />
          </div>
          <div>
            <div style={labelStyle}>From (optional)</div>
            <input
              style={inputStyle}
              value={fromOverride}
              onChange={(e) => setFromOverride(e.target.value)}
              placeholder={session?.walletAddress}
            />
          </div>
        </div>
        <button
          type="button"
          style={btn}
          disabled={busy || !contract.trim() || !fn.trim()}
          onClick={submit}
        >
          {busy ? "Submitting…" : "Write contract"}
        </button>
        {out && <JsonOut label="Result">{out}</JsonOut>}
      </section>
    </div>
  );
}
