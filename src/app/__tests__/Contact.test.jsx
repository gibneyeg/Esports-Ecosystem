import { describe, it, expect, vi } from "vitest";
import React from "react";
import { createElement } from "react";
import Contact from "/home/catheater/esports-ecosystem/src/app/Contact/page.jsx";

vi.mock("/src/components/ContactForm", () => ({
  default: () =>
    createElement("div", { "data-testid": "contact-form" }, "Contact Form"),
}));

describe("Contact Page", () => {
  const renderContact = () => {
    return Contact();
  };

  it("renders the contact page with correct title", () => {
    const container = renderContact();
    const titleSection = container.props.children.props.children[0];
    const h1Element = titleSection.props.children[0];

    expect(h1Element.type).toBe("h1");
    expect(h1Element.props.className).toBe(
      "text-4xl font-bold text-gray-900 mb-4"
    );
    expect(h1Element.props.children).toBe("Get in Touch");
  });

  it("renders the contact description", () => {
    const container = renderContact();
    const titleSection = container.props.children.props.children[0];
    const descriptionElement = titleSection.props.children[1];

    expect(descriptionElement.type).toBe("p");
    expect(descriptionElement.props.className).toBe(
      "text-lg text-gray-600 max-w-2xl mx-auto"
    );
    expect(typeof descriptionElement.props.children).toBe("string");
    expect(descriptionElement.props.children).toContain(
      "We'd love to hear from you"
    );
  });

  it("has the correct grid structure", () => {
    const container = renderContact();

    // Check main container classes
    expect(container.props.className).toBe(
      "min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8"
    );

    // Check the grid container
    const contentCard = container.props.children.props.children[1];
    const gridContainer = contentCard.props.children;
    expect(gridContainer.props.className).toBe(
      "grid grid-cols-1 lg:grid-cols-2"
    );
  });

  it("renders contact information section", () => {
    const container = renderContact();
    const contentCard = container.props.children.props.children[1];
    const contactSection = contentCard.props.children.props.children[0];

    expect(contactSection.props.className).toBe("bg-gray-900 p-8 lg:p-12");

    // Check contact info content
    const contactContent = contactSection.props.children;
    expect(contactContent.props.className).toBe("text-white");
    expect(contactContent.props.children[0].props.children).toBe(
      "Contact Information"
    );
  });

  it("renders ContactForm component", () => {
    const container = renderContact();
    const contentCard = container.props.children.props.children[1];
    const formSection = contentCard.props.children.props.children[1];

    expect(formSection.props.className).toBe("p-8 lg:p-12");
    expect(formSection.props.children).toBeTruthy();
  });

  it("has correct overall structure", () => {
    const container = renderContact();

    // Check main container
    expect(container.type).toBe("div");

    // Check content wrapper
    const contentWrapper = container.props.children;
    expect(contentWrapper.props.className).toBe("max-w-4xl mx-auto");

    // Check main sections
    const sections = contentWrapper.props.children;
    expect(sections).toHaveLength(2); // Title section and content card

    // Check content card styling
    expect(sections[1].props.className).toBe(
      "bg-white rounded-2xl shadow-xl overflow-hidden"
    );
  });
});
