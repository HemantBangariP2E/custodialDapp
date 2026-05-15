import { useCallback, useState } from "react";
import { apiPost, createWalletApiBase, relayerWriteApiBase } from "../api";
import { useAuth } from "../context/AuthContext";
import { postRelayerSendTransaction } from "../relayer-client";

export function useWalletActions() {
  const { session, apiConfig, chainId } = useAuth();
  const [nativeBalanceOut, setNativeBalanceOut] = useState("");
  const [tokenBalanceOut, setTokenBalanceOut] = useState("");
  const [balBusy, setBalBusy] = useState(false);

  /** @deprecated use nativeBalanceOut */
  const balanceOut = nativeBalanceOut;
  const setBalanceOut = setNativeBalanceOut;

  const fetchNativeBalance = useCallback(async () => {
    if (!session?.walletAddress) return;
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
        apiConfig,
        { baseUrl: createWalletApiBase() },
      );
      setNativeBalanceOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setNativeBalanceOut(String((e as Error).message));
    } finally {
      setBalBusy(false);
    }
  }, [session, apiConfig, chainId]);

  const fetchTokenBalance = useCallback(
    async (tokenAddress: string, currency: string) => {
      if (!session?.walletAddress || !tokenAddress.trim()) return "";
      const cid = parseInt(chainId, 10);
      const data = await apiPost(
        "v2/wallet/balance",
        {
          address: session.walletAddress,
          chainId: cid,
          currency: currency.trim() || "ETH",
          smartContractAddress: tokenAddress.trim(),
        },
        apiConfig,
        { baseUrl: createWalletApiBase() },
      );
      return JSON.stringify(data, null, 2);
    },
    [session, apiConfig, chainId],
  );

  const refreshBalances = useCallback(
    async (tokenAddress: string, tokenCurrency = "ETH") => {
      if (!session?.walletAddress) return;
      setBalBusy(true);
      setNativeBalanceOut("");
      setTokenBalanceOut("");
      try {
        const cid = parseInt(chainId, 10);
        const [native, token] = await Promise.all([
          apiPost(
            "v2/wallet/balance",
            {
              address: session.walletAddress,
              chainId: cid,
              currency: "ETH",
            },
            apiConfig,
            { baseUrl: createWalletApiBase() },
          ),
          tokenAddress.trim()
            ? apiPost(
                "v2/wallet/balance",
                {
                  address: session.walletAddress,
                  chainId: cid,
                  currency: tokenCurrency.trim() || "ETH",
                  smartContractAddress: tokenAddress.trim(),
                },
                apiConfig,
                { baseUrl: createWalletApiBase() },
              )
            : Promise.resolve(null),
        ]);
        setNativeBalanceOut(JSON.stringify(native, null, 2));
        if (token) setTokenBalanceOut(JSON.stringify(token, null, 2));
        else setTokenBalanceOut("Set a token contract address to load ERC-20 balance.");
      } catch (e) {
        const msg = String((e as Error).message);
        setNativeBalanceOut(msg);
        setTokenBalanceOut(msg);
      } finally {
        setBalBusy(false);
      }
    },
    [session, apiConfig, chainId],
  );

  const sendNative = useCallback(
    async (to: string, amount: number, currency: string) => {
      if (!session?.walletAddress) throw new Error("No wallet");
      const cid = parseInt(chainId, 10);
      return apiPost(
        "v2/wallet/send-transaction",
        {
          address: session.walletAddress,
          to: to.trim(),
          amount: Number.isFinite(amount) ? amount : 0,
          chainId: cid,
          currency: currency.trim() || "ETH",
          userShard: "",
          userIndentity: "",
        },
        apiConfig,
        { baseUrl: createWalletApiBase() },
      );
    },
    [session, apiConfig, chainId],
  );

  const sendGasless = useCallback(
    async (params: {
      to: string;
      amount: number;
      native: boolean;
      tokenAddress?: string;
      tokenDecimals?: number;
      currency?: string;
      nativeCurrency?: string;
      referenceNo?: string;
    }) => {
      if (!session?.walletAddress) throw new Error("No wallet");
      const cid = parseInt(chainId, 10);
      const base = {
        fromAddress: session.walletAddress,
        to: params.to.trim(),
        amount: params.amount,
        chainId: cid,
        referenceNo: params.referenceNo,
      };
      if (params.native) {
        return postRelayerSendTransaction(apiConfig.apiKey, {
          ...base,
          currency: params.nativeCurrency?.trim() || "ETH",
        });
      }
      return postRelayerSendTransaction(apiConfig.apiKey, {
        ...base,
        currency: params.currency?.trim() || "ETH",
        tokenAddress: params.tokenAddress!.trim(),
        tokenDecimals: params.tokenDecimals ?? 18,
      });
    },
    [session, apiConfig, chainId],
  );

  const writeContract = useCallback(
    async (body: Record<string, unknown>) => {
      return apiPost("relayer/write-transaction", body, apiConfig, {
        baseUrl: relayerWriteApiBase(),
      });
    },
    [apiConfig],
  );

  return {
    session,
    balanceOut,
    nativeBalanceOut,
    tokenBalanceOut,
    balBusy,
    fetchNativeBalance,
    fetchTokenBalance,
    refreshBalances,
    sendNative,
    sendGasless,
    writeContract,
    setBalanceOut,
    setNativeBalanceOut,
    setTokenBalanceOut,
  };
}
