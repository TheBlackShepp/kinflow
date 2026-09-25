import { describe, expect, it } from "vitest";
import { isStrongPassword, PASSWORD_MIN_LENGTH } from "./password";

describe("isStrongPassword", () => {
  it("accepts a password that meets every requirement", () => {
    expect(isStrongPassword("Aa1!aa")).toBe(true);
    expect(isStrongPassword("Segura1!")).toBe(true);
  });

  it("rejects passwords shorter than the minimum", () => {
    expect(isStrongPassword("Aa1!")).toBe(false);
    expect(PASSWORD_MIN_LENGTH).toBe(6);
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(isStrongPassword("aa1!aa")).toBe(false);
  });

  it("rejects passwords without a lowercase letter", () => {
    expect(isStrongPassword("AA1!AA")).toBe(false);
  });

  it("rejects passwords without a number", () => {
    expect(isStrongPassword("Aa!!!a")).toBe(false);
  });

  it("rejects passwords without a symbol", () => {
    expect(isStrongPassword("Aa12345")).toBe(false);
  });
});
