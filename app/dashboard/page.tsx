// web/app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";

/* ------------------ Tipos mínimos ------------------ */
type Producto = { id: string; stock: number; minStock: number; nombre: string; sku: string };
type Compra = { id: string; fecha: string; proveedor?: { nombre?: string }; tipoDocumento?: string | null; serie?: string | null; numero?: string | null; total?: any };
type Venta = { id: string; fechaCreacion: string; nombreCliente: string; dni?: string | null; total: any; metodoPago?: string | null };

/* ------------------ Helpers de fecha ------------------ */
function monthBounds(date = new Date()) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { fromISO: iso(from), toISO: iso(to) };
}

export default function DashboardPage() {
    const { data: session } = useSession();

    const [loading, setLoading] = useState(true);

    // datasets
    const [productos, setProductos] = useState<Producto[]>([]);
    const [ultCompras, setUltCompras] = useState<Compra[]>([]);
    const [ultVentas, setUltVentas] = useState<Venta[]>([]);
    const [ventasMes, setVentasMes] = useState<number>(0);
    const [comprasMes, setComprasMes] = useState<number>(0);

    // cargar todo
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);

                // Productos (para totales y stock bajo)
                const rProd = await fetch("/api/productos?pageSize=9999");
                const jProd = await rProd.json().catch(() => ({ data: [] }));
                const listaProd: Producto[] = Array.isArray(jProd) ? jProd : (jProd.data ?? []);
                if (!alive) return;
                setProductos(listaProd);

                // Últimas compras (usar pageSize=5)
                const rComp = await fetch("/api/compras?pageSize=5&sort=fecha&dir=desc");
                const jComp = await rComp.json().catch(() => ({ data: [] }));
                setUltCompras(jComp.data ?? []);

                // Últimas ventas
                const rVent = await fetch("/api/ventas?pageSize=5&sort=fecha&dir=desc");
                const jVent = await rVent.json().catch(() => ({ data: [] }));
                setUltVentas(jVent.data ?? []);

                // Totales del mes (sumamos en cliente)
                const { fromISO, toISO } = monthBounds();
                const [rVMes, rCMes] = await Promise.all([
                    fetch(`/api/ventas?from=${fromISO}&to=${toISO}&pageSize=100`),
                    fetch(`/api/compras?from=${fromISO}&to=${toISO}&pageSize=100`),
                ]);
                const jVMes = await rVMes.json().catch(() => ({ data: [] }));
                const jCMes = await rCMes.json().catch(() => ({ data: [] }));

                const sumVentas = (jVMes.data ?? []).reduce((acc: number, v: any) => acc + Number(v.total ?? 0), 0);
                const sumCompras = (jCMes.data ?? []).reduce((acc: number, c: any) => acc + Number(c.total ?? 0), 0);
                if (!alive) return;
                setVentasMes(sumVentas);
                setComprasMes(sumCompras);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const fmtMoney = (v: any, ccy = "PEN") =>
        new Intl.NumberFormat("es-PE", { style: "currency", currency: ccy, maximumFractionDigits: 2 })
            .format(Number(v ?? 0));

    const fmtDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit" }) : "—";

    const totalProductos = productos.length;
    const stockBajo = useMemo(
        () => productos.filter(p => (p?.stock ?? 0) <= (p?.minStock ?? 0)).length,
        [productos]
    );

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white/70">Bienvenido</p>
                        <h1 className="text-2xl font-semibold">
                            {session?.user?.name ?? "Usuario"}
                        </h1>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white"
                    >
                        Cerrar sesión
                    </button>
                </header>

                {/* KPIs (clicables) */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard href="/productos" icon="📦" title="Productos totales" value={loading ? "…" : String(totalProductos)} caption="Registrados en el inventario" />
                    <KpiCard href="/productos?f=stock-bajo" icon="⚠️" tone="warning" title="Stock bajo" value={loading ? "…" : String(stockBajo)} caption="En o por debajo del mínimo" />
                    <KpiCard href="/compras" icon="🧾" tone="info" title="Compras (mes)" value={loading ? "…" : fmtMoney(comprasMes)} caption="Total comprado" />
                    <KpiCard href="/ventas" icon="💸" tone="success" title="Ventas (mes)" value={loading ? "…" : fmtMoney(ventasMes)} caption="Total vendido" />
                </section>

                {/* Listas recientes */}
                <section className="grid gap-4 lg:grid-cols-2">

                    <Panel title="Últimas compras" action={<Link href="/compras" className="text-sm underline">Ver todo</Link>}>
                        {loading ? (
                            <Empty>cargando…</Empty>
                        ) : (ultCompras.length === 0 ? (
                            <Empty>No hay compras recientes.</Empty>
                        ) : (
                            <ul className="divide-y divide-white/10">
                                {ultCompras.map(c => {
                                    const doc = [c.tipoDocumento, c.serie, c.numero].filter(Boolean).join(" ") || "Documento";
                                    return (
                                        <li key={c.id} className="py-3 flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-white/85">
                                                    {doc} • {c.proveedor?.nombre ?? "—"}
                                                </p>
                                                <p className="text-xs text-white/60">{fmtDate(c.fecha)}</p>
                                            </div>
                                            <div className="pl-4 text-right">
                                                <p className="font-medium">{fmtMoney(c.total)}</p>
                                                <Link href={`/compras/${c.id}`} className="text-xs text-white/70 underline">ver</Link>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ))}
                    </Panel>

                    <Panel title="Últimas ventas" action={<Link href="/ventas" className="text-sm underline">Ver todo</Link>}>
                        {loading ? (
                            <Empty>cargando…</Empty>
                        ) : (ultVentas.length === 0 ? (
                            <Empty>No hay ventas recientes.</Empty>
                        ) : (
                            <ul className="divide-y divide-white/10">
                                {ultVentas.map(v => (
                                    <li key={v.id} className="py-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-white/85">
                                                {v.nombreCliente} • {fmtDate(v.fechaCreacion)}
                                            </p>
                                            <p className="text-xs text-white/60">{v.metodoPago || "—"}</p>
                                        </div>
                                        <div className="pl-4 text-right">
                                            <p className="font-medium">{fmtMoney(v.total)}</p>
                                            <Link href={`/ventas/${v.id}`} className="text-xs text-white/70 underline">ver</Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </Panel>
                </section>

                {/* Bloque opcional: lista corta de stock bajo */}
                <section className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-medium">Stock bajo</h2>
                        <Link href="/productos?f=stock-bajo" className="text-sm underline">Gestionar</Link>
                    </div>
                    {loading ? (
                        <Empty>cargando…</Empty>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-white/10 text-white/80">
                                    <tr>
                                        <th className="px-4 py-2 text-left">SKU</th>
                                        <th className="px-4 py-2 text-left">Producto</th>
                                        <th className="px-4 py-2 text-right">Stock</th>
                                        <th className="px-4 py-2 text-right">Mín.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.filter(p => (p.stock ?? 0) <= (p.minStock ?? 0)).slice(0, 5).map(p => (
                                        <tr key={p.id} className="border-t border-white/10">
                                            <td className="px-4 py-2 font-mono text-[13px]">{p.sku}</td>
                                            <td className="px-4 py-2">{p.nombre}</td>
                                            <td className="px-4 py-2 text-right">{p.stock}</td>
                                            <td className="px-4 py-2 text-right">{p.minStock}</td>
                                        </tr>
                                    ))}
                                    {stockBajo === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-4 text-center text-white/70">Sin alertas de stock.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

/* ------------------ UI components ------------------ */
function KpiCard({
    href, icon, title, value, caption, tone = "default",
}: {
    href: string;
    icon: string;
    title: string;
    value: string;
    caption?: string;
    tone?: "default" | "warning" | "success" | "info";
}) {
    const toneClass =
        tone === "warning" ? "border-yellow-300/30" :
            tone === "success" ? "border-emerald-300/30" :
                tone === "info" ? "border-cyan-300/30" :
                    "border-white/10";
    return (
        <Link
            href={href}
            className={`rounded-2xl border ${toneClass} bg-white/10 p-5 backdrop-blur shadow hover:bg-white/15 transition`}
        >
            <div className="text-2xl">{icon}</div>
            <p className="mt-2 text-sm text-white/70">{title}</p>
            <p className="mt-1 text-3xl font-semibold leading-none">{value}</p>
            {caption && <p className="mt-1 text-xs text-white/60">{caption}</p>}
        </Link>
    );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-medium">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <div className="text-white/70">{children}</div>;
}
