import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const prisma = new PrismaClient();

export const { handlers, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            credentials: {
                username: { label: "Usuario", type: "text" },
                password: { label: "Contraseña", type: "password" },
            },
            authorize: async (creds) => {
                if (!creds?.username || !creds?.password) return null;

                const user = await prisma.usuario.findUnique({
                    where: { username: creds.username },
                });

                if (!user) return null;

                const ok = await compare(creds.password, user.password);
                if (!ok) return null;

                return { id: user.id, name: user.username };
            },
        }),
    ],
    pages: {
        signIn: "/login", // 👈 Aquí indicamos nuestra página de login
    },
    secret: process.env.AUTH_SECRET,
});
