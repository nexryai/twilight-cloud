import { notFound } from "next/navigation";

import { getKeys } from "@/actions/keyring";
import { getVideo } from "@/actions/media";
import PlayerPageClient from "./client";

export default async function PlayerPage({ params }: { params: { mediaId: string } }) {
    const { mediaId } = await params;
    const [encryptedKeys, video] = await Promise.all([getKeys(), getVideo(mediaId)]);

    if (!video) {
        notFound();
    }

    return <PlayerPageClient encryptedKeys={encryptedKeys} video={video} mediaId={mediaId} />;
}
