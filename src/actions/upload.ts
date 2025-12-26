/** biome-ignore-all lint/style/noNonNullAssertion: Ignore */
"use server";

import { headers } from "next/headers";

import { AwsClient } from "aws4fetch";
import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import { client } from "@/db";

const aws = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_S3_REGION!,
});

const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT!;
const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function getPresignedUrls(files: string[], type: string, title: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error("invalid session or not authenticated");
    }

    const mediaId = new ObjectId();
    const manifest = files.find((file) => file.endsWith(".mpd"));

    if (!manifest) {
        throw new Error("Manifest file not found");
    }

    const urls = await Promise.all(
        files.map(async (file) => {
            const objectKey = `${mediaId.toHexString()}/${file}`;
            const url = new URL(`${S3_ENDPOINT}/${BUCKET_NAME}/${objectKey}`);

            url.searchParams.set("X-Amz-Expires", "3600");

            const signedRequest = await aws.sign(url.toString(), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/octet-stream",
                },
                aws: {
                    signQuery: true,
                    service: "s3",
                },
            });

            return {
                url: signedRequest.url,
                filename: file,
            };
        }),
    );

    const media = client.db().collection("media");
    await media.insertOne({
        _id: mediaId,
        name: title,
        manifest: `${mediaId.toHexString()}/${manifest}`,
        contentType: type,
        createdAt: new Date(),
        userId: session.user.id,
    });

    return {
        urls,
        manifestPath: `${mediaId.toHexString()}/${manifest}`,
    };
}
