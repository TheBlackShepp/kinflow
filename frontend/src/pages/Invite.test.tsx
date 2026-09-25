import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Invite from "./Invite";

const authMock = vi.hoisted(() => ({
  registerViaInvite: vi.fn(),
}));

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return {
    ...actual,
    useAuth: () => ({
      registerViaInvite: authMock.registerViaInvite,
    }),
  };
});

function renderInvite() {
  return render(
    <MemoryRouter initialEntries={["/invite/token-123"]}>
      <Routes>
        <Route path="/invite/:token" element={<Invite />} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillCredentials(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByPlaceholderText("Tu nombre"), "Alice");
  await user.type(screen.getByPlaceholderText("tu-nombre"), "alice");
  await user.type(screen.getByPlaceholderText("Ej.: Abc1!xyz"), password);
}

beforeEach(() => {
  authMock.registerViaInvite.mockReset();
  authMock.registerViaInvite.mockResolvedValue(undefined);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ familyId: "family-1", familyName: "Hogar" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Invite password validation", () => {
  it("rejects a password without every required character type", async () => {
    const user = userEvent.setup();
    renderInvite();
    await screen.findByText("Has sido invitado a unirte a Hogar");
    await fillCredentials(user, "alllower1!");

    await user.click(screen.getByRole("button", { name: "Crear cuenta y unirme" }));

    expect(await screen.findByText(/La contraseña debe tener al menos 6 caracteres/)).toBeInTheDocument();
    expect(authMock.registerViaInvite).not.toHaveBeenCalled();
  });

  it("registers a valid password with exactly six characters", async () => {
    const user = userEvent.setup();
    renderInvite();
    await screen.findByText("Has sido invitado a unirte a Hogar");
    await fillCredentials(user, "Aa1!aa");

    await user.click(screen.getByRole("button", { name: "Crear cuenta y unirme" }));

    await waitFor(() => {
      expect(authMock.registerViaInvite).toHaveBeenCalledWith("Alice", "alice", "Aa1!aa", "token-123");
    });
  });

  it("sets the password input minimum length", async () => {
    renderInvite();
    await screen.findByText("Has sido invitado a unirte a Hogar");
    expect(screen.getByPlaceholderText("Ej.: Abc1!xyz")).toHaveAttribute("minlength", "6");
  });
});
