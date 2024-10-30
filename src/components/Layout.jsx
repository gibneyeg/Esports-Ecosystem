
// src/components/Layout.js
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

export default function Layout({ children }) {
return (
<div className="flex flex-col min-h-screen">
<Header />
<main className="flex-grow" style={{ padding: "2rem" }}>
{children}
</main>
<Footer />
</div>
);
}
