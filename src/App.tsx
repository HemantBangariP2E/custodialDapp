import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { apiPost, createWalletApiBase, relayerWriteApiBase } from "./api";
import {
  CHAIN_OPTIONS,
  DEFAULT_CHAIN,
  optionKey,
  type ChainOption,
} from "./chains";
import { postRelayerSendTransaction } from "./relayer-client";
import {
  createCustodialWallet,
  registerGasTankCustomWallet,
  sendAuthEmailOtp,
  verifyAuthEmailOtp,
  type ChainContext,
} from "./wallet-auth-flow";

type Session = {
  apiKey: string;
  userId: string;
  walletAddress: string;
  email?: string;
  blockchain?: string;
  network?: string;
  chainIdStr?: string;
};

const STORAGE = "custodial-demo-session-v1";

function loadSession(): Session | null {
  try {
    const s = sessionStorage.getItem(STORAGE);
    if (!s) return null;
    const o = JSON.parse(s);
    if (o?.apiKey && o?.userId && o?.walletAddress) return o as Session;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(s: Session | null) {
  if (!s) sessionStorage.removeItem(STORAGE);
  else sessionStorage.setItem(STORAGE, JSON.stringify(s));
}

const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.25rem",
  marginBottom: "1rem",
};

const row: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  marginBottom: "0.75rem",
};

const labelStyle: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--muted)",
  marginBottom: 4,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0f1117",
  color: "var(--text)",
};

const btn: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
const btnGhost: CSSProperties = {
  ...btn,
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text)",
};
const btnDanger: CSSProperties = {
  ...btnGhost,
  borderColor: "#7f1d1d",
  color: "#fca5a5",
};

