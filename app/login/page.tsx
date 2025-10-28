"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
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
            redirect: false, // 👈 controlamos la redirección manualmente
        });

        setLoading(false);

        if (res?.ok) {
            const cb = params.get("callbackUrl") || "/dashboard";
            router.push(cb);
        } else {
            setError("Usuario o contraseña inválidos");
        }
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center">
            {/* Fondo */}
            <Image
                src="/fondo-login.jpg"
                alt="Fondo login"
                fill
                priority
                className="object-cover"
            />
            {/* Oscurecedor */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Tarjeta de login */}
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Iniciar sesión
                    </h1>
                    <p className="mt-1 text-sm text-white/70">Accede al sistema</p>
                </div>

                {(error || params.get("error")) && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                        <svg className="mt-0.5 h-4 w-4 flex-none" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M11 7h2v6h-2zm0 8h2v2h-2z" />
                            <path fill="currentColor" d="M1 21h22L12 2z" />
                        </svg>
                        <span>{error || "Usuario o contraseña inválidos"}</span>
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-4">
                    <label className="grid gap-1.5">
                        <span className="text-sm text-white/80">Usuario</span>
                        <div className="relative">
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-10 text-white placeholder:text-white/50 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                                placeholder="Username"
                                autoFocus
                            />
                            <svg
                                className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="currentColor"
                                    d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5"
                                />
                            </svg>
                        </div>
                    </label>

                    <label className="grid gap-1.5">
                        <span className="text-sm text-white/80">Contraseña</span>
                        <div className="relative">
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPwd ? "text" : "password"}
                                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-10 text-white placeholder:text-white/50 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                                aria-label="Mostrar/ocultar contraseña"
                            >
                                {showPwd ? (
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M2 5.27L3.28 4L20 20.72L18.73 22l-2.43-2.43C14.77 20.5 13.42 21 12 21c-5 0-9.27-3.11-11-7.5c.86-2.15 2.39-3.96 4.3-5.22L2 5.27M12 7a5 5 0 0 1 5 5c0 .78-.18 1.5-.5 2.14L13.86 11.5A3 3 0 0 0 12 9a3 3 0 0 0-1.5.41L8.86 8.77A4.98 4.98 0 0 1 12 7"
                                        />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M12 9a3 3 0 1 1-3 3a3 3 0 0 1 3-3m0-5c5 0 9.27 3.11 11 7.5C21.27 15.89 17 19 12 19S2.73 15.89 1 11.5C2.73 7.11 7 4 12 4m0 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Z"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:bg-white active:scale-[0.99] disabled:opacity-60"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900"></span>
                                Entrando…
                            </span>
                        ) : (
                            "Entrar"
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
}
