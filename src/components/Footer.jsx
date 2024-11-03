export default function Footer() {
  return (
    <footer className="bg-black">
      <div className="max-w-screen-xl px-4 py-6 mx-auto sm:px-6 lg:px-8 min-h-[60px]">
        <nav className="flex flex-wrap justify-center gap-4 mb-6">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Home</a>
          <a href="/About" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">About</a>
          <a href="/tournament" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Tournaments</a>
          <a href="/leaderBoard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">LeaderBoard</a>
          <a href="/Contact" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Contact</a>
        </nav>
        
        <p className="text-sm text-center text-gray-400">
          © 2024 SomeCompany, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}