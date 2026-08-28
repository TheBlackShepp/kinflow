import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api, getToken, setToken, clearToken, OfflineError } from "./api";

const originalFetch = globalThis.fetch;

function mockFetch(response: { status: number; body?: unknown; text?: string }) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.body ?? {},
    text: async () => response.text ?? "",
  } as Response);
}

beforeEach(() => {
  localStorage.clear();
  // force online
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("token helpers", () => {
  it("stores, reads and clears the token", () => {
    expect(getToken()).toBeNull();
    setToken("abc123");
    expect(getToken()).toBe("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("api requests", () => {
  it("includes the bearer token and JSON content type", async () => {
    setToken("tok");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.get("/lists");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/lists");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("uses method and serialized body for POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "l1" }),
    } as Response);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api.post("/lists", { name: "Super" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "Super" }));
  });

  it("throws the server error message on non-ok responses", async () => {
    mockFetch({ status: 403, body: { message: "Sin acceso" } });
    await expect(api.get("/lists")).rejects.toThrow("Sin acceso");
  });

  it("throws a generic message when no server message", async () => {
    mockFetch({ status: 500 });
    await expect(api.get("/lists")).rejects.toThrow("Error en la solicitud");
  });

  it("throws OfflineError when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(api.get("/lists")).rejects.toBeInstanceOf(OfflineError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws OfflineError when fetch itself rejects", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.get("/lists")).rejects.toBeInstanceOf(OfflineError);
  });
});
