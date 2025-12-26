"use server";

import { headers } from "next/headers";

import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import { aws, BUCKET_NAME, S3_ENDPOINT } from "@/aws";
import { client } from "@/db";

const generateSignedUrl = async (objectKey: string, expires: number = 300): Promise<string> => {
    const url = new URL(`${S3_ENDPOINT}/${BUCKET_NAME}/${objectKey}`);
    url.searchParams.set("X-Amz-Expires", expires.toString());

    const signedRequest = await aws.sign(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        aws: { signQuery: true, service: "s3" },
    });
    return signedRequest.url;
};

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

    const url = await generateSignedUrl(objectKey, 30);

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

    const url = await generateSignedUrl(objectKey, 300);

    return { url };
}
