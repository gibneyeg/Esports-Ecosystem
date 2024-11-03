import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black">
      <div className="max-w-screen-xl px-4 py-6 mx-auto sm:px-6 lg:px-8 min-h-[60px]">
        <nav className="flex flex-wrap justify-center gap-4 mb-6">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/About" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            About
          </Link>
          <Link 
            href="/tournament" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Tournaments
          </Link>
          <Link 
            href="/leaderBoard" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            LeaderBoard
          </Link>
          <Link 
            href="/Contact" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Contact
          </Link>
        </nav>
        <p className="text-sm text-center text-gray-400">
          © {new Date().getFullYear()} SomeCompany, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}