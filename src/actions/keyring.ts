"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Binary } from "mongodb";

import { auth } from "@/auth";
import { db } from "@/db";

import { Buffer } from "node:buffer";

export interface PasswordEncryptedKey {
    salt: Binary;
    iv: Binary;
    ciphertext: Binary;
}

export interface WebAuthnEncryptedKey {
    credentialId: Binary;
    iv: Binary;
    ciphertext: Binary;
}

const KeyTypes = {
    CEK: "CEK",
    MEK: "MEK",
} as const;

export type KeyType = keyof typeof KeyTypes;

export interface KeyRing {
    _id: string;
    passwordEncryptedKey?: PasswordEncryptedKey;
    passwordEncryptedMetadataKey?: PasswordEncryptedKey;
    webauthnEncryptedKey?: WebAuthnEncryptedKey;
    webauthnEncryptedMetadataKey?: WebAuthnEncryptedKey;
}

type PasswordEncryptedKeyString = { salt: string; iv: string; ciphertext: string };
type WebAuthnEncryptedKeyString = { credentialId: string; iv: string; ciphertext: string };

export interface EncryptedKeys {
    id: string;
    passwordEncryptedKey?: PasswordEncryptedKeyString;
    passwordEncryptedMetadataKey?: PasswordEncryptedKeyString;
    webauthnEncryptedKey?: WebAuthnEncryptedKeyString;
    webauthnEncryptedMetadataKey?: WebAuthnEncryptedKeyString;
}

const getUserOrFail = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/signin");
        throw new Error("invalid session or not authenticated");
    }

    return session.user;
};

export async function getKeys(): Promise<EncryptedKeys | null> {
    const user = await getUserOrFail();
    const keyRing = await db.collection<KeyRing>("keyrings").findOne({ _id: user.id });

    if (!keyRing) {
        return null;
    }

    return JSON.parse(
        JSON.stringify(keyRing, (key, value) => {
            if (value?.constructor && value.constructor.name === "Binary") {
                return (value as Binary).toString("base64");
            }

            if (key === "_id") return value;
            return value;
        }),
    ) as EncryptedKeys;
}

export async function savePasswordEncryptedKey(keyData: PasswordEncryptedKeyString, keyType: KeyType): Promise<void> {
    const user = await getUserOrFail();
    const { salt, iv, ciphertext } = keyData;

    const binaryData: PasswordEncryptedKey = {
        salt: new Binary(Buffer.from(salt, "base64")),
        iv: new Binary(Buffer.from(iv, "base64")),
        ciphertext: new Binary(Buffer.from(ciphertext, "base64")),
    };

    const field = keyType === "CEK" ? "passwordEncryptedKey" : "passwordEncryptedMetadataKey";

    await db.collection<KeyRing>("keyrings").updateOne({ _id: user.id }, { $set: { [field]: binaryData } }, { upsert: true });
}

export async function saveWebAuthnEncryptedKey(keyData: WebAuthnEncryptedKeyString, keyType: KeyType): Promise<void> {
    const user = await getUserOrFail();
    const { credentialId, iv, ciphertext } = keyData;

    const binaryData: WebAuthnEncryptedKey = {
        credentialId: new Binary(Buffer.from(credentialId, "base64")),
        iv: new Binary(Buffer.from(iv, "base64")),
        ciphertext: new Binary(Buffer.from(ciphertext, "base64")),
    };

    const field = keyType === "CEK" ? "webauthnEncryptedKey" : "webauthnEncryptedMetadataKey";

    await db.collection<KeyRing>("keyrings").updateOne({ _id: user.id }, { $set: { [field]: binaryData } }, { upsert: true });
}
