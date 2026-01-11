// components/Footer.tsx
"use client";

import { usePathname } from "next/navigation";

export default () => {
    const pathname = usePathname();

    if (pathname === "/signin") {
        return null;
    }

    return (
        <footer className="border-t border-gray-200 py-12 px-16 flex justify-between items-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} nexryai All rights reserved.</p>
            <p className="font-medium text-gray-400">Project of Ablaze</p>
        </footer>
    );
};
