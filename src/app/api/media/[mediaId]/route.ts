/** biome-ignore-all lint/style/noNonNullAssertion: <¯\_(ツ)_/¯> */
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { AwsClient } from "aws4fetch";
import { ObjectId } from "mongodb";

import type { Video } from "@/actions/media";
import { auth } from "@/auth";
import { db } from "@/db";

const aws = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_S3_REGION!,
});

const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT!;
const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mediaId } = await params;
    const filename = request.nextUrl.searchParams.get("filename");

    if (!filename) {
        return NextResponse.json({ error: "Filename query parameter is required" }, { status: 400 });
    }

    try {
        const video = await db.collection<Video>("videos").findOne({
            _id: new ObjectId(mediaId),
            userId: session.user.id,
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found or access denied" }, { status: 404 });
        }

        const objectKey = `${mediaId}/${filename}`;
        const url = new URL(`${S3_ENDPOINT}/${BUCKET_NAME}/${objectKey}`);

        url.searchParams.set("X-Amz-Expires", "3600");

        const signedRequest = await aws.sign(url.toString(), {
            method: "GET",
            aws: {
                signQuery: true,
                service: "s3",
            },
        });

        return NextResponse.json({ url: signedRequest.url });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
