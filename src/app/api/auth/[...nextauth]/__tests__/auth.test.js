import { describe, it, expect } from "vitest";

describe("NextAuth redirect callback", () => {
  // Create redirect function to test
  const redirect = async ({ url, baseUrl }) => {
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    if (new URL(url).origin === baseUrl) return url;
    return baseUrl;
  };

  it("handles relative URLs correctly", async () => {
    const baseUrl = "http://localhost:3000";
    const url = "/dashboard";

    const result = await redirect({ url, baseUrl });

    expect(result).toBe("http://localhost:3000/dashboard");
  });

  it("returns full URL when URL origin matches baseUrl", async () => {
    const baseUrl = "http://localhost:3000";
    const url = "http://localhost:3000/profile/settings";

    const result = await redirect({ url, baseUrl });

    expect(result).toBe("http://localhost:3000/profile/settings");
  });

  it("returns baseUrl when URL origin doesn't match", async () => {
    const baseUrl = "http://localhost:3000";
    const url = "https://malicious-site.com";

    const result = await redirect({ url, baseUrl });

    expect(result).toBe("http://localhost:3000");
  });

  it("handles URLs with query parameters correctly", async () => {
    const baseUrl = "http://localhost:3000";
    const url = "/login?error=InvalidCredentials";

    const result = await redirect({ url, baseUrl });

    expect(result).toBe("http://localhost:3000/login?error=InvalidCredentials");
  });

  it("handles full URLs with different ports correctly", async () => {
    const baseUrl = "http://localhost:3000";
    const url = "http://localhost:4000/test";

    const result = await redirect({ url, baseUrl });

    expect(result).toBe("http://localhost:3000");
  });

  it("handles invalid URLs", async () => {
    const baseUrl = "http://localhost:3000";

    await expect(async () => {
      await redirect({ url: "not-a-valid-url", baseUrl });
    }).rejects.toThrow();
  });
});
