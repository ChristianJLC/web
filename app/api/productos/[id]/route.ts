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
    // si más adelante decides permitir editar precioCompra, añade aquí:
    // precioCompra: z.coerce.number().nonnegative().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const data = EditableSchema.parse(body); // <- Solo estos campos pasan
        const updated = await prisma.producto.update({
            where: { id: params.id },
            data,
        });
        return Response.json(updated);
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        await prisma.producto.delete({ where: { id: params.id } });
        return Response.json({ ok: true });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
    }
}
