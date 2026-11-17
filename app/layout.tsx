import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jackpot | Daily Checker",
  description: "Track daily Mega Millions and Powerball jackpots, cash values, and estimated after-tax amounts."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
