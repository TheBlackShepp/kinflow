import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../lib/auth";
import type { User } from "../lib/types";

const storeMock = vi.hoisted(() => ({
  lists: [] as unknown[],
  mealPlans: [] as unknown[],
  ready: true,
  updateItem: vi.fn(),
}));

vi.mock("../lib/useDarkMode", () => ({
  useDarkMode: () => ({ dark: false, toggle: vi.fn() }),
}));

vi.mock("../lib/store", () => ({
  useData: () => storeMock,
}));

const USER_KEY = "kinflow_user";

function cacheUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function renderDashboard(user: User) {
  cacheUser(user);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Dashboard />
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Dashboard", () => {
  it("shows the setup-home onboarding when the user has no family", async () => {
    renderDashboard({
      id: "a",
      name: "Admin",
      username: "admin",
      role: "admin",
      familyId: null,
    });
    expect(await screen.findByText("Configurar mi hogar")).toBeInTheDocument();
  });

  it("renders all four module cards for an admin", async () => {
    renderDashboard({
      id: "a",
      name: "Admin",
      username: "admin",
      role: "admin",
      familyId: "f1",
      family: { id: "f1", name: "Mi hogar", inviteCode: "x" },
    });
    expect(await screen.findByText("Listas")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Recetas")).toBeInTheDocument();
    expect(screen.getByText("Menús")).toBeInTheDocument();
  });

  it("hides the meals card for a member without meals access", async () => {
    renderDashboard({
      id: "m",
      name: "Member",
      username: "member",
      role: "member",
      familyId: "f1",
      permissions: { lists: "full", products: "full", recipes: "full", meals: "none" },
      family: { id: "f1", name: "Mi hogar", inviteCode: "x" },
    });
    expect(await screen.findByText("Listas")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Recetas")).toBeInTheDocument();
    expect(screen.queryByText("Menús")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Qué hay de comer hoy?")).not.toBeInTheDocument();
  });

  it("hides the pending shopping section for a member without lists access", async () => {
    renderDashboard({
      id: "m",
      name: "Member",
      username: "member",
      role: "member",
      familyId: "f1",
      permissions: { lists: "none", products: "full", recipes: "full", meals: "full" },
      family: { id: "f1", name: "Mi hogar", inviteCode: "x" },
    });
    expect(await screen.findByText("Productos")).toBeInTheDocument();
    expect(screen.queryByText("Compras pendientes")).not.toBeInTheDocument();
    expect(screen.queryByText("Listas")).not.toBeInTheDocument();
  });

  it("does not show the family admin link to a non-admin member", async () => {
    renderDashboard({
      id: "m",
      name: "Member",
      username: "member",
      role: "member",
      familyId: "f1",
      permissions: { lists: "full", products: "full", recipes: "full", meals: "full" },
      family: { id: "f1", name: "Mi hogar", inviteCode: "x" },
    });
    expect(await screen.findByText("Listas")).toBeInTheDocument();
    expect(screen.queryByText("Familia")).not.toBeInTheDocument();
  });
});
