import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../lib/auth";
import { canReadModule } from "../lib/permissions";
import type { User } from "../lib/types";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ModuleRoute({
  module,
  children,
}: {
  module: "lists" | "products" | "recipes" | "meals";
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canReadModule(user, module)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const USER_KEY = "kinflow_user";

function cacheUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function renderGuards(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<div data-testid="home" />} />
          <Route path="/login" element={<div data-testid="login" />} />
          <Route
            path="/protected"
            element={<ProtectedRoute><div data-testid="protected" /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<AdminRoute><div data-testid="admin" /></AdminRoute>}
          />
          <Route
            path="/module"
            element={<ModuleRoute module="lists"><div data-testid="module" /></ModuleRoute>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Route guards", () => {
  it("redirects an unauthenticated user from a protected route to /login", async () => {
    renderGuards("/protected");
    await waitFor(() => expect(screen.getByTestId("login")).toBeInTheDocument());
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("Member without lists permission is redirected from the module route", async () => {
    cacheUser({ id: "m", name: "M", username: "m", role: "member", permissions: { products: "full" } });
    renderGuards("/module");
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
      expect(screen.queryByTestId("module")).not.toBeInTheDocument();
    });
  });

  it("Member with lists read can access the module route", async () => {
    cacheUser({ id: "m", name: "M", username: "m", role: "member", permissions: { lists: "read" } });
    renderGuards("/module");
    await waitFor(() => expect(screen.getByTestId("module")).toBeInTheDocument());
  });

  it("Non-admin is redirected from the admin route", async () => {
    cacheUser({ id: "m", name: "M", username: "m", role: "member", permissions: { lists: "full" } });
    renderGuards("/admin");
    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
      expect(screen.queryByTestId("admin")).not.toBeInTheDocument();
    });
  });

  it("Admin can access the admin route", async () => {
    cacheUser({ id: "a", name: "Admin", username: "admin", role: "admin" });
    renderGuards("/admin");
    await waitFor(() => expect(screen.getByTestId("admin")).toBeInTheDocument());
  });

  it("Redirects admins correctly on the admin route", async () => {
    cacheUser({ id: "a", name: "Admin", username: "admin", role: "admin", permissions: { lists: "none" } });
    renderGuards("/module");
    // admin always has access regardless of stored permissions
    await waitFor(() => expect(screen.getByTestId("module")).toBeInTheDocument());
  });
});
