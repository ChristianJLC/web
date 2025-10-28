import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

/** Campos permitidos para EDITAR (PUT) */
const EditableSchema = z.object({
    nombre: z.string().min(1),
    marca: z.string().nullable().optional(),
    categoria: z.string().min(1),
    oemCode: z.string().nullable().optional(),
    precioVenta: z.coerce.number().nonnegative(),
    minStock: z.coerce.number().int().nonnegative(),
});

export async function PUT(req: Request, { params }: any) {
    try {
        const body = await req.json();
        const data = EditableSchema.parse(body);
        const updated = await prisma.producto.update({
            where: { id: params.id },
            data,
        });
        return Response.json(updated);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(_req: Request, { params }: any) {
    try {
        await prisma.producto.delete({ where: { id: params.id } });
        return Response.json({ ok: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
    }
}
