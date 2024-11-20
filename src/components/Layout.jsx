"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

export default function Layout({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    // Store the current path if it's not the login page
    if (pathname && !pathname.includes("/login")) {
      const isProtectedRoute =
        pathname.includes("/tournament/create") ||
        (pathname.includes("/tournament/") && pathname.includes("/edit"));

      if (isProtectedRoute) {
        sessionStorage.setItem("redirectUrl", pathname);
      }
    }
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow p-0">{children}</main>
      <Footer />
    </div>
  );
}
