import type { ReactNode } from "react";
import { card } from "../../styles/ui";

export function JsonOut({ label, children }: { label: string; children: ReactNode }) {
  return (
    <pre
      style={{
        ...card,
        fontSize: 12,
        overflow: "auto",
        maxHeight: 220,
        margin: "0.75rem 0 0",
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>{label}</strong>
      {children}
    </pre>
  );
}
