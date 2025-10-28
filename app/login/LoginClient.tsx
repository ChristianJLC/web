// web/app/login/LoginClient.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const params = useSearchParams();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const res = await signIn("credentials", {
            username,
            password,
            redirect: false,
        });

        setLoading(false);

        if (res?.ok) {
            router.replace("/dashboard");  // en vez de usar params.get("callbackUrl")
        } else {
            setError("Usuario o contraseña inválidos");
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 backdrop-blur text-white">
                <h1 className="text-3xl font-semibold mb-6 text-center">Iniciar sesión</h1>

                {(error || params.get("error")) && (
                    <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                        {error || "Usuario o contraseña inválidos"}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-4">
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Usuario"
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                        autoFocus
                    />
                    <div className="relative">
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type={showPwd ? "text" : "password"}
                            placeholder="•••••••••"
                            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70"
                        >
                            {showPwd ? "Ocultar" : "Ver"}
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl bg-white/90 px-4 py-3 text-slate-900 font-semibold disabled:opacity-60"
                    >
                        {loading ? "Entrando…" : "Entrar"}
                    </button>
                </form>
            </div>
        </main>
    );
}
