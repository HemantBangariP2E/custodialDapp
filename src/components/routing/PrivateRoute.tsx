import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed, walletPending } = useAuth();
  const location = useLocation();

  if (!isAuthed) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    const loginTo = walletPending
      ? `/login?pending=1&next=${returnTo}`
      : `/login?next=${returnTo}`;
    return (
      <Navigate
        to={loginTo}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
