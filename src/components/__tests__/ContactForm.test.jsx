import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import ContactForm from "../ContactForm";
import React from "react";

// Helper functions remain the same
async function render(component) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await new Promise((resolve) => {
    root.render(component);
    setTimeout(resolve, 0);
  });
  return container;
}

function simulateChange(input, value) {
  if (!input) return;
  const event = {
    target: { name: input.name, value },
  };
  const onChange = input._valueTracker?.onChange;
  if (onChange) {
    onChange({ type: "change", target: input });
  }
  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return event;
}

function simulateSubmit(form) {
  if (!form) return;
  const event = new Event("submit", { bubbles: true });
  event.preventDefault = vi.fn();
  form.dispatchEvent(event);
  return event;
}

describe("ContactForm", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = "";
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("renders form elements correctly", async () => {
    const container = await render(<ContactForm />);

    expect(container.querySelector('input[name="name"]')).toBeTruthy();
    expect(container.querySelector('input[name="email"]')).toBeTruthy();
    expect(container.querySelector('input[name="subject"]')).toBeTruthy();
    expect(container.querySelector('textarea[name="message"]')).toBeTruthy();
    expect(container.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it("updates form state when inputs change", async () => {
    const container = await render(<ContactForm />);

    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    simulateChange(nameInput, "John Doe");
    simulateChange(emailInput, "john@example.com");
    simulateChange(subjectInput, "Test Subject");
    simulateChange(messageInput, "Test Message");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nameInput.value).toBe("John Doe");
    expect(emailInput.value).toBe("john@example.com");
    expect(subjectInput.value).toBe("Test Subject");
    expect(messageInput.value).toBe("Test Message");
  });

  it("handles successful form submission", async () => {
    const mockResponse = { ok: true };
    mockFetch.mockResolvedValueOnce(mockResponse);
    const container = await render(<ContactForm />);

    const form = container.querySelector("form");
    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    simulateChange(nameInput, "John Doe");
    simulateChange(emailInput, "john@example.com");
    simulateChange(subjectInput, "Test Subject");
    simulateChange(messageInput, "Test Message");

    await new Promise((resolve) => setTimeout(resolve, 50));

    simulateSubmit(form);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const successMessage = container.querySelector(".text-green-700");
    expect(successMessage).toBeTruthy();
    expect(successMessage.textContent).toContain("Thank you");
  });

  it("handles failed form submission", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to send"));
    const container = await render(<ContactForm />);

    const form = container.querySelector("form");
    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    simulateChange(nameInput, "John Doe");
    simulateChange(emailInput, "john@example.com");
    simulateChange(subjectInput, "Test Subject");
    simulateChange(messageInput, "Test Message");

    await new Promise((resolve) => setTimeout(resolve, 0));

    simulateSubmit(form);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const errorMessage = container.querySelector(".text-red-700");
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toContain("Sorry, there was an error");
  });

  it("disables submit button while sending", async () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const container = await render(<ContactForm />);

    const form = container.querySelector("form");
    const submitButton = container.querySelector('button[type="submit"]');

    const nameInput = container.querySelector('input[name="name"]');
    simulateChange(nameInput, "John Doe");
    await new Promise((resolve) => setTimeout(resolve, 0));

    simulateSubmit(form);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain("Sending");
  });
});
