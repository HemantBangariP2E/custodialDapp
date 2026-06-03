import type { EstimateGasApiResponse } from "../../lib/walletEstimateGas";
import { formatBackendGasSummary } from "../../lib/walletEstimateGas";

type Props = {
  loading: boolean;
  error: string;
  estimate: EstimateGasApiResponse | null;
};

export function BackendGasEstimateBlock({ loading, error, estimate }: Props) {
  if (loading) {
    return <p className="muted small gas-estimate-line">Estimating gas via API…</p>;
  }
  if (error) {
    return (
      <p className="balance-error small gas-estimate-line" title={error}>
        Gas estimate: {error.length > 100 ? `${error.slice(0, 100)}…` : error}
      </p>
    );
  }
  if (!estimate || !formatBackendGasSummary(estimate)) {
    return null;
  }
  return (
    <div className="gas-estimate-panel">
      <p className="label small" style={{ marginBottom: 4 }}>
        Estimated network fee
      </p>
      <p className="gas-estimate-amount">{formatBackendGasSummary(estimate)}</p>
      {estimate.gasLimitWithBuffer && (
        <p className="muted small">
          Gas limit (with buffer): {estimate.gasLimitWithBuffer} · Native cost wei:{" "}
          {estimate.estimatedCostWei}
        </p>
      )}
    </div>
  );
}
