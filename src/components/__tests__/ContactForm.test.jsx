import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import ContactForm from '../ContactForm';
import React from 'react';

// Helper function to render component and return container
async function render(component) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await new Promise(resolve => {
    root.render(component);
    setTimeout(resolve, 0);
  });
  return container;
}

// Helper function to simulate input change
function simulateChange(input, value) {
  if (!input) return;
  const event = {
    target: { name: input.name, value }
  };
  const onChange = input._valueTracker?.onChange;
  if (onChange) {
    onChange({ type: 'change', target: input });
  }
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return event;
}

// Helper function to simulate form submission
function simulateSubmit(form) {
  if (!form) return;
  const event = new Event('submit', { bubbles: true });
  event.preventDefault = vi.fn();
  form.dispatchEvent(event);
  return event;
}

describe('ContactForm', () => {
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    document.body.innerHTML = '';
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('renders form elements correctly', async () => {
    const container = await render(<ContactForm />);
    
    expect(container.querySelector('input[name="name"]')).toBeTruthy();
    expect(container.querySelector('input[name="email"]')).toBeTruthy();
    expect(container.querySelector('input[name="subject"]')).toBeTruthy();
    expect(container.querySelector('textarea[name="message"]')).toBeTruthy();
    expect(container.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('updates form state when inputs change', async () => {
    const container = await render(<ContactForm />);
    
    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    simulateChange(nameInput, 'John Doe');
    simulateChange(emailInput, 'john@example.com');
    simulateChange(subjectInput, 'Test Subject');
    simulateChange(messageInput, 'Test Message');

    // Wait for React state updates
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(subjectInput.value).toBe('Test Subject');
    expect(messageInput.value).toBe('Test Message');
  });
  it('handles successful form submission', async () => {
    const mockResponse = { ok: true };
    mockFetch.mockResolvedValueOnce(mockResponse);
    const container = await render(<ContactForm />);
    
    const form = container.querySelector('form');
    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    // Fill form fields
    simulateChange(nameInput, 'John Doe');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    simulateChange(emailInput, 'john@example.com');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    simulateChange(subjectInput, 'Test Subject');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    simulateChange(messageInput, 'Test Message');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Submit form
    const submitEvent = simulateSubmit(form);
    expect(submitEvent.preventDefault).toHaveBeenCalled();

    // Wait for fetch call
    await new Promise(resolve => setTimeout(resolve, 50));

    // expect(mockFetch).toHaveBeenCalledWith('/api/contact', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     name: 'John Doe',
    //     email: 'john@example.com',
    //     subject: 'Test Subject',
    //     message: 'Test Message',
    //   }),
    // });

    // Wait for success message to appear
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const successMessage = container.querySelector('.text-green-600');
    expect(successMessage).toBeTruthy();
    expect(successMessage.textContent).toContain('Thank you');
  });

  it('handles failed form submission', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to send'));
    const container = await render(<ContactForm />);

    const form = container.querySelector('form');
    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    // Fill form fields
    simulateChange(nameInput, 'John Doe');
    simulateChange(emailInput, 'john@example.com');
    simulateChange(subjectInput, 'Test Subject');
    simulateChange(messageInput, 'Test Message');

    // Wait for state updates
    await new Promise(resolve => setTimeout(resolve, 0));

    simulateSubmit(form);

    // Wait for error message
    await new Promise(resolve => setTimeout(resolve, 0));

    const errorMessage = container.querySelector('.text-red-600');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toContain('Sorry, there was an error');
  });

  it('disables submit button while sending', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const container = await render(<ContactForm />);

    const form = container.querySelector('form');
    const submitButton = container.querySelector('button[type="submit"]');
    
    // Fill form fields to allow submission
    const nameInput = container.querySelector('input[name="name"]');
    simulateChange(nameInput, 'John Doe');
    await new Promise(resolve => setTimeout(resolve, 0));
    
    simulateSubmit(form);

    // Wait for button state update
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Sending');
  });

  it('validates required fields', async () => {
    const container = await render(<ContactForm />);
    const form = container.querySelector('form');
    
    // Create a mock submit event with preventDefault
    const mockSubmitEvent = new Event('submit', { bubbles: true });
    mockSubmitEvent.preventDefault = vi.fn();
    
    // Dispatch the mock event
    form.dispatchEvent(mockSubmitEvent);
    
    // Wait for potential state updates
    await new Promise(resolve => setTimeout(resolve, 0));

    const nameInput = container.querySelector('input[name="name"]');
    const emailInput = container.querySelector('input[name="email"]');
    const subjectInput = container.querySelector('input[name="subject"]');
    const messageInput = container.querySelector('textarea[name="message"]');

    expect(nameInput.required).toBe(true);
    expect(emailInput.required).toBe(true);
    expect(subjectInput.required).toBe(true);
    expect(messageInput.required).toBe(true);

  });
});