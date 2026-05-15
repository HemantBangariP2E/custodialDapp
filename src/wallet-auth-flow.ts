/**
 * Email OTP auth + custodial wallet creation against ks-wallet-be.
 * Flow: POST /auth/email/send → POST /auth/email/verify → POST /v2/wallet/create-wallet
 */

import { apiPost, createWalletApiBase, type ApiConfig } from "./api";

export type ChainContext = {
  blockchain: string;
  network: string;
  chainId: string;
};

export type AuthEmailPayload = {
  email: string;
  userId: string;
  blockchain: string;
  network: string;
  walletType?: "CUSTODIAL" | "MPC" | "SMART_WALLET";
};

export type VerifyEmailResult = {
  verified: boolean;
  existingWalletAddress?: string;
  walletExists?: boolean;
  raw: Record<string, unknown>;
};

export type CreateCustodialResult = {
  address: string;
  raw: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

/** Unwrap nested `{ status: { … } }` from auth verify responses. */
function unwrapStatus(data: Record<string, unknown>): Record<string, unknown> {
  const inner = data.status;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return { ...data, ...(inner as Record<string, unknown>) };
  }
  return data;
}

export function extractWalletAddress(data: Record<string, unknown>): string {
  const flat = unwrapStatus(data);
  for (const key of ["walletAddress", "wallet_address", "address", "ownerAddress"] as const) {
    const v = flat[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function parseVerifyEmailResult(data: unknown): VerifyEmailResult {
  const raw = asRecord(data);
  const flat = unwrapStatus(raw);
  const verified =
    flat.success === true ||
    (typeof flat.message === "string" &&
      /verified|exists|success/i.test(flat.message));
  const existingWalletAddress = extractWalletAddress(flat);
  return {
    verified: verified || !!existingWalletAddress,
    existingWalletAddress: existingWalletAddress || undefined,
    walletExists: flat.walletExists === true || !!existingWalletAddress,
    raw,
  };
}

export async function sendAuthEmailOtp(
  cfg: ApiConfig,
  payload: AuthEmailPayload,
): Promise<void> {
  await apiPost(
    "auth/email/send",
    {
      email: payload.email,
      userId: payload.userId,
      type: "sign_in",
      walletType: payload.walletType ?? "CUSTODIAL",
      blockchain: payload.blockchain,
      network: payload.network,
    },
    cfg,
    { baseUrl: createWalletApiBase() },
  );
}

export async function verifyAuthEmailOtp(
  cfg: ApiConfig,
  payload: AuthEmailPayload & { otp: string },
): Promise<VerifyEmailResult> {
  const data = await apiPost<Record<string, unknown>>(
    "auth/email/verify",
    {
      email: payload.email,
      userId: payload.userId,
      otp: payload.otp,
      type: "sign_in",
      walletType: payload.walletType ?? "CUSTODIAL",
      blockchain: payload.blockchain,
      network: payload.network,
    },
    cfg,
    { baseUrl: createWalletApiBase() },
  );
  return parseVerifyEmailResult(data);
}

export async function createCustodialWallet(
  cfg: ApiConfig,
  params: {
    userId: string;
    chain: ChainContext;
  },
): Promise<CreateCustodialResult> {
  const cid = parseInt(params.chain.chainId, 10);
  if (!Number.isFinite(cid)) {
    throw new Error("Invalid chain ID");
  }

  const data = await apiPost<Record<string, unknown>>(
    "v2/wallet/create-wallet",
    {
      chainId: cid,
      walletType: "CUSTODIAL",
      blockchain: params.chain.blockchain,
      network: params.chain.network,
      userId: params.userId,
      mnemonic: "",
      isWidget: false,
    },
    cfg,
    { baseUrl: createWalletApiBase() },
  );

  const addr = extractWalletAddress(data);
  if (!addr) {
    throw new Error("No wallet address in create-wallet response");
  }
  return { address: addr, raw: data };
}

/** Optional: link address to gas tank rows (Open API key + userId in body). */
export async function registerGasTankCustomWallet(
  cfg: ApiConfig,
  params: { userId: string; walletAddress: string },
): Promise<Record<string, unknown>> {
  return apiPost(
    "gas-tank/wallets/custom",
    {
      walletAddress: params.walletAddress,
      userId: params.userId,
    },
    cfg,
    { baseUrl: createWalletApiBase() },
  );
}
