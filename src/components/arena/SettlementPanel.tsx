import { useEffect, useState } from "react";
import { useWalletActions } from "../../hooks/useWalletActions";
import type { ArenaRoom } from "../../lib/arenaTypes";
import { JsonOut } from "../ui/JsonOut";
import { btn, btnGhost, card, inputStyle, labelStyle } from "../../styles/ui";

type PayMode = "native" | "gasless";

type Props = {
  room: ArenaRoom;
  myAddress: string;
  winnerAddress: string;
  loserAddress: string;
};

export function SettlementPanel({ room, myAddress, winnerAddress, loserAddress }: Props) {
  const { sendNative, sendGasless, fetchNativeBalance, balanceOut, balBusy } = useWalletActions();
  const [mode, setMode] = useState<PayMode>("native");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [paidVia, setPaidVia] = useState<PayMode | null>(null);

  const [gaslessNative, setGaslessNative] = useState(true);
  const [tokenAddress, setTokenAddress] = useState(
    "0x5aEC77A2CBE8ee9D359F965826BdDFa026DfFb38",
  );
  const [tokenDecimals, setTokenDecimals] = useState("18");

  const iLost =
    myAddress.toLowerCase() === loserAddress.toLowerCase() && room.winner !== "draw";
  const iWon = myAddress.toLowerCase() === winnerAddress.toLowerCase() && room.winner !== "draw";

  const stakeLabel = `${room.stake} ${room.currency}`;
  const refNo = `arena-settle-${room.id}`;

  useEffect(() => {
    if (iLost) void fetchNativeBalance();
  }, [iLost, fetchNativeBalance]);

  const payNative = async () => {
    setBusy(true);
    setOut("");
    try {
      const data = await sendNative(winnerAddress, room.stake, room.currency);
      setOut(JSON.stringify(data, null, 2));
      setPaidVia("native");
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const payGasless = async () => {
    setBusy(true);
    setOut("");
    try {
      const data = await sendGasless({
        to: winnerAddress,
        amount: room.stake,
        native: gaslessNative,
        tokenAddress: gaslessNative ? undefined : tokenAddress,
        tokenDecimals: parseInt(tokenDecimals, 10),
        currency: room.currency,
        nativeCurrency: room.currency,
        referenceNo: refNo,
      });
      setOut(JSON.stringify(data, null, 2));
      setPaidVia("gasless");
    } catch (e) {
      setOut(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  if (room.winner === "draw") {
    return (
      <section style={card} className="settle-panel">
        <h3>Draw</h3>
        <p className="muted">No stake transfer — play again?</p>
      </section>
    );
  }

  return (
    <section style={card} className="settle-panel">
      <h3>Settlement</h3>
      <p className="muted small">
        Loser pays <strong>{stakeLabel}</strong> to the winner.
      </p>
      <p className="mono break">
        <span className="label">Winner</span>
        <br />
        {winnerAddress}
      </p>

      {iWon && <p className="settle-win">You won — wait for the loser to send the stake.</p>}

      {iLost && (
        <>
          {paidVia ? (
            <p className="settle-win">
              Payment submitted via {paidVia === "native" ? "native transfer" : "gasless relayer"}.
            </p>
          ) : (
            <>
              <p className="label" style={{ marginTop: 16 }}>
                Choose how to pay
              </p>
              <div className="arena-tabs settle-tabs">
                <button
                  type="button"
                  className={mode === "native" ? "tab active" : "tab"}
                  onClick={() => setMode("native")}
                >
                  Native (you pay gas)
                </button>
                <button
                  type="button"
                  className={mode === "gasless" ? "tab active" : "tab"}
                  onClick={() => setMode("gasless")}
                >
                  Gasless (relayer)
                </button>
              </div>

              {mode === "native" && (
                <div className="settle-option">
                  <p className="muted small">
                    <code>POST /v2/wallet/send-transaction</code> — sends {stakeLabel} from your custodial
                    wallet. Requires enough native coin for amount + gas.
                  </p>
                  {balanceOut && (
                    <JsonOut label="Your native balance (hint)">{balanceOut}</JsonOut>
                  )}
                  <button
                    type="button"
                    style={btn}
                    disabled={busy || balBusy}
                    onClick={payNative}
                  >
                    {busy ? "Sending…" : `Pay ${stakeLabel} (native)`}
                  </button>
                </div>
              )}

              {mode === "gasless" && (
                <div className="settle-option">
                  <p className="muted small">
                    <code>POST /relayer/send-transaction</code> — sponsor pays gas when your project gas
                    tank is configured. Use native or ERC-20 depending on what you hold.
                  </p>
                  <label
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 12,
                      fontSize: 14,
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={gaslessNative}
                      onChange={(e) => setGaslessNative(e.target.checked)}
                    />
                    Gasless native ({room.currency})
                  </label>
                  {!gaslessNative && (
                    <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={labelStyle}>ERC-20 token contract</div>
                        <input
                          style={inputStyle}
                          value={tokenAddress}
                          onChange={(e) => setTokenAddress(e.target.value)}
                          placeholder="0x…"
                        />
                      </div>
                      <div style={{ maxWidth: 120 }}>
                        <div style={labelStyle}>Decimals</div>
                        <input
                          style={inputStyle}
                          value={tokenDecimals}
                          onChange={(e) => setTokenDecimals(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    style={btn}
                    disabled={busy || (!gaslessNative && !tokenAddress.trim())}
                    onClick={payGasless}
                  >
                    {busy ? "Sending…" : `Pay ${stakeLabel} (gasless)`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!iLost && !iWon && (
        <p className="muted small">Spectating — only the loser signs the transfer.</p>
      )}

      {out && <JsonOut label="Transaction result">{out}</JsonOut>}

      {iLost && !paidVia && (
        <button
          type="button"
          style={{ ...btnGhost, marginTop: 12 }}
          disabled={balBusy}
          onClick={() => void fetchNativeBalance()}
        >
          {balBusy ? "Refreshing…" : "Refresh native balance"}
        </button>
      )}
    </section>
  );
}
