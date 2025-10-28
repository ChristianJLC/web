import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Rutas públicas
    if (
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico" ||
        pathname.startsWith("/public")
    ) {
        return NextResponse.next();
    }

    // Dejar entrar al /login si NO hay sesión
    if (pathname === "/login") {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
        return NextResponse.next();
    }

    // Proteger el resto
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        const url = new URL("/login", req.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|login).*)"],
};


