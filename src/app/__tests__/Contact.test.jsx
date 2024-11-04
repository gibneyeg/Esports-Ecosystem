import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createElement } from "react";
import Contact from "/home/catheater/esports-ecosystem/src/app/Contact/page.jsx";

vi.mock("@/components/ContactForm", () => ({
  default: () => createElement("div", { "data-testid": "contact-form" }, "Contact Form")
}));

vi.mock("/src/components/Layout.jsx", () => ({
  default: ({ children }) => createElement("div", { "data-testid": "layout" }, children)
}));

describe("Contact Page", () => {
  it("renders the contact page with title", () => {
    const page = Contact();
    const layoutChildren = page.props.children;
    const divChildren = layoutChildren.props.children;

    // Find h1 element
    const h1Element = divChildren.find(child => 
      child.type === 'h1' && child.props.children === 'Contact Us'
    );

    expect(h1Element).toBeDefined();
    expect(h1Element.props.children).toBe('Contact Us');
  });

  it("renders the contact description", () => {
    const page = Contact();
    const layoutChildren = page.props.children;
    const divChildren = layoutChildren.props.children;

    // Find p element
    const pElement = divChildren.find(child => 
      child.type === 'p' && 
      typeof child.props.children === 'string' &&
      child.props.children.includes("We'd love to hear from you")
    );

    expect(pElement).toBeDefined();
    expect(pElement.props.className).toBe('mb-8');
  });

  it("has correct structure", () => {
    const page = Contact();
    const layoutChildren = page.props.children;
    
    // Check div wrapper
    expect(layoutChildren.type).toBe('div');
    expect(layoutChildren.props.className).toBe('max-w-4xl mx-auto px-4 py-8');
    
    // Check children array length
    const divChildren = layoutChildren.props.children;
    expect(divChildren).toHaveLength(3); // h1, p, and ContactForm
  });
});