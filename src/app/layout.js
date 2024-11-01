import "./globals.css";

export const metadata = {
  title: "WarriorTournaments",
  description: "A brief description of your website.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