function Out({ label, children }: { label: string; children: ReactNode }) {
  return (
    <pre
      style={{
        ...card,
        fontSize: 12,
        overflow: "auto",
        maxHeight: 220,
        margin: "0.75rem 0 0",
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>{label}</strong>
      {children}
    </pre>
  );
}

export default function App() {
  const initial = useMemo(() => loadSession(), []);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [selectedChain, setSelectedChain] = useState<ChainOption | null>(() => {
    if (initial?.blockchain && initial?.network && initial?.chainIdStr) {
      return {
        blockchain: initial.blockchain,
        network: initial.network,
        chainId: initial.chainIdStr,
      };
    }
    return DEFAULT_CHAIN;
  });

  const [session, setSession] = useState<Session | null>(() => {
    const s = initial;
    return s?.walletAddress ? s : null;
  });

  const [signInEmail, setSignInEmail] = useState(initial?.email ?? initial?.userId ?? "");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendOtpBusy, setSendOtpBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authStep, setAuthStep] = useState<"idle" | "otp_sent" | "verified">("idle");
  const [registerGasTank, setRegisterGasTank] = useState(true);
  const [gasTankLog, setGasTankLog] = useState("");

  const [chainId, setChainId] = useState(
    () => initial?.chainIdStr ?? DEFAULT_CHAIN.chainId,
  );
  const [createBusy, setCreateBusy] = useState(false);
  const [createLog, setCreateLog] = useState("");

  const [balanceOut, setBalanceOut] = useState("");
  const [balBusy, setBalBusy] = useState(false);

  const [toAddr, setToAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendOut, setSendOut] = useState("");

  const [gaslessTo, setGaslessTo] = useState("");
  const [gaslessAmount, setGaslessAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState(
    "0x5aEC77A2CBE8ee9D359F965826BdDFa026DfFb38",
  );
  const [tokenDecimals, setTokenDecimals] = useState("18");
  const [gaslessReferenceNo, setGaslessReferenceNo] = useState("");
  const [gaslessNative, setGaslessNative] = useState(false);
  const [gaslessNativeCurrency, setGaslessNativeCurrency] = useState("ETH");
  const [gaslessBusy, setGaslessBusy] = useState(false);
  const [gaslessOut, setGaslessOut] = useState("");
  const [gaslessTokenBalBusy, setGaslessTokenBalBusy] = useState(false);
  const [gaslessTokenBalOut, setGaslessTokenBalOut] = useState("");

  const [writeContract, setWriteContract] = useState("");
  const [writeFunction, setWriteFunction] = useState("");
  const [writeParamsJson, setWriteParamsJson] = useState(
    '["0x68656c6c6f776f726c6400000000000000000000000000000000000000000000"]',
  );
  const [writeAbiJson, setWriteAbiJson] = useState("");
  const [writeFromOverride, setWriteFromOverride] = useState("");
  const [writeBusy, setWriteBusy] = useState(false);
  const [writeOut, setWriteOut] = useState("");

  const cfg = useMemo(
    () => ({ apiKey: session?.apiKey ?? apiKey }),
    [session, apiKey],
  );

  const disconnect = () => {
    saveSession(null);
    setSession(null);
    setBalanceOut("");
    setSendOut("");
    setGaslessOut("");
    setGaslessTokenBalOut("");
    setWriteOut("");
    setCreateLog("");
    setOtp("");
    setOtpSent(false);
    setAuthMessage("");
    setAuthStep("idle");
    setGasTankLog("");
    setSignInEmail("");
    setSelectedChain(DEFAULT_CHAIN);
    setChainId(DEFAULT_CHAIN.chainId);
  };

  const chainContext = useCallback((): ChainContext | null => {
    if (!selectedChain) return null;
    return {
      blockchain: selectedChain.blockchain,
      network: selectedChain.network,
      chainId: selectedChain.chainId,
    };
  }, [selectedChain]);

  const finishSessionWithAddress = useCallback(
    (sess: Session, chain: ChainOption, addr: string) => {
      const next: Session = {
        ...sess,
        walletAddress: addr,
        blockchain: chain.blockchain,
        network: chain.network,
        chainIdStr: chain.chainId,
      };
      setSession(next);
      saveSession(next);
      setChainId(chain.chainId);
      setAuthStep("verified");
    },
    [],
  );

  const createCustodialWalletWith = useCallback(
    async (sess: Session, chain: ChainOption) => {
      setCreateBusy(true);
      setBalanceOut("");
      setCreateLog("");
      setGasTankLog("");
      try {
        const { address, raw } = await createCustodialWallet(
          { apiKey: sess.apiKey },
          { userId: sess.userId, chain },
        );
        finishSessionWithAddress(sess, chain, address);
        setCreateLog(JSON.stringify(raw, null, 2));

        if (registerGasTank) {
          try {
            const gt = await registerGasTankCustomWallet(
              { apiKey: sess.apiKey },
              { userId: sess.userId, walletAddress: address },
            );
            setGasTankLog(JSON.stringify(gt, null, 2));
          } catch (e) {
            setGasTankLog(`Gas tank register skipped/failed: ${(e as Error).message}`);
          }
        }
      } catch (e) {
        setCreateLog(String((e as Error).message));
        throw e;
      } finally {
        setCreateBusy(false);
      }
    },
    [finishSessionWithAddress, registerGasTank],
  );

  const retryCreateWallet = async () => {
    if (!session?.apiKey || !session.userId || !selectedChain) return;
    await createCustodialWalletWith(session, selectedChain);
  };

  const sendEmailOtp = async () => {
    const k = apiKey.trim();
    const em = signInEmail.trim().toLowerCase();
    const chain = chainContext();
    if (!k || !em) {
      setAuthMessage("API key and email are required.");
      return;
    }
    if (!chain) {
      setAuthMessage("Choose a blockchain / network from the dropdown.");
      return;
    }
    setSendOtpBusy(true);
    setAuthMessage("");
    try {
      await sendAuthEmailOtp(
        { apiKey: k },
        {
          email: em,
          userId: em,
          blockchain: chain.blockchain,
          network: chain.network,
          walletType: "CUSTODIAL",
        },
      );
      setOtpSent(true);
      setAuthStep("otp_sent");
      setAuthMessage("OTP sent. Check your email, then enter the 4-digit code.");
    } catch (e) {
      setAuthMessage(String((e as Error).message));
    } finally {
      setSendOtpBusy(false);
    }
  };

  const verifyOtpAndCreateWallet = async () => {
    const k = apiKey.trim();
    const em = signInEmail.trim().toLowerCase();
    const code = otp.trim();
    const chain = chainContext();
    if (!k || !em || code.length !== 4) {
      setAuthMessage("Enter API key, email, and 4-digit OTP.");
      return;
    }
    if (!chain) {
      setAuthMessage("Select a blockchain / network before verifying.");
      return;
    }
    setVerifyBusy(true);
    setAuthMessage("");
    setCreateLog("");
    setGasTankLog("");
    try {
      const verify = await verifyAuthEmailOtp(
        { apiKey: k },
        {
          email: em,
          userId: em,
          otp: code,
          blockchain: chain.blockchain,
          network: chain.network,
          walletType: "CUSTODIAL",
        },
      );

      if (!verify.verified) {
        throw new Error("OTP verification did not succeed.");
      }

      const baseSession: Session = {
        apiKey: k,
        userId: em,
        walletAddress: "",
        email: em,
      };
      setSession(baseSession);

      if (verify.existingWalletAddress) {
        finishSessionWithAddress(baseSession, chain, verify.existingWalletAddress);
        setCreateLog(JSON.stringify(verify.raw, null, 2));
        setAuthMessage(
          verify.walletExists
            ? "Existing custodial wallet found — signed in without creating a new one."
            : "Signed in with existing wallet.",
        );
        return;
      }

      await createCustodialWalletWith(baseSession, chain);
      setAuthMessage(
        registerGasTank
          ? "Email verified, custodial wallet created, gas tank registration attempted."
          : "Email verified and custodial wallet created.",
      );
    } catch (e) {
      setAuthMessage(String((e as Error).message));
    } finally {
      setVerifyBusy(false);
    }
  };

  const fetchBalance = async () => {
    if (!session?.walletAddress || !session.apiKey) return;
    setBalBusy(true);
    try {
      const cid = parseInt(chainId, 10);
      const data = await apiPost(
        "v2/wallet/balance",
        {
          address: session.walletAddress,
          chainId: cid,
          currency: "ETH",
        },
        cfg,
        { baseUrl: createWalletApiBase() },
      );
      setBalanceOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setBalanceOut(String((e as Error).message));
    } finally {
      setBalBusy(false);
    }
  };

  const sendStandard = async () => {
    if (!session?.walletAddress) return;
    setSendBusy(true);
    setSendOut("");
    try {
      const cid = parseInt(chainId, 10);
      const am = Number(amount);
      const data = await apiPost(
        "v2/wallet/send-transaction",
        {
          address: session.walletAddress,
          to: toAddr.trim(),
          amount: Number.isFinite(am) ? am : 0,
          chainId: cid,
          currency: currency.trim() || "ETH",
          userShard: "",
          userIndentity: "",
        },
        cfg,
        { baseUrl: createWalletApiBase() },
      );
      setSendOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setSendOut(String((e as Error).message));
    } finally {
      setSendBusy(false);
    }
  };

  /** Same `balanceOf` the relayer uses — not native ETH. */
  const fetchGaslessTokenBalance = async () => {
    if (!session?.walletAddress || gaslessNative) return;
    const tok = tokenAddress.trim();
    if (!tok) {
      setGaslessTokenBalOut("Set a token contract address first.");
      return;
    }
    setGaslessTokenBalBusy(true);
    setGaslessTokenBalOut("");
    try {
      const cid = parseInt(chainId, 10);
      const data = await apiPost(
        "v2/wallet/balance",
        {
          address: session.walletAddress,
          chainId: cid,
          currency: currency.trim() || "ETH",
          smartContractAddress: tok,
        },
        cfg,
        { baseUrl: createWalletApiBase() },
      );
      setGaslessTokenBalOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setGaslessTokenBalOut(String((e as Error).message));
    } finally {
      setGaslessTokenBalBusy(false);
    }
  };

  /** `POST /relayer/send-transaction` — custodial gasless (ERC-20 with permit or native). */
  const sendGaslessRelayer = async () => {
    if (!session?.walletAddress) {
      setGaslessOut("No custodial wallet in session. Sign in and create wallet first.");
      return;
    }
    if (!cfg.apiKey?.trim()) {
      setGaslessOut("Missing API key. Paste your open API key at the top or sign in again.");
      return;
    }
    const cid = parseInt(chainId, 10);
    if (!Number.isFinite(cid)) {
      setGaslessOut("Invalid chain ID.");
      return;
    }
    const am = Number(gaslessAmount);
    if (!Number.isFinite(am) || am <= 0) {
      setGaslessOut("Enter a positive amount.");
      return;
    }
    setGaslessBusy(true);
    setGaslessOut("");
    try {
      const ref = gaslessReferenceNo.trim();
      const data = gaslessNative
        ? await postRelayerSendTransaction(cfg.apiKey, {
            fromAddress: session.walletAddress,
            to: gaslessTo.trim(),
            amount: am,
            chainId: cid,
            currency: gaslessNativeCurrency.trim() || "ETH",
            referenceNo: ref || undefined,
          })
        : await postRelayerSendTransaction(cfg.apiKey, {
            fromAddress: session.walletAddress,
            to: gaslessTo.trim(),
            amount: am,
            chainId: cid,
            currency: currency.trim() || "ETH",
            tokenAddress: tokenAddress.trim(),
            tokenDecimals: parseInt(tokenDecimals, 10),
            referenceNo: ref || undefined,
          });
      setGaslessOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setGaslessOut(String((e as Error).message));
    } finally {
      setGaslessBusy(false);
    }
  };

  /** POST /relayer/write-transaction — custodial contract call (gas or gasless per project/token config). */
  const writeContractTx = async () => {
    if (!session?.walletAddress) return;
    setWriteBusy(true);
    setWriteOut("");
    try {
      let params: string[];
      try {
        const parsed = JSON.parse(writeParamsJson.trim()) as unknown;
        if (
          !Array.isArray(parsed) ||
          parsed.some((x) => typeof x !== "string")
        ) {
          throw new SyntaxError();
        }
        params = parsed as string[];
      } catch {
        throw new Error(
          'params must be a JSON array of strings, e.g. ["0x68656c6c6f776f726c6400000000000000000000000000000000000000000000"]',
        );
      }

      let abi: unknown[] | undefined;
      if (writeAbiJson.trim()) {
        try {
          const a = JSON.parse(writeAbiJson.trim()) as unknown;
          if (!Array.isArray(a)) throw new SyntaxError();
          abi = a as unknown[];
        } catch {
          throw new Error("abi must be a JSON array (fragment strings or objects)");
        }
      }

      const cid = parseInt(chainId, 10);
      if (!Number.isFinite(cid)) throw new Error("Invalid chain ID");

      const fromAddr = (writeFromOverride.trim() || session.walletAddress).trim();
      if (!fromAddr) throw new Error("fromAddress required");

      const body: Record<string, unknown> = {
        contractAddress: writeContract.trim(),
        functionName: writeFunction.trim(),
        params,
        fromAddress: fromAddr,
        chainId: cid,
      };
      if (abi?.length) body.abi = abi;

      const data = await apiPost("relayer/write-transaction", body, cfg, {
        baseUrl: relayerWriteApiBase(),
      });
      setWriteOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setWriteOut(String((e as Error).message));
    } finally {
      setWriteBusy(false);
    }
  };

  const walletCreateRetry = !!(
    session?.apiKey &&
    session.userId &&
    !session.walletAddress
  );
  const walletReady = !!(session?.walletAddress);

  const gaslessSendDisabled =
    gaslessBusy ||
    !cfg.apiKey?.trim() ||
    !gaslessTo.trim() ||
    !gaslessAmount.trim() ||
    (!gaslessNative && !tokenAddress.trim());

  const gaslessBlockedHint = useMemo(() => {
    if (!walletReady) return "";
    const parts: string[] = [];
    if (!cfg.apiKey?.trim()) parts.push("open API key (top of page)");
    if (!gaslessTo.trim()) parts.push("To address");
    if (!gaslessAmount.trim()) parts.push("Amount");
    if (!gaslessNative && !tokenAddress.trim()) parts.push("Token contract");
    if (parts.length === 0) return "";
    return `Button stays disabled until you fill: ${parts.join(", ")}.`;
  }, [walletReady, cfg.apiKey, gaslessTo, gaslessAmount, gaslessNative, tokenAddress]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.5rem" }}>
          Alpha wallet · email login
        </h1>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
          Email onboarding against ks-wallet-be:{" "}
          <strong>①</strong> <code>POST /auth/email/send</code> →{" "}
          <strong>②</strong> <code>POST /auth/email/verify</code> (stores <code>auth_&#123;userId&#125;</code> in Redis) →{" "}
          <strong>③</strong> <code>POST /v2/wallet/create-wallet</code> with <code>walletType: CUSTODIAL</code> (server-held keys).{" "}
          If a wallet already exists for that email + chain, verify returns the address and skips create.
        </p>
      </header>

      <section style={card}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>1 · Networks & sign in (email OTP)</h2>
        <div style={row}>
          <div>
            <div style={labelStyle}>API key (<code>apikey</code>) — required for email + wallet calls</div>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "monospace" }}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste open API key from TreSori / ks-wallet dashboard"
              autoComplete="off"
            />
          </div>
          <div>
            <div style={labelStyle}>Blockchain / network</div>
            <select
              style={inputStyle}
              value={selectedChain ? optionKey(selectedChain) : ""}
              onChange={(e) => {
                const v = e.target.value;
                const opt = CHAIN_OPTIONS.find((c) => optionKey(c) === v) ?? null;
                setSelectedChain(opt);
                if (opt) setChainId(opt.chainId);
              }}
            >
              <option value="">Select network…</option>
              {CHAIN_OPTIONS.map((c) => (
                <option key={optionKey(c)} value={optionKey(c)}>
                  {c.blockchain} · {c.network} · chain {c.chainId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Email (<code>userId</code> will match this)</div>
            <input
              style={inputStyle}
              type="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div style={{ maxWidth: 220 }}>
            <div style={labelStyle}>Chain ID (synced from selection; editable)</div>
            <input
              style={inputStyle}
              value={chainId}
              onChange={(e) => setChainId(e.target.value)}
            />
          </div>
          <div>
            <div style={labelStyle}>OTP (4 digits, after email is sent)</div>
            <input
              style={{ ...inputStyle, maxWidth: 160, letterSpacing: "0.2em" }}
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              autoComplete="one-time-code"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={registerGasTank}
              onChange={(e) => setRegisterGasTank(e.target.checked)}
            />
            After create, call <code>POST /gas-tank/wallets/custom</code>
          </label>
        </div>
        {authStep !== "idle" && (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 0.75rem" }}>
            Step: {authStep === "otp_sent" ? "OTP sent — enter code and verify" : "Signed in"}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" style={btn} disabled={sendOtpBusy} onClick={sendEmailOtp}>
            {sendOtpBusy ? "Sending…" : "POST /auth/email/send"}
          </button>
          <button
            type="button"
            style={btn}
            disabled={verifyBusy || !otpSent || otp.length !== 4}
            onClick={verifyOtpAndCreateWallet}
          >
            {verifyBusy ? "Verifying…" : "Verify OTP & create custodial wallet"}
          </button>
          <button type="button" style={btnDanger} onClick={disconnect}>
            Clear session
          </button>
        </div>
        {authMessage && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>{authMessage}</p>
        )}
        {walletCreateRetry && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 8 }}>
              Wallet was not created. You can retry after fixing the error below.
            </p>
            <button type="button" style={btnGhost} disabled={createBusy} onClick={() => void retryCreateWallet()}>
              {createBusy ? "Creating…" : "Retry POST /v2/wallet/create-wallet"}
            </button>
          </div>
        )}
        {createLog && (
          <Out label="Create wallet response">{createLog}</Out>
        )}
        {gasTankLog && (
          <Out label="Gas tank register">{gasTankLog}</Out>
        )}
      </section>

      {walletReady && (
        <>
          <section style={card}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Profile</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div>
                <span style={labelStyle}>Email</span>
                <div>{session?.email ?? "—"}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={labelStyle}>User ID</span>
                <div style={{ fontFamily: "monospace", fontSize: 12 }}>{session?.userId}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={labelStyle}>Custodial address</span>
                <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{session?.walletAddress}</div>
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>2 · Balance</h2>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 0.75rem" }}>
              This button calls balance <strong>without</strong> <code>smartContractAddress</code> — the API returns{" "}
              <strong>native coin only</strong> (e.g. Sepolia ETH), not ERC-20 tokens.
            </p>
            <button type="button" style={btnGhost} disabled={balBusy} onClick={fetchBalance}>
              {balBusy ? "Loading…" : "POST /v2/wallet/balance (native only)"}
            </button>
            {balanceOut && <Out label="Balance (native)">{balanceOut}</Out>}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>
              3 · Send (native — wallet pays gas)
            </h2>
            <div style={row}>
              <div>
                <div style={labelStyle}>To</div>
                <input style={inputStyle} value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="0x…" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={labelStyle}>Amount</div>
                  <input style={inputStyle} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div>
                  <div style={labelStyle}>Currency</div>
                  <input style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
              </div>
            </div>
            <button type="button" style={btn} disabled={sendBusy || !toAddr.trim()} onClick={sendStandard}>
              {sendBusy ? "Sending…" : "POST /v2/wallet/send-transaction"}
            </button>
            {sendOut && walletReady && <Out label="Send result">{sendOut}</Out>}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>
              4 · Gasless custodial (<code>POST /relayer/send-transaction</code>)
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              Calls the relayer with your session wallet as <code>fromAddress</code>. Requires{" "}
              <strong>project.enableGasless</strong>, gas tank, on-chain relayer/facilitator config, and (for ERC-20) token balance + EIP-2612 permit support.
            </p>
            {!gaslessNative && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--text)",
                  background: "rgba(251, 191, 36, 0.12)",
                  border: "1px solid rgba(251, 191, 36, 0.35)",
                  borderRadius: 8,
                  padding: "0.65rem 0.75rem",
                  marginBottom: 12,
                }}
              >
                <strong>Why does the API say 0 token but I have 0.05 in §2?</strong> §2 shows <strong>native ETH</strong> only.
                Gasless ERC-20 sends need <strong>that ERC-20</strong> in your custodial wallet (same <code>tokenAddress</code> below). ETH cannot pay a token transfer.
                Use the button below to query <code>balanceOf</code> for this contract — it matches what the relayer checks.
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={gaslessNative}
                onChange={(e) => setGaslessNative(e.target.checked)}
              />
              Native transfer (omit <code>tokenAddress</code> — e.g. gasless ETH on supported setups)
            </label>
            <div style={row}>
              {!gaslessNative && (
                <>
                  <div>
                    <div style={labelStyle}>Token contract (ERC-20)</div>
                    <input
                      style={inputStyle}
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      placeholder="0x…"
                    />
                  </div>
                  <div style={{ maxWidth: 140 }}>
                    <div style={labelStyle}>Token decimals</div>
                    <input
                      style={inputStyle}
                      value={tokenDecimals}
                      onChange={(e) => setTokenDecimals(e.target.value)}
                    />
                  </div>
                </>
              )}
              {gaslessNative && (
                <div style={{ maxWidth: 160 }}>
                  <div style={labelStyle}>Currency (native)</div>
                  <input
                    style={inputStyle}
                    value={gaslessNativeCurrency}
                    onChange={(e) => setGaslessNativeCurrency(e.target.value)}
                    placeholder="ETH"
                  />
                </div>
              )}
              <div>
                <div style={labelStyle}>To</div>
                <input style={inputStyle} value={gaslessTo} onChange={(e) => setGaslessTo(e.target.value)} placeholder="0x…" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={labelStyle}>Amount (human)</div>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={gaslessAmount}
                    onChange={(e) => setGaslessAmount(e.target.value)}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Reference no. (optional)</div>
                  <input
                    style={inputStyle}
                    value={gaslessReferenceNo}
                    onChange={(e) => setGaslessReferenceNo(e.target.value)}
                    placeholder="order-123"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            {!gaslessNative && (
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  style={btnGhost}
                  disabled={gaslessTokenBalBusy || !tokenAddress.trim()}
                  onClick={fetchGaslessTokenBalance}
                >
                  {gaslessTokenBalBusy ? "Loading…" : "Check ERC-20 balance (same token as send)"}
                </button>
                {gaslessTokenBalOut && (
                  <Out label="ERC-20 balance (native + token from API)">{gaslessTokenBalOut}</Out>
                )}
              </div>
            )}
            <button type="button" style={btn} disabled={gaslessSendDisabled} onClick={sendGaslessRelayer}>
              {gaslessBusy ? "Sending…" : "POST /relayer/send-transaction"}
            </button>
            {gaslessBlockedHint && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>{gaslessBlockedHint}</p>
            )}
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>
              Uses chain ID from §1 above (<code>{chainId || "—"}</code>). Ensure ks-wallet-be is running if you use local Vite proxy.
            </p>
            {gaslessOut && <Out label="Relayer send result">{gaslessOut}</Out>}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>
              5 · Contract write (relayer)
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 0 }}>
              <code>POST /relayer/write-transaction</code> — encoded call from custodial wallet.{" "}
              <code>params</code> are JSON array of ABI-encoded strings (see backend docs). ABI is optional
              when the contract is verified internally.
            </p>
            <div style={row}>
              <div>
                <div style={labelStyle}>Contract address</div>
                <input
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                  value={writeContract}
                  onChange={(e) => setWriteContract(e.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                />
              </div>
              <div>
                <div style={labelStyle}>Function name</div>
                <input
                  style={inputStyle}
                  value={writeFunction}
                  onChange={(e) => setWriteFunction(e.target.value)}
                  placeholder="e.g. createIdentity"
                  autoComplete="off"
                />
              </div>
              <div>
                <div style={labelStyle}>
                  Params (JSON array of strings)
                </div>
                <textarea
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                  value={writeParamsJson}
                  onChange={(e) => setWriteParamsJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div>
                <div style={labelStyle}>ABI (optional JSON array)</div>
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "monospace", fontSize: 10 }}
                  value={writeAbiJson}
                  onChange={(e) => setWriteAbiJson(e.target.value)}
                  placeholder='["function createIdentity(bytes32) external returns (bytes32)", …]'
                  spellCheck={false}
                />
              </div>
              <div>
                <div style={labelStyle}>
                  From address (optional — defaults to session wallet)
                </div>
                <input
                  style={{ ...inputStyle, fontFamily: "monospace" }}
                  value={writeFromOverride}
                  onChange={(e) => setWriteFromOverride(e.target.value)}
                  placeholder={`default: ${session.walletAddress}`}
                  autoComplete="off"
                />
              </div>
            </div>
            <button
              type="button"
              style={btn}
              disabled={
                writeBusy ||
                !writeContract.trim() ||
                !writeFunction.trim() ||
                !writeParamsJson.trim()
              }
              onClick={writeContractTx}
            >
              {writeBusy ? "Submitting…" : "POST /relayer/write-transaction"}
            </button>
            {writeOut && <Out label="Write transaction result">{writeOut}</Out>}
          </section>
        </>
      )}

      <footer style={{ fontSize: 12, color: "var(--muted)" }}>
        <p>
          Set <code>VITE_API_BASE_URL</code> in <code>.env</code> (see <code>.env.example</code>). CORS is open on the backend; run this app with{" "}
          <code>npm run dev</code> (port 5180).
        </p>
      </footer>
    </div>
  );
}
