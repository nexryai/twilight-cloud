import { getSession } from "@/actions/auth";
import { getKeys } from "@/actions/keyring";
import CipherGuard from "@/components/CipherGuard";
import VideoDashboard from "@/components/VideoDashboard";

export default async function Home() {
    const [session, encryptedKeys] = await Promise.all([getSession(), getKeys()]);

    return (
        <div className="mb-32">
            <div className="bg-[#f7f7f7] w-full h-64 flex justify-between">
                <div className="flex items-center ml-14">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold ml-2">My Videos</h1>
                        <div className="flex items-center justify-between gap-2 pl-2 h-8">
                            <span>Welcome back, {session?.user.name}!</span>
                        </div>
                    </div>
                </div>
                <img src="/eve-M-rtWw1OlnQ-unsplash.jpg" alt="bg" className="h-64 w-auto object-cover" />
            </div>
            <div id="home-content">
                <CipherGuard encryptedKeys={encryptedKeys} Component={VideoDashboard} componentProps={{}}>
                    <div className="mt-32 flex space-x-2 justify-center items-center">
                        <span className="sr-only">Loading...</span>
                        <div className="h-1.5 w-1.5  bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="h-1.5 w-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="h-1.5 w-1.5 bg-black rounded-full animate-bounce"></div>
                    </div>
                </CipherGuard>
            </div>
        </div>
    );
}
