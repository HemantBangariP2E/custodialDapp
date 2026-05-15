import { apiPost, createWalletApiBase } from "./api";

/** Body for `POST /relayer/send-transaction` (custodial; gasless if project has `enableGasless`). */
export type RelayerSendTransactionBody = {
  fromAddress: string;
  to: string;
  amount: number;
  chainId: number;
  /** Used for native path or as label with ERC-20; backend accepts optional. */
  currency?: string;
  /** If set, ERC-20 + permit + facilitator path. Omit for native gasless. */
  tokenAddress?: string;
  tokenDecimals?: number;
  referenceNo?: string;
};

/**
 * Custodial send via relayer (gasless when project.enableGasless and gas tank OK).
 * Same host as wallet v2 (`VITE_CREATE_WALLET_BASE_URL` or alpha default).
 */
export async function postRelayerSendTransaction<T = unknown>(
  apiKey: string,
  body: RelayerSendTransactionBody,
  options?: { baseUrl?: string },
): Promise<T> {
  const fromAddress = body.fromAddress.trim();
  const to = body.to.trim();
  if (!fromAddress || !to) throw new Error("fromAddress and to are required");

  const payload: Record<string, unknown> = {
    fromAddress,
    to,
    amount: body.amount,
    chainId: body.chainId,
  };

  const cur = body.currency?.trim();
  if (cur) payload.currency = cur;

  const token = body.tokenAddress?.trim();
  if (token) {
    payload.tokenAddress = token;
    const d = body.tokenDecimals;
    payload.tokenDecimals =
      d !== undefined && Number.isFinite(d) ? Math.min(36, Math.max(0, Math.floor(Number(d)))) : 18;
  }

  const ref = body.referenceNo?.trim();
  if (ref) payload.referenceNo = ref;

  return apiPost<T>("relayer/send-transaction", payload, { apiKey }, { baseUrl: options?.baseUrl ?? createWalletApiBase() });
}
