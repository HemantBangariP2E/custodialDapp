import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { postLoginPath } from "../../lib/postLoginPath";
import { CHAIN_OPTIONS, DEFAULT_CHAIN, optionKey } from "../../chains";
import { useAuth } from "../../context/AuthContext";
import { JsonOut } from "../../components/ui/JsonOut";
import {
  createCustodialWallet,
  registerGasTankCustomWallet,
  sendAuthEmailOtp,
  verifyAuthEmailOtp,
} from "../../wallet-auth-flow";
import { btn, btnGhost, card, inputStyle, labelStyle, row } from "../../styles/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const pending = search.get("pending") === "1";
  const loginDestination = useMemo(
    () => postLoginPath(search, location.state),
    [search, location.state],
  );
  const afterLogin = useCallback(() => {
    navigate(loginDestination, { replace: true });
  }, [navigate, loginDestination]);

  const {
    apiKey,
    setApiKey,
    selectedChain,
    setSelectedChain,
    setChainId,
    setSession,
    finishSessionWithAddress,
    walletPending,
    session,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [message, setMessage] = useState(pending ? "Wallet creation incomplete — verify or retry below." : "");
  const [registerGasTank, setRegisterGasTank] = useState(true);
  const [createLog, setCreateLog] = useState("");
  const [gasTankLog, setGasTankLog] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const chain = selectedChain ?? DEFAULT_CHAIN;

  const createWallet = useCallback(
    async (sess: { apiKey: string; userId: string; email: string }) => {
      setCreateBusy(true);
      setCreateLog("");
      setGasTankLog("");
      try {
        const { address, raw } = await createCustodialWallet(
          { apiKey: sess.apiKey },
          { userId: sess.userId, chain },
        );
        finishSessionWithAddress(
          { ...sess, walletAddress: "", email: sess.email },
          chain,
          address,
        );
        setCreateLog(JSON.stringify(raw, null, 2));
        if (registerGasTank) {
          try {
            const gt = await registerGasTankCustomWallet(
              { apiKey: sess.apiKey },
              { userId: sess.userId, walletAddress: address },
            );
            setGasTankLog(JSON.stringify(gt, null, 2));
          } catch (e) {
            setGasTankLog(`Gas tank: ${(e as Error).message}`);
          }
        }
        afterLogin();
      } catch (e) {
        setCreateLog(String((e as Error).message));
        throw e;
      } finally {
        setCreateBusy(false);
      }
    },
    [chain, finishSessionWithAddress, registerGasTank, afterLogin],
  );

  const sendOtp = async () => {
    const k = apiKey.trim();
    const em = email.trim().toLowerCase();
    if (!k || !em) {
      setMessage("API key and email required.");
      return;
    }
    setSendBusy(true);
    setMessage("");
    try {
      await sendAuthEmailOtp(
        { apiKey: k },
        { email: em, userId: em, blockchain: chain.blockchain, network: chain.network },
      );
      setOtpSent(true);
      setMessage("OTP sent — check your inbox.");
    } catch (e) {
      setMessage(String((e as Error).message));
    } finally {
      setSendBusy(false);
    }
  };

  const verifyAndEnter = async () => {
    const k = apiKey.trim();
    const em = email.trim().toLowerCase();
    const code = otp.trim();
    if (!k || !em || code.length !== 4) {
      setMessage("API key, email, and 4-digit OTP required.");
      return;
    }
    setVerifyBusy(true);
    setMessage("");
    try {
      const verify = await verifyAuthEmailOtp(
        { apiKey: k },
        {
          email: em,
          userId: em,
          otp: code,
          blockchain: chain.blockchain,
          network: chain.network,
        },
      );
      if (!verify.verified) throw new Error("OTP verification failed.");

      const base = { apiKey: k, userId: em, email: em };
      if (verify.existingWalletAddress) {
        finishSessionWithAddress(
          { ...base, walletAddress: "" },
          chain,
          verify.existingWalletAddress,
        );
        afterLogin();
        return;
      }
      setSession({ ...base, walletAddress: "" });
      await createWallet(base);
      setMessage("Wallet ready — entering match…");
    } catch (e) {
      setMessage(String((e as Error).message));
    } finally {
      setVerifyBusy(false);
    }
  };

  const retryCreate = async () => {
    if (!session?.apiKey || !session.userId) return;
    await createWallet({
      apiKey: session.apiKey,
      userId: session.userId,
      email: session.email ?? session.userId,
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={card}>
        <Link to="/" className="auth-back">
          ← Vault Arena
        </Link>
        <h1>Sign in</h1>
       
        {search.get("next")?.includes("/arena/room/") && (
          <p className="warn-box" style={{ marginTop: 12 }}>
            You were invited to a match — after sign-in you will return to the room to join as guest.
          </p>
        )}

        <div style={row}>
          <div>
            <div style={labelStyle}>Open API key</div>
            <textarea
              style={{ ...inputStyle, minHeight: 64, fontFamily: "monospace" }}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="apikey header"
            />
          </div>
          <div>
            <div style={labelStyle}>Network</div>
            <select
              style={inputStyle}
              value={optionKey(chain)}
              onChange={(e) => {
                const opt = CHAIN_OPTIONS.find((c) => optionKey(c) === e.target.value) ?? DEFAULT_CHAIN;
                setSelectedChain(opt);
                setChainId(opt.chainId);
              }}
            >
              {CHAIN_OPTIONS.map((c) => (
                <option key={optionKey(c)} value={optionKey(c)}>
                  {c.blockchain} · {c.network} · {c.chainId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Email</div>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div style={labelStyle}>OTP</div>
            <input
              style={{ ...inputStyle, maxWidth: 140, letterSpacing: "0.15em" }}
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          {/* <label style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={registerGasTank}
              onChange={(e) => setRegisterGasTank(e.target.checked)}
            />
            Register gas tank after create
          </label> */}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={btn} disabled={sendBusy} onClick={sendOtp}>
            {sendBusy ? "Sending…" : "Send OTP"}
          </button>
          <button
            type="button"
            style={btn}
            disabled={verifyBusy || !otpSent || otp.length !== 4}
            onClick={verifyAndEnter}
          >
            {verifyBusy ? "Verifying…" : "Verify & enter"}
          </button>
          {walletPending && (
            <button type="button" style={btnGhost} disabled={createBusy} onClick={retryCreate}>
              Retry create wallet
            </button>
          )}
        </div>

        {message && <p className="form-msg">{message}</p>}
        {createLog && <JsonOut label="Create wallet">{createLog}</JsonOut>}
        {gasTankLog && <JsonOut label="Gas tank">{gasTankLog}</JsonOut>}
      </div>
    </div>
  );
}
