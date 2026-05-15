import type { CSSProperties } from "react";

export const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.25rem",
};

export const row: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  marginBottom: "0.75rem",
};

export const labelStyle: CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--muted)",
  marginBottom: 4,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0f1117",
  color: "var(--text)",
};

export const btn: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

export const btnGhost: CSSProperties = {
  ...btn,
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text)",
};

export const btnDanger: CSSProperties = {
  ...btnGhost,
  borderColor: "#7f1d1d",
  color: "#fca5a5",
};
