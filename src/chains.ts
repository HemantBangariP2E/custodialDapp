/** Hardcoded chains for the demo (matches ks-wallet-be `blockchain` + `network` + `chainId`). */

export type ChainOption = {
  blockchain: string;
  network: string;
  chainId: string;
};

export const CHAIN_OPTIONS: readonly ChainOption[] = [
  { blockchain: "ETH", network: "SEPOLIA", chainId: "11155111" },
  { blockchain: "ETH", network: "MAINNET", chainId: "1" },
  { blockchain: "BASE", network: "SEPOLIA", chainId: "84532" },
  { blockchain: "BASE", network: "MAINNET", chainId: "8453" },
  { blockchain: "ARB", network: "SEPOLIA", chainId: "421614" },
  { blockchain: "ARB", network: "MAINNET", chainId: "42161" },
  { blockchain: "BSC", network: "TESTNET", chainId: "97" },
  { blockchain: "BSC", network: "MAINNET", chainId: "56" },
  { blockchain: "LIN", network: "SEPOLIA", chainId: "59141" },
  { blockchain: "OP", network: "SEPOLIA", chainId: "11155420" },
  { blockchain: "POLY", network: "AMOY", chainId: "80002" },
  {blockchain: "ADI" , network: "TESTNET", chainId: "99999" },
] as const;

export const DEFAULT_CHAIN: ChainOption = CHAIN_OPTIONS[0];

export function optionKey(o: ChainOption): string {
  return `${o.blockchain}|${o.network}|${o.chainId}`;
}
