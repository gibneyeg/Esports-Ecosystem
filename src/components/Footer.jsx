// src/components/Footer.jsx
export default function Footer() {
  return (
  <footer className="bg-black text-center text-white lg:text-left min-h-[80px] mt-auto"> {/* Reduced min-height */}
  <div className="flex items-center justify-center border-b-2 border-white/10 p-4 lg:justify-between"> {/* Reduced padding */}
  <div className="me-12 hidden lg:block">
  <span>Get connected with us on social networks:</span>
  </div>
  <div className="flex justify-center">
  <a href="#!" className="me-6 [&>svg]:h-4 [&>svg]:w-4">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 320 512"
  aria-hidden="true"
  >
  <path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z" />
  </svg>
  </a>
  <a href="#!" className="me-6 [&>svg]:h-4 [&>svg]:w-4 ">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 512 512"
  aria-hidden="true"
  >
  <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
  </svg>
  </a>
  <a href="#!" className="me-6 [&>svg]:h-4 [&>svg]:w-4">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 488 512"
  aria-hidden="true"
  >
  <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
  </svg>
  </a>
  <a href="#!" className="me-6 [&>svg]:h-4 [&>svg]:w-4">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 448 512"
  aria-hidden="true"
  >
  <path d="M100.3 448H7.4V148.9h92.9zM53.8 108.1C24.1 108.1 0 83.5 0 53.8a53.8 53.8 0 0 1 107.6 0c0 29.7-24.1 54.3-53.8 54.3zM447.9 448h-92.7V302.4c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.8V148.9h89.1v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3V448z" />
  </svg>
  </a>
  <a href="#!" className="me-6 [&>svg]:h-4 [&>svg]:w-4">
  <svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 448 512"
  aria-hidden="true"
  >
  <path d="M448 256C448 119.1 348.1 0 224 0S0 119.1 0 256s119.1 256 224 256 224-119.1 224-256zm-224 32c-43.6 0-79-35.4-79-79s35.4-79 79-79 79 35.4 79 79-35.4 79-79 79z" />
  </svg>
  </a>
  </div>
  </div>
  <div className="p-2 text-center"> {/* Reduced padding */}
  © {new Date().getFullYear()} Your Company. All Rights Reserved.
  </div>
  </footer>
  );
  }