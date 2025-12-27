"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function getSession() {
    return await auth.api.getSession({
        headers: await headers(),
    });
}

export async function signIn(_prevState: string | undefined, formData: FormData): Promise<string> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        await auth.api.signInEmail({
            body: {
                email,
                password,
            },
            headers: await headers(),
        });
    } catch (error: unknown) {
        console.error(error);
        return "Failed to login.";
    }

    redirect("/");
}

export async function signUp(_prevState: string | undefined, formData: FormData): Promise<string> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!process.env.ALLOWED_USERS?.split(",").includes(email)) {
        return "This email is not allowed to register.";
    }

    try {
        await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
            headers: await headers(),
        });
    } catch (error: unknown) {
        console.error(error);
        return "Failed to register.";
    }

    redirect("/");
}
