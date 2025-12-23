"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { AnimatePresence, motion } from "motion/react";

import { signIn, signUp } from "@/actions/auth";

function SubmitButton({ type }: { type: "signin" | "signup" }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors duration-300 disabled:bg-gray-400">
            {pending ? "Submitting..." : type === "signin" ? "Sign in" : "Sign up"}
        </button>
    );
}

const formVariants = {
    hidden: { opacity: 0, x: -10 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
};

export default function SignInPage() {
    const [signInState, signInAction] = useActionState(signIn, undefined);
    const [signUpState, signUpAction] = useActionState(signUp, undefined);
    const [formType, setFormType] = useState<"signin" | "signup">("signin");

    return (
        <div className="bg-[url(/carlos-torres-MHNjEBeLTgw-unsplash.jpg)] bg-cover bg-center flex min-h-screen items-center justify-center font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-white/50 backdrop-blur-lg z-10" />

            <div className="bg-white shadow-lg rounded-2xl w-full max-w-md z-20 min-h-[520px] overflow-hidden">
                <div className="p-8">
                    <h1 className="text-2xl font-bold text-center mb-2">Welcome to Twilight Cloud</h1>

                    <div className="h-6 mb-8 text-center text-gray-600 relative">
                        <AnimatePresence mode="wait">
                            <motion.p key={formType} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute w-full">
                                {formType === "signin" ? "Sign in to your account" : "Create a new account"}
                            </motion.p>
                        </AnimatePresence>
                    </div>

                    <div className="flex border-b border-gray-200 mb-6 relative">
                        {(["signin", "signup"] as const).map((type) => (
                            <button key={type} onClick={() => setFormType(type)} className={`flex-1 py-2 text-center text-sm font-medium relative transition-colors ${formType === type ? "text-black" : "text-gray-500"}`}>
                                {type === "signin" ? "Sign In" : "Sign Up"}
                                {formType === type && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={formType} variants={formVariants} initial="hidden" animate="enter" exit="exit" transition={{ duration: 0.2, ease: "easeOut" }}>
                            {formType === "signin" ? (
                                <form action={signInAction} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input id="email" name="email" type="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Password
                                        </label>
                                        <input id="password" name="password" type="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm" />
                                    </div>
                                    {signInState && <p className="text-red-500 text-xs">{signInState}</p>}
                                    <SubmitButton type="signin" />
                                </form>
                            ) : (
                                <form action={signUpAction} className="space-y-4">
                                    <div>
                                        <label htmlFor="name-signup" className="block text-sm font-medium text-gray-700">
                                            Full Name
                                        </label>
                                        <input id="name-signup" name="name" type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input id="email-signup" name="email" type="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700">
                                            Password
                                        </label>
                                        <input id="password-signup" name="password" type="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black sm:text-sm" />
                                    </div>
                                    {signUpState && <p className="text-red-500 text-xs">{signUpState}</p>}
                                    <SubmitButton type="signup" />
                                </form>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
