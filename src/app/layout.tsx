import type { Metadata } from "next";
import { JetBrains_Mono, Courier_Prime } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "YieldChaser",
  description: "Compare stablecoin lending yields across DeFi protocols and chains",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} ${courierPrime.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
