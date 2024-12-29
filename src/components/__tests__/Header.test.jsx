import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import Header from "../Header";
import React from "react";
import { useSession, signOut } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
    useSession: vi.fn(),
    signOut: vi.fn()
  }));
  
  // Mock next/image
  vi.mock("next/image", () => ({
    default: (props) => {
      return React.createElement("img", { ...props, src: props.src || "" });
    }
  }));
  
  // Helper functions
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
  
  function simulateClick(element) {
    if (!element) return;
    const event = new MouseEvent("click", { bubbles: true });
    element.dispatchEvent(event);
    return event;
  }
  
  describe("Header", () => {
    const mockUpdate = vi.fn();
    const mockSession = {
      data: {
        user: {
          email: "test@example.com",
          username: "testuser",
          image: "https://example.com/image.jpg",
          rank: "Gold",
          points: 100
        }
      },
      status: "authenticated",
      update: mockUpdate
    };
  
    beforeEach(() => {
      document.body.innerHTML = "";
      vi.clearAllMocks();
      useSession.mockReturnValue(mockSession);
      global.URL.createObjectURL = vi.fn(() => "blob:test");
      global.URL.revokeObjectURL = vi.fn();
    });
  
    it("renders user profile when logged in", async () => {
      const container = await render(<Header />);
      
      const profileButton = container.querySelector(".profile-menu-container button");
      expect(profileButton).toBeTruthy();
      expect(profileButton.textContent).toContain("testuser");
    });
  
    it("shows profile menu on click", async () => {
      const container = await render(<Header />);
      
      const profileButton = container.querySelector(".profile-menu-container button");
      simulateClick(profileButton);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const menu = container.querySelector(".absolute.right-0.mt-2");
      expect(menu).toBeTruthy();
      expect(menu.textContent).toContain("testuser");
      expect(menu.textContent).toContain("Gold");
      expect(menu.textContent).toContain("100");
    });
  
    it("shows profile uploader on click", async () => {
      const container = await render(<Header />);
      
      const profileButton = container.querySelector(".profile-menu-container button");
      simulateClick(profileButton);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uploaderButton = container.querySelector('button.text-gray-700');
      simulateClick(uploaderButton);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uploader = container.querySelector('.bg-white.rounded-lg.shadow-lg.p-4');
      expect(uploader).toBeTruthy();
    });
  
   
    it("handles logout", async () => {
      const container = await render(<Header />);
      
      const profileButton = container.querySelector(".profile-menu-container button");
      simulateClick(profileButton);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const logoutButton = container.querySelector('.text-red-600');
      simulateClick(logoutButton);
      
      expect(signOut).toHaveBeenCalledWith({
        redirect: true,
        callbackUrl: "/"
      });
    });
  });