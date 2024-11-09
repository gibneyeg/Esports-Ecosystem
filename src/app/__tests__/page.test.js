import { describe, it, expect } from "vitest";
import React from "react";
import HomePage from "../page.jsx";

// Mock the next/navigation module
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("HomePage", () => {
  it('renders the word "Welcome"', () => {
    // Render the HomePage component
    const homepage = HomePage();

    // Check if the output contains the word "Welcome"
    const homepageText = React.Children.toArray(homepage.props.children);
    const containsWelcome = homepageText.some((child) =>
      typeof child === "string"
        ? child.includes("Welcome to WarriorTournaments")
        : React.isValidElement(child) &&
          JSON.stringify(child.props).includes("Welcome to WarriorTournaments")
    );

    expect(containsWelcome).toBe(true);
  });
});
