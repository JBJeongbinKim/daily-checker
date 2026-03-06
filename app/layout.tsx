import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Checker",
  description: "Track daily Mega Millions and Powerball jackpot trends."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
