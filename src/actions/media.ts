"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import { db } from "@/db";

export interface Video {
    _id: ObjectId;
    name: string;
    manifest: string;
    contentType: string;
    createdAt: Date;
    userId: string;
}

export interface Playlist {
    _id: ObjectId;
    name: string;
    userId: string;
    videoIds: ObjectId[];
}

const getUserOrFail = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        console.log("invalid session or not authenticated");
        redirect("/signin");
    }

    return session.user;
};

export async function getVideo(id: string): Promise<Video | null> {
    const user = await getUserOrFail();

    const media = await db.collection<Video>("media").findOne({
        _id: new ObjectId(id),
        userId: user.id,
    });

    if (!media) {
        return null;
    }

    if (media.userId !== user.id) {
        throw new Error("Integrity Check Failed: invalid userId");
    }

    return JSON.parse(JSON.stringify(media)) as Video;
}

export async function getVideos(): Promise<Video[]> {
    const user = await getUserOrFail();
    const videos = await db.collection<Video>("media").find({ userId: user.id }).sort({ name: 1 }).toArray();

    return JSON.parse(JSON.stringify(videos)) as Video[];
}

export async function getPlaylists(): Promise<Playlist[]> {
    const user = await getUserOrFail();
    const playlists = await db.collection<Playlist>("playlists").find({ userId: user.id }).sort({ name: 1 }).toArray();
    return JSON.parse(JSON.stringify(playlists)) as Playlist[];
}

export async function createPlaylist(name: string): Promise<ObjectId> {
    const user = await getUserOrFail();
    const result = await db.collection<Omit<Playlist, "_id">>("playlists").insertOne({
        name,
        userId: user.id,
        videoIds: [],
    });

    return result.insertedId;
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
    const user = await getUserOrFail();
    await db.collection<Playlist>("playlists").updateOne({ _id: new ObjectId(playlistId), userId: user.id }, { $addToSet: { videoIds: new ObjectId(videoId) } });
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    const user = await getUserOrFail();
    await db.collection<Playlist>("playlists").updateOne({ _id: new ObjectId(playlistId), userId: user.id }, { $pull: { videoIds: new ObjectId(videoId) } });
}
