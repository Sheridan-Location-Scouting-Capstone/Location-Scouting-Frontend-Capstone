import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Font Object Initializations
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: '--font-roboto', // variable is important for use with TailWindCss  in globals.css
  subsets: ["latin"]
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ["latin"]
});
// End font initialization

export const metadata: Metadata = {
  title: "Location Scouting Application",
  description: "Location Scouting Capstone Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${robotoMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
