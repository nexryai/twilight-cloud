"use server";

import { headers } from "next/headers";

import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import { client } from "@/db";
import { generateSignedUrl } from "@/s3";

export async function createMedia(manifestName: string, type: string, title: string): Promise<{ mediaId: string; url: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");

    const mediaId = new ObjectId();
    const objectKey = `${mediaId.toHexString()}/${manifestName}`;

    const media = client.db().collection("media");
    await media.insertOne({
        _id: mediaId,
        name: title,
        manifest: objectKey,
        contentType: type,
        createdAt: new Date(),
        userId: session.user.id,
    });

    const url = await generateSignedUrl(objectKey, "PUT", 30);

    return {
        mediaId: mediaId.toHexString(),
        url,
    };
}

export async function getChunkUploadUrl(mediaId: string, filename: string): Promise<{ url: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Unauthorized");

    if (filename.includes("/") || filename.includes("..")) {
        throw new Error("Invalid filename");
    }

    const objectKey = `${mediaId}/${filename}`;

    const url = await generateSignedUrl(objectKey, "PUT", 300);

    return { url };
}
