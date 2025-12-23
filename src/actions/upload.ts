/** biome-ignore-all lint/style/noNonNullAssertion: Ignore */
"use server";

import { headers } from "next/headers";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import { client } from "@/db";

const s3Client = new S3Client({
    endpoint: process.env.AWS_S3_ENDPOINT!,
    region: process.env.AWS_S3_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function getPresignedUrls(files: string[], type: string, title: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("invalid session or not authenticated");
    }

    const videoId = new ObjectId();
    const manifest = files.find((file) => file.endsWith(".mpd"));

    if (!manifest) {
        throw new Error("Manifest file not found");
    }

    const urls = await Promise.all(
        files.map(async (file) => {
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `${videoId.toHexString()}/${file}`,
                ContentType: file.endsWith(".mpd") ? "application/dash+xml" : "application/octet-stream",
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 7200 });
            return {
                url,
                filename: file,
            };
        }),
    );

    const videos = client.db().collection("videos");
    await videos.insertOne({
        _id: videoId,
        name: title,
        manifest: `${videoId.toHexString()}/${manifest}`,
        contentType: type,
        createdAt: new Date(),
        userId: session.user.id,
    });

    return {
        urls,
        manifestPath: `${videoId.toHexString()}/${manifest}`,
    };
}
