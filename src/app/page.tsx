import { IconUserCircle } from "@tabler/icons-react";

import { getSession } from "@/actions/auth";
import { getKeys } from "@/actions/keyring";
import CipherGuard from "@/components/CipherGuard";
import VideoDashboard from "@/components/VideoDashboard";

export default async function Home() {
    const [session, encryptedKeys] = await Promise.all([getSession(), getKeys()]);

    return (
        <div className="mb-32">
            <div className="bg-[#f7f7f7] w-full h-64 flex justify-between">
                <div className="flex items-center ml-16">
                    <div className="flex flex-col gap-4">
                        <h1 className="text-2xl font-bold">My Videos</h1>
                        <div className="flex items-center gap-2 roudend-full hover:bg-gray-200/50 cursor-pointer">
                            <IconUserCircle />
                            {session?.user.name}
                        </div>
                    </div>
                </div>
                <img src="/eve-M-rtWw1OlnQ-unsplash.jpg" alt="bg" className="h-64 w-auto object-cover" />
            </div>
            <div id="home-content">
                <CipherGuard encryptedKeys={encryptedKeys} Component={VideoDashboard} componentProps={{}} >
                    <div className="bg-gray-200 aspect-video animate-pulse" />
                </CipherGuard>
            </div>
        </div>
    );
}
