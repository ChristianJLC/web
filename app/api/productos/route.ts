// GET /api/productos?q=...&page=1&pageSize=10&sort=sku|nombre|precio|stock|actualizado&dir=asc|desc
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req: Request) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10)));
    const sort = (url.searchParams.get("sort") ?? "actualizado") as
        | "sku"
        | "nombre"
        | "precio"
        | "stock"
        | "actualizado";
    const dir = (url.searchParams.get("dir") ?? "desc") as "asc" | "desc";

    const orderByMap: Record<typeof sort, Prisma.ProductoOrderByWithRelationInput> = {
        sku: { sku: dir },
        nombre: { nombre: dir },
        precio: { precioVenta: dir },
        stock: { stock: dir },
        actualizado: { fechaActualizacion: dir },
    };

    const where =
        q.trim().length > 0
            ? {
                OR: [
                    { sku: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { nombre: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { marca: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { categoria: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    { oemCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
                ],
            }
            : {};

    const [total, items] = await Promise.all([
        prisma.producto.count({ where }),
        prisma.producto.findMany({
            where,
            orderBy: orderByMap[sort],
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                sku: true,
                nombre: true,
                marca: true,
                categoria: true,
                oemCode: true,
                precioVenta: true,
                stock: true,
                minStock: true,
                fechaActualizacion: true,
                precioCompra: true,
            },
        }),
    ]);

    return Response.json({
        data: items,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
}

/* -------- POST: crear producto -------- */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const {
            sku,
            nombre,
            categoria,
            marca = null,
            presentacion = null,
            especificacion = null,
            oemCode = null,
            precioCompra = 0,
            precioVenta = 0,
            minStock = 0,
        } = body || {};

        if (!sku || !nombre || !categoria) {
            return Response.json(
                { error: "Campos obligatorios: sku, nombre, categoría." },
                { status: 400 }
            );
        }

        const pc = Number(precioCompra ?? 0);
        const pv = Number(precioVenta ?? 0);
        const ms = Number(minStock ?? 0);

        if (Number.isNaN(pc) || pc < 0) return Response.json({ error: "Precio compra inválido." }, { status: 400 });
        if (Number.isNaN(pv) || pv < 0) return Response.json({ error: "Precio venta inválido." }, { status: 400 });
        if (!Number.isInteger(ms) || ms < 0) return Response.json({ error: "Stock mínimo inválido." }, { status: 400 });

        const prod = await prisma.producto.create({
            data: {
                sku: String(sku),
                nombre: String(nombre),
                categoria: String(categoria),
                marca: marca ? String(marca) : null,
                presentacion: presentacion ? String(presentacion) : null,
                especificacion: especificacion ? String(especificacion) : null,
                oemCode: oemCode ? String(oemCode) : null,
                precioCompra: pc,
                precioVenta: pv,
                minStock: ms,
            },
            select: {
                id: true,
                sku: true,
                nombre: true,
                precioCompra: true,
            },
        });

        return Response.json(prod, { status: 201 });
    } catch (e: any) {
        const msg = e?.code === "P2002" ? "SKU ya registrado." : e?.message || "Error al crear producto.";
        return Response.json({ error: msg }, { status: 400 });
    }
}
