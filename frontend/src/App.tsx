import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./lib/auth";
import { DataProvider } from "./lib/store";
import Layout from "./components/Layout";import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import Products from "./pages/Products";
import Recipes from "./pages/Recipes";
import MealPlanner from "./pages/MealPlanner";
import Family from "./pages/Family";
import Invite from "./pages/Invite";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">{t("app.loading")}</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OnboardingOrResumeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">{t("app.loading")}</div>
      </div>
    );
  }
  if (user && user.familyId) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <OnboardingOrResumeRoute>
                  <Register />
                </OnboardingOrResumeRoute>
              }
            />
            <Route path="/invite/:token" element={<Invite />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lists"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Lists />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lists/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ListDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Recipes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/meals"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MealPlanner />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/family"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Family />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
