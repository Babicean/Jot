import { describe, expect, it } from "vitest";
import { shareFromQuery } from "./shareTarget";

describe("shareFromQuery — PWA share_target launches", () => {
  it("joins text and url", () => {
    expect(
      shareFromQuery("?text=call+the+plumber&url=https%3A%2F%2Fexample.com"),
    ).toBe("call the plumber https://example.com");
  });

  it("drops the page title when there is anything else", () => {
    expect(
      shareFromQuery("?title=Example+Page&url=https%3A%2F%2Fexample.com"),
    ).toBe("https://example.com");
  });

  it("keeps a bare title when it is all there is", () => {
    expect(shareFromQuery("?title=Just+a+headline")).toBe("Just a headline");
  });

  it("returns null for ordinary launches", () => {
    expect(shareFromQuery("")).toBeNull();
    expect(shareFromQuery("?utm_source=x")).toBeNull();
    expect(shareFromQuery("?text=++")).toBeNull();
  });
});
