"use client";
import dynamic from "next/dynamic";

const Uploader = dynamic(() => import("@/components/VideoUploader"), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
});

export default function Page() {
    return <Uploader />;
}
