import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";

const authMock = vi.hoisted(() => ({
  register: vi.fn(),
  refreshUser: vi.fn(),
}));

vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      register: authMock.register,
      refreshUser: authMock.refreshUser,
    }),
  };
});

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Register />
    </MemoryRouter>
  );
}

async function fillCredentials(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByPlaceholderText("Tu nombre"), "Alice");
  await user.type(screen.getByPlaceholderText("tu-nombre"), "alice");
  await user.type(screen.getByPlaceholderText("Ej.: Abc1!xyz"), password);
  await user.type(screen.getByPlaceholderText("Repite tu contraseña"), password);
}

beforeEach(() => {
  authMock.register.mockReset();
  authMock.refreshUser.mockReset();
  authMock.register.mockResolvedValue(undefined);
});

describe("Register password validation", () => {
  it("rejects a password without every required character type", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillCredentials(user, "alllower1!");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText(/La contraseña debe tener al menos 6 caracteres/)).toBeInTheDocument();
    expect(authMock.register).not.toHaveBeenCalled();
  });

  it("registers a valid password with exactly six characters", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillCredentials(user, "Aa1!aa");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(authMock.register).toHaveBeenCalledWith("Alice", "alice", "Aa1!aa");
    });
  });

  it("sets the password input minimum length", () => {
    renderRegister();
    expect(screen.getByPlaceholderText("Ej.: Abc1!xyz")).toHaveAttribute("minlength", "6");
  });
});
