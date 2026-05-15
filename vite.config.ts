import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

/** Must match ks-wallet-be listen port (see `main.ts` default 3005 when PORT unset). */
const WALLET_API_TARGET =
  process.env.VITE_PROXY_WALLET_API ?? "http://127.0.0.1:3005";

function walletApiProxy(): ProxyOptions {
  return {
    target: WALLET_API_TARGET,
    changeOrigin: true,
    configure(proxy) {
      proxy.on("error", (err, _req, res) => {
        const msg = err instanceof Error ? err.message : String(err);
        const socket = res as {
          headersSent?: boolean;
          writeHead?: (code: number, headers: Record<string, string>) => void;
          end?: (chunk: string) => void;
        };
        if (socket.headersSent) {
          return;
        }
        if (typeof socket.writeHead === "function" && typeof socket.end === "function") {
          const body = JSON.stringify({
            timestamp: new Date().toISOString(),
            message: `Vite dev proxy could not reach the API at ${WALLET_API_TARGET} (${msg}). Start ks-wallet-be on that host/port, or set env VITE_PROXY_WALLET_API.`,
            httpStatus: 502,
            customErrorNumber: -1,
            code: "ViteProxyUpstreamError",
          });
          socket.writeHead(502, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": String(Buffer.byteLength(body, "utf8")),
          });
          socket.end(body);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    /** Same-origin in dev: browser → Vite → ks-wallet-be (avoids CORS / mixed-content edge cases). */
    proxy: {
      "/v2": walletApiProxy(),
      "/auth": walletApiProxy(),
      "/relayer": walletApiProxy(),
      "/chains-and-network": walletApiProxy(),
      "/gas-tank": walletApiProxy(),
    },
  },
});
