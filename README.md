# Custodial demo dApp

Minimal **React + Vite** app that talks to **ks-wallet-be** to demonstrate:

1. **Sign in (email OTP)** — `POST /auth/email/send` then `POST /auth/email/verify` with `userId` equal to the email and your **open API key** (`apikey` header). If verify returns an existing `walletAddress` for that chain, the app signs in without creating again; otherwise it calls **create custodial wallet**. Optionally registers the address via `POST /gas-tank/wallets/custom`.
2. **Create custodial wallet** — `POST /v2/wallet/create-wallet` with `walletType: CUSTODIAL`. The backend generates the key, encrypts it, and returns **address only** (no private key).
3. **Profile** — After wallet creation, shows email, internal `userId`, and custodial address.
4. **Balance** — `POST /v2/wallet/balance`
5. **Native send** — `POST /v2/wallet/send-transaction` (sender pays gas)
6. **Gasless ERC-20** — `POST /relayer/send-transaction` when the project has gasless enabled and the gas tank is funded (permit + facilitator on the server)

## Security note

**Custodial** means the server holds the signing key. You should **not** expect to “log in and get the private key” for custodial users; that would defeat custodial security. For demos of user-controlled keys, the backend supports **SELF_CUSTODIAL** (mnemonic in body) — not wired in this demo.

## Setup

```bash
cd custodial-daaps
cp .env.example .env
# Optional: point everything at local ks-wallet-be (no trailing slash)
# echo VITE_API_BASE_URL=http://localhost:3005 >> .env
npm install
npm run dev
```

With **`npm run dev`**, the app defaults to **same-origin** API paths (`/v2`, `/auth`, `/relayer`, `/gas-tank`, `/chains-and-network`, …) and **Vite proxies** them to **`http://localhost:3005`**. To call the API directly instead, set `VITE_CREATE_WALLET_BASE_URL=http://localhost:3005` in `.env`. Production build still defaults to **alpha-wallet-api** unless you set env vars at build time.

Open **http://localhost:5180**. Paste a valid **open API key**, pick a **network** from the built-in list (default: ETH Sepolia), enter **email**, send OTP, enter the **4-digit code**, then verify — the custodial wallet is created automatically and the profile shows your address. No Bearer JWT is required.

Ensure **ks-wallet-be** is running and CORS allows your origin (defaults to `*` in `main.ts`).

## Workspace path

If your repo uses a slightly different folder name (`custodial-daapps` vs `custodial-daaps`), move this folder or clone the same files there—only the path label changes.
