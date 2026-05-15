import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { PrivateRoute } from "./components/routing/PrivateRoute";
import { PublicRoute } from "./components/routing/PublicRoute";
import LandingPage from "./pages/public/LandingPage";
import LoginPage from "./pages/public/LoginPage";
import DashboardPage from "./pages/app/DashboardPage";
import SendPage from "./pages/app/SendPage";
import RelayPage from "./pages/app/RelayPage";
import ArenaPage from "./pages/app/ArenaPage";
import ArenaRoomPage from "./pages/app/ArenaRoomPage";
import ContractsPage from "./pages/app/ContractsPage";
import ProfilePage from "./pages/app/ProfilePage";
import "./app.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <AppShell />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="send" element={<SendPage />} />
            <Route path="relay" element={<RelayPage />} />
            <Route path="arena" element={<ArenaPage />} />
            <Route path="arena/room/:roomId" element={<ArenaRoomPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
