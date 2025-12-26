import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Twilight Cloud",
    description: "Self-hosted video storage and playback web app with end-to-end encryption",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <div className="flex h-full flex-col bg-white font-sans text-neutral-900">
                    <div className="flex-1 min-h-screen">{children}</div>
                    <footer className="border-t border-gray-200 py-12 px-16 flex justify-between items-center text-sm text-gray-500">
                        <p>&copy; {new Date().getFullYear()} nexryai All rights reserved.</p>
                        <p className="font-medium text-gray-400">Project of Ablaze</p>
                    </footer>
                </div>
            </body>
        </html>
    );
}
