"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type CipherContextType = {
    metadataKey: CryptoKey | null;
    setMetadataKey: (key: CryptoKey | null) => void;
};

const CipherContext = createContext<CipherContextType | undefined>(undefined);

export function CipherKeyProvider({ children }: { children: ReactNode }) {
    const [metadataKey, setMetadataKey] = useState<CryptoKey | null>(null);

    return <CipherContext.Provider value={{ metadataKey, setMetadataKey }}>{children}</CipherContext.Provider>;
}

export function useCipherKey() {
    const context = useContext(CipherContext);
    if (!context) {
        throw new Error("useCipherKey must be used within a CipherKeyProvider");
    }
    return context;
}
