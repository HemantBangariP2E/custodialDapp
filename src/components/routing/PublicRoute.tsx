import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { postLoginPath } from "../../lib/postLoginPath";

export function PublicRoute({
  children,
  allowAuthed = false,
}: {
  children: React.ReactNode;
  allowAuthed?: boolean;
}) {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (isAuthed && !allowAuthed) {
    const dest = postLoginPath(
      new URLSearchParams(location.search),
      location.state,
    );
    return <Navigate to={dest} replace />;
  }

  return children;
}
