import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_CHAIN, type ChainOption } from "../chains";
import {
  isAuthenticated,
  loadSession,
  loadStoredApiKey,
  saveSession,
  saveStoredApiKey,
  type Session,
} from "../lib/session";

type AuthContextValue = {
  session: Session | null;
  apiKey: string;
  setApiKey: (k: string) => void;
  selectedChain: ChainOption | null;
  setSelectedChain: (c: ChainOption | null) => void;
  chainId: string;
  setChainId: (id: string) => void;
  isAuthed: boolean;
  walletPending: boolean;
  setSession: (s: Session | null) => void;
  finishSessionWithAddress: (sess: Session, chain: ChainOption, addr: string) => void;
  logout: () => void;
  apiConfig: { apiKey: string };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadSession(), []);
  const [apiKey, setApiKeyState] = useState(
    () => initial?.apiKey ?? loadStoredApiKey(),
  );
  const [session, setSessionState] = useState<Session | null>(() =>
    initial?.walletAddress ? initial : null,
  );
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
  const [chainId, setChainId] = useState(
    () => initial?.chainIdStr ?? DEFAULT_CHAIN.chainId,
  );

  const setApiKey = useCallback((k: string) => {
    setApiKeyState(k);
    saveStoredApiKey(k);
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    saveSession(s);
    if (s?.apiKey) setApiKeyState(s.apiKey);
  }, []);

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
      setSelectedChain(chain);
      setChainId(chain.chainId);
    },
    [setSession],
  );

  const logout = useCallback(() => {
    saveSession(null);
    setSessionState(null);
    setSelectedChain(DEFAULT_CHAIN);
    setChainId(DEFAULT_CHAIN.chainId);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      apiKey,
      setApiKey,
      selectedChain,
      setSelectedChain,
      chainId,
      setChainId,
      isAuthed: isAuthenticated(session),
      walletPending: !!(session?.apiKey && session.userId && !session.walletAddress),
      setSession,
      finishSessionWithAddress,
      logout,
      apiConfig: { apiKey: session?.apiKey ?? apiKey },
    }),
    [
      session,
      apiKey,
      selectedChain,
      chainId,
      setApiKey,
      finishSessionWithAddress,
      logout,
      setSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
