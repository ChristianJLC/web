// web/app/api/compras/route.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

/* ===================== GET (Listado) ===================== */
// GET /api/compras?q=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=10&sort=fecha|total|proveedor|numero&dir=asc|desc
export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to");     // YYYY-MM-DD
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10)));
    const sort = (url.searchParams.get("sort") ?? "fecha") as "fecha" | "total" | "proveedor" | "numero";
    const dir = (url.searchParams.get("dir") ?? "desc") as "asc" | "desc";

    // filtros
    const where: Prisma.CompraWhereInput = {
        AND: [
            q
                ? {
                    OR: [
                        { proveedor: { nombre: { contains: q, mode: "insensitive" } } },
                        { proveedor: { ruc: { contains: q, mode: "insensitive" } } },
                        { tipoDocumento: { contains: q, mode: "insensitive" } },
                        { serie: { contains: q, mode: "insensitive" } },
                        { numero: { contains: q, mode: "insensitive" } },
                    ],
                }
                : {},
            from ? { fecha: { gte: new Date(from) } } : {},
            to ? { fecha: { lte: new Date(to + "T23:59:59.999Z") } } : {},
        ],
    };

    // orden
    const orderBy: Prisma.CompraOrderByWithRelationInput =
        sort === "total"
            ? { total: dir }
            : sort === "proveedor"
                ? { proveedor: { nombre: dir } }
                : sort === "numero"
                    ? { numero: dir }
                    : { fecha: dir };

    const [totalItems, items] = await Promise.all([
        prisma.compra.count({ where }),
        prisma.compra.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                fecha: true,
                tipoDocumento: true,
                serie: true,
                numero: true,
                moneda: true,
                metodoPago: true,
                total: true,
                notas: true,
                proveedor: { select: { id: true, nombre: true, ruc: true } },
                _count: { select: { detalles: true } },
            },
        }),
    ]);

    return Response.json({
        data: items,
        total: totalItems,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    });
}

/* ===================== POST (Crear compra) ===================== */

const ItemSchema = z.object({
    productoId: z.string().min(1),
    cantidad: z.coerce.number().int().positive(),
    costoUnit: z.coerce.number().nonnegative(),
});

const CompraSchema = z.object({
    proveedorId: z.string().optional(),
    proveedorNuevo: z
        .object({
            ruc: z.string().optional().nullable(),
            nombre: z.string().min(1),
            telefono: z.string().optional().nullable(),
            correo: z.string().optional().nullable(),
            ciudad: z.string().optional().nullable(),
            notas: z.string().optional().nullable(),
        })
        .optional(),

    fecha: z.coerce.date(),
    tipoDocumento: z.string().optional().nullable(),
    serie: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    moneda: z.string().optional().nullable(),
    metodoPago: z.string().optional().nullable(),
    notas: z.string().optional().nullable(),

    items: z.array(ItemSchema).min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (body.fecha) {
            body.fecha = new Date(body.fecha + "T12:00:00");
        }

        const data = CompraSchema.parse(body);

        const proveedorId = await (async () => {
            if (data.proveedorId) return data.proveedorId;
            if (data.proveedorNuevo) {
                const p = await prisma.proveedor.create({ data: data.proveedorNuevo });
                return p.id;
            }
            throw new Error("Debe seleccionar o crear un proveedor.");
        })();

        const total = data.items.reduce(
            (acc, it) => acc + it.costoUnit * it.cantidad,
            0
        );

        const created = await prisma.$transaction(async (tx) => {
            const compra = await tx.compra.create({
                data: {
                    proveedorId,
                    fecha: data.fecha,
                    tipoDocumento: data.tipoDocumento ?? null,
                    serie: data.serie ?? null,
                    numero: data.numero ?? null,
                    moneda: data.moneda ?? null,
                    metodoPago: data.metodoPago ?? null,
                    notas: data.notas ?? null,
                    total,
                },
            });

            for (const it of data.items) {
                const subtotal = it.costoUnit * it.cantidad;

                await tx.detalleCompra.create({
                    data: {
                        compraId: compra.id,
                        productoId: it.productoId,
                        cantidad: it.cantidad,
                        costoUnit: it.costoUnit,
                        subtotal,
                    },
                });

                await tx.producto.update({
                    where: { id: it.productoId },
                    data: {
                        stock: { increment: it.cantidad },
                        precioCompra: it.costoUnit,
                        fechaActualizacion: new Date(),
                    },
                });
            }

            return compra;
        });

        return Response.json({ ok: true, data: created }, { status: 201 });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
    }
}
