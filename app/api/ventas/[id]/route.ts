import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

/** Util: convierte "YYYY-MM-DD" a un Date en 12:00 UTC para evitar corrimientos */
function ymdToUTCNoon(ymd: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0)); // 12:00 UTC
}

/* ========================= GET ========================= */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const v = await prisma.venta.findUnique({
        where: { id: params.id },
        include: {
            detalles: {
                include: {
                    producto: { select: { id: true, sku: true, nombre: true } },
                },
            },
        },
    });

    if (!v) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const data = {
        id: v.id,
        fecha: v.fechaCreacion,
        nombreCliente: v.nombreCliente,
        dni: v.dni,
        metodoPago: v.metodoPago,
        notas: v.notas,
        total: v.total,
        items: v.detalles.map((d) => ({
            id: d.id,
            productoId: d.productoId,
            sku: d.producto.sku,
            nombreProducto: d.producto.nombre,
            cantidad: d.cantidad,
            precioUnit: d.precioUnit,
            descuento: d.descuento,
            subtotal: d.subtotal,
        })),
    };

    return NextResponse.json(data);
}

/* ========================= DELETE ========================= */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        await prisma.$transaction(async (tx) => {
            const detalles = await tx.detalleVenta.findMany({
                where: { ventaId: params.id },
                select: { productoId: true, cantidad: true },
            });

            for (const d of detalles) {
                await tx.producto.update({
                    where: { id: d.productoId },
                    data: { stock: { increment: d.cantidad } },
                });
            }

            await tx.detalleVenta.deleteMany({ where: { ventaId: params.id } });
            await tx.venta.delete({ where: { id: params.id } });
        });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

/* ========================= PUT (Editar) ========================= */
const ItemSchema = z.object({
    productoId: z.string().min(1),
    cantidad: z.coerce.number().int().positive(),
    precioUnit: z.coerce.number().nonnegative(),
    descuento: z.coerce.number().nonnegative(),
});

const EditVentaSchema = z.object({
    fecha: z.string().min(8),
    nombreCliente: z.string().min(1),
    dni: z.string().nullable().optional(),
    metodoPago: z.string().nullable().optional(),
    notas: z.string().nullable().optional(),
    items: z.array(ItemSchema).min(1),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const data = EditVentaSchema.parse(body);

        const total = data.items.reduce((sum, it) => {
            const net = Math.max(0, it.precioUnit - it.descuento);
            return sum + it.cantidad * net;
        }, 0);

        const updated = await prisma.$transaction(async (tx) => {
            const actuales = await tx.detalleVenta.findMany({
                where: { ventaId: params.id },
                select: { productoId: true, cantidad: true },
            });

            for (const d of actuales) {
                await tx.producto.update({
                    where: { id: d.productoId },
                    data: { stock: { increment: d.cantidad } },
                });
            }

            await tx.detalleVenta.deleteMany({ where: { ventaId: params.id } });

            const venta = await tx.venta.update({
                where: { id: params.id },
                data: {
                    fechaCreacion: ymdToUTCNoon(data.fecha),
                    nombreCliente: data.nombreCliente,
                    dni: data.dni ?? null,
                    metodoPago: data.metodoPago ?? null,
                    notas: data.notas ?? null,
                    total,
                },
            });

            for (const it of data.items) {
                const net = Math.max(0, it.precioUnit - it.descuento);
                const subtotal = net * it.cantidad;

                await tx.detalleVenta.create({
                    data: {
                        ventaId: venta.id,
                        productoId: it.productoId,
                        cantidad: it.cantidad,
                        precioUnit: it.precioUnit,
                        descuento: it.descuento,
                        subtotal,
                    },
                });

                await tx.producto.update({
                    where: { id: it.productoId },
                    data: { stock: { decrement: it.cantidad } },
                });
            }

            return venta;
        });

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
