import { useState } from "react";
import { btnGhost } from "../../styles/ui";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button type="button" style={btnGhost} onClick={() => void copy()}>
      {copied ? "Copied!" : label}
    </button>
  );
}
