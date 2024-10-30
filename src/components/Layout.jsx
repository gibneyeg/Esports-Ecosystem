// src/components/Layout.js
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

export default function Layout({ children }) {
  return (
    <div>
      <Header />
      <main style={{ minHeight: "80vh", padding: "2rem" }}>{children}</main>
      <Footer />
    </div>
  );
}
