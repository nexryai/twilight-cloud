import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { ObjectId } from "mongodb";

import type { Video } from "@/actions/media";
import { auth } from "@/auth";
import { db } from "@/db";
import { generateSignedUrl } from "@/s3";

export async function GET(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }): Promise<NextResponse<{ url?: string; error?: string }>> {
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
        const video = await db.collection<Video>("media").findOne({
            _id: new ObjectId(mediaId),
            userId: session.user.id,
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found or access denied" }, { status: 404 });
        }

        return NextResponse.json({ url: await generateSignedUrl(`${mediaId}/${filename}`, "GET", 60) });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
