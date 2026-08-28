import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../components/Modal";
import AuthShell from "../components/AuthShell";

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

describe("AuthShell", () => {
  it("renders brand, title, subtitle and children", () => {
    render(<AuthShell title="Iniciar sesión" subtitle="Bienvenido de nuevo"><input placeholder="usuario" /></AuthShell>);
    expect(screen.getByText("Kinflow")).toBeInTheDocument();
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido de nuevo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("usuario")).toBeInTheDocument();
  });
});
