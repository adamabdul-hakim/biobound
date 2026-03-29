import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "SafeSource — The Forever Chemicals Audit",
  description: "Discover your PFAS exposure and get a personalized action plan in under 3 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme — reads localStorage before first paint */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{if(localStorage.getItem('safesource-theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
