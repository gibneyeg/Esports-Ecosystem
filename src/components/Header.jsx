import Link from "next/link";
import logo from "../Img/fakeLogo1.jpeg"; // Adjust path as needed
import styles from "./styles/Header.module.css"; // Import your CSS module

export default function Header() {
  return (
    <header className="bg-black">
      <nav className="flex justify-between items-center px-4 lg:px-6 py-2.5">
        <Link href="/" className={`flex items-center ${styles.logo}`}>
          <img src={logo.src} className="h-6 sm:h-9" alt="Fake Logo" />
        </Link>

        <div className="flex-grow flex justify-center">
          <ul className="flex space-x-8">
            <li>
              <Link
                href="/"
                className="block py-2 text-gray-400 hover:text-white"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/About"
                className="block py-2 text-gray-400 hover:text-white"
              >
                Company
              </Link>
            </li>
            <li>
              <Link
                href="/leaderBoard"
                className="block py-2 text-gray-400 hover:text-white"
              >
                LeaderBoard
              </Link>
            </li>

            <li>
              <Link
                href="/tournament"
                className="block py-2 text-gray-400 hover:text-white"
              >
                tournaments
              </Link>
            </li>
            <li>
              <Link
                href="/Contact"
                className="block py-2 text-gray-400 hover:text-white"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Login and Sign-up Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-gray-800 hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 text-white"
          >
            Log in
          </Link>
          <Link
            href="#"
            className="text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
