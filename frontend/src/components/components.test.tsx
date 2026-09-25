import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../components/Modal";
import AuthShell from "../components/AuthShell";
import PasswordRequirements from "../components/PasswordRequirements";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="Título">cuerpo</Modal>);
    expect(screen.queryByText("Título")).not.toBeInTheDocument();
    expect(screen.queryByText("cuerpo")).not.toBeInTheDocument();
  });

  it("renders title and children when open", () => {
    render(<Modal open onClose={() => {}} title="Mi modal"><p>contenido</p></Modal>);
    expect(screen.getByText("Mi modal")).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(<Modal open onClose={onClose} title="Título">contenido</Modal>);
    const backdrop = container.querySelector("div.absolute.inset-0") as HTMLElement;
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the X button is clicked", async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Título">contenido</Modal>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("PasswordRequirements", () => {
  it("marks each requirement as met while the password changes", () => {
    const { rerender } = render(<PasswordRequirements id="requirements" password="Aa1" />);

    expect(screen.getByText("Una letra mayúscula")).toHaveAttribute("data-met", "true");
    expect(screen.getByText("Una letra minúscula")).toHaveAttribute("data-met", "true");
    expect(screen.getByText("Un número")).toHaveAttribute("data-met", "true");
    expect(screen.getByText("6 caracteres como mínimo")).toHaveAttribute("data-met", "false");
    expect(screen.getByText("Un símbolo")).toHaveAttribute("data-met", "false");

    rerender(<PasswordRequirements id="requirements" password="Aa1!aa" />);

    for (const requirement of screen.getAllByRole("listitem")) {
      expect(requirement).toHaveAttribute("data-met", "true");
    }
  });
});

describe("AuthShell", () => {
  it("renders brand, title, subtitle and children", () => {
    render(<AuthShell title="Iniciar sesión" subtitle="Bienvenido de nuevo"><input placeholder="usuario" /></AuthShell>);
    expect(screen.getByText("Kinflow")).toBeInTheDocument();
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("usuario")).toBeInTheDocument();
  });
});
