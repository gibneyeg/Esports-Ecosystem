import { describe, it, expect } from "vitest";
import React from "react";
import HomePage from "../page.jsx";

describe("HomePage", () => {
  it('renders the word "Welcome"', () => {
    // Render the HomePage component
    const homepage = HomePage();

    // Check if the output contains the word "Welcome"
    const homepageText = React.Children.toArray(homepage.props.children);
    const containsWelcome = homepageText.some((child) =>
      typeof child === "string"
        ? child.includes("Welcome to the Esports Ecosystem")
        : React.isValidElement(child)
    );

    expect(containsWelcome).toBe(true);
  });
});
