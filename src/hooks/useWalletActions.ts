import { useCallback, useState } from "react";
import { apiPost, createWalletApiBase, relayerWriteApiBase } from "../api";
import { useAuth } from "../context/AuthContext";
import { shortBalanceError } from "../lib/formatBalance";
import type { EstimateGasApiResponse } from "../lib/walletEstimateGas";
import { postRelayerSendTransaction, postRelayerSendTransactionWithFee } from "../relayer-client";

export function useWalletActions() {
  const { session, apiConfig, chainId } = useAuth();
  const [nativeBalanceOut, setNativeBalanceOut] = useState("");
  const [tokenBalanceOut, setTokenBalanceOut] = useState("");
  const [nativeBalanceError, setNativeBalanceError] = useState("");
  const [tokenBalanceError, setTokenBalanceError] = useState("");
  const [balBusy, setBalBusy] = useState(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      setNativeBalanceError("");
      setTokenBalanceError("");
      const cid = parseInt(chainId, 10);
      const base = { baseUrl: createWalletApiBase() };

      try {
        const native = await apiPost(
          "v2/wallet/balance",
          {
            address: session.walletAddress,
            chainId: cid,
            currency: "ETH",
          },
          apiConfig,
          base,
        );
        setNativeBalanceOut(JSON.stringify(native, null, 2));
      } catch (e) {
        setNativeBalanceError(shortBalanceError(String((e as Error).message)));
      }

      if (tokenAddress.trim()) {
        await sleep(500);
        try {
          const token = await apiPost(
            "v2/wallet/balance",
            {
              address: session.walletAddress,
              chainId: cid,
              currency: tokenCurrency.trim() || "ETH",
              smartContractAddress: tokenAddress.trim(),
            },
            apiConfig,
            base,
          );
          setTokenBalanceOut(JSON.stringify(token, null, 2));
        } catch (e) {
          setTokenBalanceError(shortBalanceError(String((e as Error).message)));
        }
      }

      setBalBusy(false);
    },
    [session, apiConfig, chainId],
  );

  /** Native ETH transfer gas — `POST /v2/wallet/estimate-gas`. */
  const estimateNativeTransferGas = useCallback(
    async (to: string, amount: number) => {
      if (!session?.walletAddress) throw new Error("No wallet");
      const cid = parseInt(chainId, 10);
      const body = {
        chainId: cid,
        from: session.walletAddress,
        to: to.trim(),
        amount: Number.isFinite(amount) ? amount : 0,
      };
      const root = createWalletApiBase();
      const url = root ? `${root.replace(/\/$/, "")}/v2/wallet/estimate-gas` : "/v2/wallet/estimate-gas (same-origin)";
      console.log("[v2/wallet/estimate-gas] HIT · native", url, body);
      try {
        const res = await apiPost<EstimateGasApiResponse>(
          "v2/wallet/estimate-gas",
          body,
          apiConfig,
          { baseUrl: createWalletApiBase() },
        );
        console.log("[v2/wallet/estimate-gas] OK · native", res);
        return res;
      } catch (e) {
        console.error("[v2/wallet/estimate-gas] FAIL · native", e);
        throw e;
      }
    },
    [session, apiConfig, chainId],
  );

  /** ERC-20 `transfer` gas — same endpoint with `smartContractAddress`. */
  const estimateErc20TransferGas = useCallback(
    async (params: { to: string; amount: number; tokenAddress: string }) => {
      if (!session?.walletAddress) throw new Error("No wallet");
      const cid = parseInt(chainId, 10);
      const body = {
        chainId: cid,
        from: session.walletAddress,
        to: params.to.trim(),
        amount: Number.isFinite(params.amount) ? params.amount : 0,
        smartContractAddress: params.tokenAddress.trim(),
      };
      const root = createWalletApiBase();
      const url = root ? `${root.replace(/\/$/, "")}/v2/wallet/estimate-gas` : "/v2/wallet/estimate-gas (same-origin)";
      console.log("[v2/wallet/estimate-gas] HIT · erc20", url, body);
      try {
        const res = await apiPost<EstimateGasApiResponse>(
          "v2/wallet/estimate-gas",
          body,
          apiConfig,
          { baseUrl: createWalletApiBase() },
        );
        console.log("[v2/wallet/estimate-gas] OK · erc20", res);
        return res;
      } catch (e) {
        console.error("[v2/wallet/estimate-gas] FAIL · erc20", e);
        throw e;
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
          // userShard: "",
          // userIndentity: "",
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

  const sendGaslessWithFee = useCallback(
    async (params: {
      to: string;
      amount: number;
      tokenAddress: string;
      tokenDecimals?: number;
      feeRecipient: string;
      feeAmount: number;
      currency?: string;
      referenceNo?: string;
    }) => {
      if (!session?.walletAddress) throw new Error("No wallet");
      const cid = parseInt(chainId, 10);
      return postRelayerSendTransactionWithFee(apiConfig.apiKey, {
        fromAddress: session.walletAddress,
        to: params.to.trim(),
        amount: params.amount,
        chainId: cid,
        tokenAddress: params.tokenAddress.trim(),
        tokenDecimals: params.tokenDecimals ?? 18,
        feeRecipient: params.feeRecipient.trim(),
        feeAmount: params.feeAmount,
        currency: params.currency?.trim() || "ETH",
        referenceNo: params.referenceNo,
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
    nativeBalanceError,
    tokenBalanceError,
    balBusy,
    fetchNativeBalance,
    fetchTokenBalance,
    refreshBalances,
    estimateNativeTransferGas,
    estimateErc20TransferGas,
    sendNative,
    sendGasless,
    sendGaslessWithFee,
    writeContract,
    setBalanceOut,
    setNativeBalanceOut,
    setTokenBalanceOut,
  };
}
