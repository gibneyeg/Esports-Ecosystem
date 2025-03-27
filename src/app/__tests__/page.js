import { describe, it, expect, vi } from "vitest";
import HomePage from "../page.jsx";
// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));
// Mock React with proper useState implementation
vi.mock("react", async () => {
  const React = await vi.importActual("react");
  return {
    ...React,
    useState: (initialState) => {
      return [Array.isArray(initialState) ? initialState : [], vi.fn()];
    },
    useEffect: vi.fn(),
  };
});
// Simple mock for Layout
vi.mock("../components/Layout.jsx", () => ({
  default: function (props) {
    return props.children;
  },
}));
// Mock image
vi.mock("../Img/gamers.jpeg", () => ({
  default: { src: "/mock-image.jpg" },
}));
// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        totalPlayers: "1,500",
        totalTournaments: "25",
        totalPrizePool: "$50,000",
      }),
  })
);
describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders the word "Welcome"', () => {
    const component = HomePage();
    const stringified = JSON.stringify(component);
    expect(stringified.includes("Welcome to WarriorTournaments")).toBe(true);
  });
});
