"use client";

import dynamic from "next/dynamic";

const Uploader = dynamic(() => import("@/components/VideoUploader"), {
    ssr: false,
    loading: () => <p className="text-center p-12 text-gray-500">Loading uploader...</p>,
});

const UploadView = ({ contentKey, metadataKey }: { contentKey: CryptoKey; metadataKey: CryptoKey }) => {
    return (
        <div className="max-w-400 mx-auto px-6 md:px-16 pt-12">
            <Uploader contentKey={contentKey} metadataKey={metadataKey} />
        </div>
    );
};

export default UploadView;
