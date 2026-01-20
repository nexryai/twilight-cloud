import { getKeys } from "@/actions/keyring";
import { getPlaylists, getVideos } from "@/actions/media";
import CipherGuard from "@/components/CipherGuard";
import VideoDashboard from "@/components/VideoDashboard";

export default async function Home() {
    const [encryptedKeys, videos, playlists] = await Promise.all([getKeys(), getVideos(), getPlaylists()]);

    return (
        <div className="mb-32">
            <div className="bg-[#f7f7f7] w-full h-32 flex justify-between">
                <div className="flex items-center ml-14">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold ml-2">My Videos</h1>
                    </div>
                </div>
                <img src="/eve-M-rtWw1OlnQ-unsplash.jpg" alt="bg" className="h-32 w-auto object-cover mr-1" />
            </div>
            <div id="home-content">
                <CipherGuard encryptedKeys={encryptedKeys} Component={VideoDashboard} componentProps={{ videos, initialPlaylists: playlists }}>
                    <div className="hidden mt-32 flex space-x-2 justify-center items-center">
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
