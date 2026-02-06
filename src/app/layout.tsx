import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Headless CMS",
  description: "Real-time headless CMS powered by Convex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
