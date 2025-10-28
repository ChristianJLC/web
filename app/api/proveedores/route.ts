
/*
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ProveedorSchema = z.object({
    ruc: z.string().min(8).max(15).optional(),
    nombre: z.string().min(1),
    telefono: z.string().optional(),
    correo: z.string().email().optional(),
    ciudad: z.string().optional(),
    notas: z.string().optional(),
});

export async function GET() {
    const data = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    try {
        const body = ProveedorSchema.parse(await req.json());
        const created = await prisma.proveedor.create({ data: body });
        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
*/

// web/app/api/proveedores/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // 👈 importa Prisma para tipos y enums
import { z } from 'zod';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const pageSize = Math.min(
        20,
        Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10))
    );

    // 👇 Tipamos explícitamente el where
    const where: Prisma.ProveedorWhereInput = q
        ? {
            OR: [
                { nombre: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { ruc: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
        }
        : {};

    const data = await prisma.proveedor.findMany({
        where,
        // Si TS se queja, usa 'as const' o Prisma.SortOrder
        orderBy: { nombre: 'asc' as Prisma.SortOrder },
        take: pageSize,
        select: { id: true, nombre: true, ruc: true },
    });

    return NextResponse.json({ data });
}

