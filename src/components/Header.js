// src/components/Header.js
import Link from 'next/link';

export default function Header() {
  return (
    <header style={{ padding: '1rem', backgroundColor: '#333', color: '#fff' }}>
      <nav>
        <Link href="/" className="text-white hover:underline">
          Home
        </Link>
       
        <Link href="/about" className="text-white hover:underline">
          About
        </Link>
        <Link href="/contact" className="text-white hover:underline">
          Contact
        </Link>
      </nav>
    </header>
  );
}
