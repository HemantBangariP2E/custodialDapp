import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARENA_PORT = Number(process.env.ARENA_WS_PORT || 5181);

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

/** Starts arena WebSocket server when you run `npm run dev:vite` (no separate terminal). */
function arenaServerPlugin() {
  let child: ChildProcess | null = null;
  return {
    name: "arena-ws-dev-server",
    configureServer() {
      if (process.env.VITE_ARENA_WS_EXTERNAL === "1") return () => undefined;
      const script = path.join(__dirname, "server", "arena-ws.mjs");
      child = spawn(process.execPath, [script], {
        cwd: __dirname,
        stdio: "inherit",
        env: { ...process.env, ARENA_WS_PORT: String(ARENA_PORT) },
      });
      child.on("error", (err) => {
        console.error("[arena-ws] failed to start:", err.message);
      });
      return () => {
        child?.kill();
        child = null;
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), arenaServerPlugin()],
  server: {
    port: 5180,
    proxy: {
      "/v2": walletApiProxy(),
      "/auth": walletApiProxy(),
      "/relayer": walletApiProxy(),
      "/chains-and-network": walletApiProxy(),
      "/gas-tank": walletApiProxy(),
      "/arena-ws": {
        target: `ws://127.0.0.1:${ARENA_PORT}`,
        ws: true,
        changeOrigin: true,
        rewrite: () => "",
      },
    },
  },
});
