"use client";

import { useEffect, useState } from "react";

import { decryptMetadata } from "@/cipher/block";
import { useCipherKey } from "@/context/CipherContext";

export default ({ encryptedData }: { encryptedData: string }) => {
    const { metadataKey } = useCipherKey();
    const [decrypted, setDecrypted] = useState<string>("...");

    useEffect(() => {
        if (!metadataKey) return;

        let isMounted = true;
        decryptMetadata(encryptedData, metadataKey)
            .then((text) => {
                if (isMounted) setDecrypted(text);
            })
            .catch((err) => {
                console.error(err);
                if (isMounted) setDecrypted("Failed to Decrypt");
            });

        return () => {
            isMounted = false;
        };
    }, [encryptedData, metadataKey]);

    return <>{decrypted}</>;
};
