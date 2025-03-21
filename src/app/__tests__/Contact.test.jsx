import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import Contact from "../Contact/page";

vi.mock("/src/components/ContactForm", () => ({
  default: () =>
    createElement("div", { "data-testid": "contact-form" }, "Contact Form"),
}));

vi.mock("../../components/Layout", () => ({
  default: ({ children }) =>
    createElement("div", { "data-testid": "layout" }, children),
}));

describe("Contact Page", () => {
  const renderContact = () => {
    return Contact();
  };

  it("has correct container structure", () => {
    const container = renderContact();
    const innerContainer = container.props.children;

    expect(innerContainer.props.className).toBe("max-w-2xl mx-auto");
  });

  it("renders ContactForm component directly", () => {
    const container = renderContact();
    const contactForm = container.props.children.props.children[1];
    expect(contactForm).toBeTruthy();
  });

  it("has correct responsive container classes", () => {
    const container = renderContact();
    const innerContainer = container.props.children;
    expect(innerContainer.props.className).toContain("max-w-2xl");
    expect(innerContainer.props.className).toContain("mx-auto");
  });
});
