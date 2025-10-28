// web/app/api/ventas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Validación del cuerpo con notas incluidas
const CreateVentaSchema = z.object({
    nombreCliente: z.string().min(1),
    dni: z.string().optional().nullable(),
    metodoPago: z.string().optional().nullable(),
    notas: z.string().optional().nullable(), // ✅ agregado aquí
    items: z
        .array(
            z.object({
                productoId: z.string().min(1),
                cantidad: z.number().int().positive(),
                precioUnit: z.number().nonnegative(),
                descuento: z.number().nonnegative().optional().default(0),
            })
        )
        .min(1),
});

// ✅ GET — listado con filtros
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const sort = (searchParams.get("sort") || "fecha") as
        | "fecha"
        | "total"
        | "cliente";
    const dir = (searchParams.get("dir") || "desc") as "asc" | "desc";

    const where: any = {};
    if (q) {
        where.OR = [
            { nombreCliente: { contains: q, mode: "insensitive" } },
            { dni: { contains: q, mode: "insensitive" } },
            { metodoPago: { contains: q, mode: "insensitive" } },
        ];
    }

    if (from || to) {
        where.fechaCreacion = {};
        if (from) where.fechaCreacion.gte = new Date(from);
        if (to) {
            const d = new Date(to);
            d.setDate(d.getDate() + 1);
            where.fechaCreacion.lt = d;
        }
    }

    const orderBy =
        sort === "total"
            ? { total: dir }
            : sort === "cliente"
                ? { nombreCliente: dir }
                : { fechaCreacion: dir };

    const [total, data] = await Promise.all([
        prisma.venta.count({ where }),
        prisma.venta.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                nombreCliente: true,
                dni: true,
                metodoPago: true,
                total: true,
                fechaCreacion: true,
                notas: true, // ✅ visible en el listado si lo necesitas
                _count: { select: { detalles: true } },
            },
        }),
    ]);

    return NextResponse.json({ total, data });
}

// ✅ POST — crear una venta con notas
export async function POST(req: Request) {
    try {
        const body = CreateVentaSchema.parse(await req.json());

        const ids = body.items.map((i) => i.productoId);
        const productos = await prisma.producto.findMany({
            where: { id: { in: ids } },
            select: { id: true, stock: true },
        });

        const mapProd = new Map(productos.map((p) => [p.id, p]));

        // Validar stock suficiente
        for (const it of body.items) {
            const prod = mapProd.get(it.productoId);
            if (!prod) throw new Error("Producto no encontrado.");
            if ((prod.stock ?? 0) < it.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${it.productoId}.`);
            }
        }

        // Calcular subtotales y total
        const detalles = body.items.map((it) => {
            const subtotal = (it.precioUnit - (it.descuento ?? 0)) * it.cantidad;
            return {
                productoId: it.productoId,
                cantidad: it.cantidad,
                precioUnit: it.precioUnit,
                descuento: it.descuento ?? 0,
                subtotal,
            };
        });

        const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);

        // Transacción
        const created = await prisma.$transaction(async (tx) => {
            // Descontar stock
            for (const it of body.items) {
                await tx.producto.update({
                    where: { id: it.productoId },
                    data: { stock: { decrement: it.cantidad } },
                });
            }

            // Crear venta con notas incluidas ✅
            const venta = await tx.venta.create({
                data: {
                    nombreCliente: body.nombreCliente,
                    dni: body.dni || null,
                    metodoPago: body.metodoPago || null,
                    notas: body.notas || null, // ✅ guardar nota
                    total,
                },
            });

            // Crear detalles
            await tx.detalleVenta.createMany({
                data: detalles.map((d) => ({
                    ...d,
                    ventaId: venta.id,
                })),
            });

            return venta;
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
