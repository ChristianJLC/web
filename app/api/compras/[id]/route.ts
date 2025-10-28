import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ------------------------ Helpers ------------------------ */
function parseDateOnly(d: string) {
    // Evita desfases: interpreta YYYY-MM-DD como medianoche local
    return new Date(`${d}T00:00:00`);
}

type PutItem = {
    detalleId?: string;
    productoId: string;
    cantidad: number;
    costoUnit: number;
};

type PutBody = {
    fecha: string; // "YYYY-MM-DD"
    tipoDocumento?: string | null;
    serie?: string | null;
    numero?: string | null;
    moneda?: string | null;
    metodoPago?: string | null;
    notas?: string | null;
    items: PutItem[];
};

/* ------------------------ GET ------------------------ */
// GET /api/compras/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const c = await prisma.compra.findUnique({
        where: { id: params.id },
        include: {
            proveedor: { select: { id: true, nombre: true, ruc: true } },
            detalles: {
                include: {
                    producto: { select: { id: true, sku: true, nombre: true } },
                },
            },
        },
    });

    if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const data = {
        id: c.id,
        fecha: (c as any).fecha?.toISOString?.() ?? (c as any).fecha,
        proveedor: c.proveedor
            ? { id: c.proveedor.id, nombre: c.proveedor.nombre, ruc: c.proveedor.ruc }
            : null,
        tipoDocumento: c.tipoDocumento,
        serie: c.serie,
        numero: c.numero,
        moneda: c.moneda,
        metodoPago: c.metodoPago,
        notas: c.notas,
        total: c.total,
        items: c.detalles.map((d) => ({
            id: d.id,
            productoId: d.productoId,
            sku: d.producto.sku,
            nombreProducto: d.producto.nombre,
            cantidad: d.cantidad,
            costoUnit: d.costoUnit,
            subtotal: d.subtotal,
        })),
    };

    return NextResponse.json(data);
}

/* ------------------------ PUT (Actualizar) ------------------------ */
// PUT /api/compras/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = (await req.json()) as PutBody;

        if (!body.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
            return NextResponse.json(
                { error: "Fecha inválida (usa YYYY-MM-DD)" },
                { status: 400 }
            );
        }
        if (!Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json(
                { error: "Debes enviar al menos un ítem." },
                { status: 400 }
            );
        }

        const items = body.items
            .map((it) => ({
                detalleId: it.detalleId,
                productoId: String(it.productoId || ""),
                cantidad: Number(it.cantidad || 0),
                costoUnit: Number(it.costoUnit || 0),
            }))
            .filter((x) => x.productoId && x.cantidad > 0 && x.costoUnit >= 0);

        if (items.length === 0) {
            return NextResponse.json(
                { error: "No hay ítems válidos." },
                { status: 400 }
            );
        }

        const fechaDate = parseDateOnly(body.fecha);
        const total = items.reduce(
            (acc, it) => acc + it.costoUnit * it.cantidad,
            0
        );

        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.compra.findUnique({
                where: { id: params.id },
                include: { detalles: true },
            });
            if (!current) throw new Error("Compra no encontrada.");

            const currentById = new Map(current.detalles.map((d) => [d.id, d]));
            const keep = new Set<string>();

            for (const it of items) {
                const subtotal = it.costoUnit * it.cantidad;

                if (it.detalleId && currentById.has(it.detalleId)) {
                    const prev = currentById.get(it.detalleId)!;

                    if (prev.productoId !== it.productoId) {
                        await tx.producto.update({
                            where: { id: prev.productoId },
                            data: { stock: { decrement: prev.cantidad } },
                        });
                        await tx.producto.update({
                            where: { id: it.productoId },
                            data: { stock: { increment: it.cantidad } },
                        });
                    } else if (prev.cantidad !== it.cantidad) {
                        const delta = it.cantidad - prev.cantidad;
                        if (delta !== 0) {
                            await tx.producto.update({
                                where: { id: it.productoId },
                                data: { stock: { increment: delta } },
                            });
                        }
                    }

                    await tx.detalleCompra.update({
                        where: { id: prev.id },
                        data: {
                            productoId: it.productoId,
                            cantidad: it.cantidad,
                            costoUnit: it.costoUnit,
                            subtotal,
                        },
                    });
                    keep.add(prev.id);
                } else {
                    const created = await tx.detalleCompra.create({
                        data: {
                            compraId: params.id,
                            productoId: it.productoId,
                            cantidad: it.cantidad,
                            costoUnit: it.costoUnit,
                            subtotal,
                        },
                    });
                    keep.add(created.id);

                    await tx.producto.update({
                        where: { id: it.productoId },
                        data: { stock: { increment: it.cantidad } },
                    });
                }
            }

            const toDelete = current.detalles.filter((d) => !keep.has(d.id));
            for (const d of toDelete) {
                await tx.detalleCompra.delete({ where: { id: d.id } });
                await tx.producto.update({
                    where: { id: d.productoId },
                    data: { stock: { decrement: d.cantidad } },
                });
            }

            const compra = await tx.compra.update({
                where: { id: params.id },
                data: {
                    fecha: fechaDate,
                    tipoDocumento: body.tipoDocumento ?? null,
                    serie: body.serie ?? null,
                    numero: body.numero ?? null,
                    moneda: body.moneda ?? null,
                    metodoPago: body.metodoPago ?? null,
                    notas: body.notas ?? null,
                    total,
                },
                include: {
                    proveedor: { select: { id: true, nombre: true, ruc: true } },
                    detalles: {
                        include: {
                            producto: { select: { id: true, sku: true, nombre: true } },
                        },
                    },
                },
            });

            return {
                id: compra.id,
                fecha:
                    (compra as any).fecha?.toISOString?.() ?? (compra as any).fecha,
                proveedor: compra.proveedor
                    ? {
                        id: compra.proveedor.id,
                        nombre: compra.proveedor.nombre,
                        ruc: compra.proveedor.ruc,
                    }
                    : null,
                tipoDocumento: compra.tipoDocumento,
                serie: compra.serie,
                numero: compra.numero,
                moneda: compra.moneda,
                metodoPago: compra.metodoPago,
                notas: compra.notas,
                total: compra.total,
                items: compra.detalles.map((d) => ({
                    id: d.id,
                    productoId: d.productoId,
                    sku: d.producto.sku,
                    nombreProducto: d.producto.nombre,
                    cantidad: d.cantidad,
                    costoUnit: d.costoUnit,
                    subtotal: d.subtotal,
                })),
            };
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

/* ------------------------ DELETE ------------------------ */
// DELETE /api/compras/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        await prisma.$transaction(async (tx) => {
            const dets = await tx.detalleCompra.findMany({
                where: { compraId: params.id },
                select: { productoId: true, cantidad: true },
            });

            for (const d of dets) {
                await tx.producto.update({
                    where: { id: d.productoId },
                    data: { stock: { decrement: d.cantidad } },
                });
            }

            await tx.detalleCompra.deleteMany({ where: { compraId: params.id } });
            await tx.compra.delete({ where: { id: params.id } });
        });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
