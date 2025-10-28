// web/app/compras/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
    id: string;
    fecha: string; // ISO
    tipoDocumento: string | null;
    serie: string | null;
    numero: string | null;
    moneda: string | null;
    metodoPago: string | null;
    total: any; // Decimal como string
    notas: string | null;
    proveedor: { id: string; nombre: string; ruc: string | null } | null;
    _count: { detalles: number };
    estado?: string | null;
};

type SortKey = "fecha" | "total" | "proveedor" | "numero";

export default function ComprasPage() {
    // Filtros / query
    const [q, setQ] = useState("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    // Paginación
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

    // Orden
    const [sort, setSort] = useState<SortKey>("fecha");
    const [dir, setDir] = useState<"asc" | "desc">("desc");

    // Datos
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                if (from) params.set("from", from);
                if (to) params.set("to", to);
                params.set("page", String(page));
                params.set("pageSize", String(pageSize));
                params.set("sort", sort);
                params.set("dir", dir);

                const res = await fetch(`/api/compras?${params.toString()}`);
                const json = await res.json();

                if (!alive) return;
                setRows(json.data ?? []);
                setTotal(json.total ?? 0);
            } catch {
                if (!alive) return;
                setRows([]);
                setTotal(0);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => {
            alive = false;
        };
    }, [q, from, to, page, pageSize, sort, dir]);

    // helpers
    const fmtMoney = (v: any, ccy = "PEN") =>
        new Intl.NumberFormat("es-PE", { style: "currency", currency: ccy }).format(Number(v ?? 0));

    const fmtDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit" }) : "—";

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const toggleSort = (k: SortKey) => {
        if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
            setSort(k);
            setDir(k === "fecha" ? "desc" : "asc");
        }
        setPage(1);
    };

    const onDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta compra? Esta acción actualizará stock.")) return;
        try {
            const res = await fetch(`/api/compras/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "No se pudo eliminar");
            }
            setRows((rs) => rs.filter((r) => r.id !== id));
            setTotal((t) => Math.max(0, t - 1));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
        <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1">
            {children}
            <span className="text-xs opacity-70">{sort === k ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
        </button>
    );

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Compras</h1>
                    <div className="flex items-center gap-2">
                        {/* nuevo botón para volver al dashboard */}
                        <Link
                            href="/compras/nueva"
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white"
                        >
                            Registrar compra
                        </Link>
                        <Link
                            href="/dashboard"
                            className="rounded-xl border border-white/20 px-4 py-2 text-white hover:bg-white/10"
                        >
                            Volver al dashboard
                        </Link>
                    </div>
                </header>

                {/* Filtros */}
                <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <form onSubmit={onSearch} className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                        <label className="grid gap-1">
                            <span className="text-xs text-white/70">Buscar</span>
                            <div className="relative">
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Proveedor, RUC, tipo doc, serie o número…"
                                    className="w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 py-3 text-white placeholder:text-white/60 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                                />
                                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5m-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14" />
                                </svg>
                            </div>
                        </label>

                        <label className="grid gap-1">
                            <span className="text-xs text-white/70">Desde</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 py-2.5 text-white outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                                />
                                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2m0 15H5V10h14z" />
                                </svg>
                            </div>
                        </label>

                        <label className="grid gap-1">
                            <span className="text-xs text-white/70">Hasta</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-3 py-2.5 text-white outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                                />
                                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2m0 15H5V10h14z" />
                                </svg>
                            </div>
                        </label>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 md:flex-none rounded-xl bg-white/90 px-4 py-3 text-slate-900 shadow hover:bg-white"
                                title="Aplicar filtros"
                            >
                                Buscar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setQ("");
                                    setFrom("");
                                    setTo("");
                                    setPage(1);
                                }}
                                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white hover:bg-white/20"
                                title="Limpiar filtros"
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>

                    {(q || from || to) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="opacity-70">Filtros:</span>
                            {q && (
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                                    <span>Texto: “{q}”</span>
                                    <button onClick={() => { setQ(""); setPage(1); }} className="opacity-70 hover:opacity-100">✕</button>
                                </span>
                            )}
                            {from && (
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                                    <span>Desde: {from}</span>
                                    <button onClick={() => { setFrom(""); setPage(1); }} className="opacity-70 hover:opacity-100">✕</button>
                                </span>
                            )}
                            {to && (
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                                    <span>Hasta: {to}</span>
                                    <button onClick={() => { setTo(""); setPage(1); }} className="opacity-70 hover:opacity-100">✕</button>
                                </span>
                            )}
                        </div>
                    )}
                </section>

                {/* Tabla */}
                <section className="rounded-2xl border border-white/10 bg-white/10 p-0 backdrop-blur overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/10 text-white/80">
                                <tr>
                                    <Th>
                                        <SortBtn k="fecha">Fecha</SortBtn>
                                    </Th>
                                    <Th>Proveedor</Th>
                                    <Th>Tipo doc.</Th>
                                    <Th>
                                        <SortBtn k="numero">Serie · Número</SortBtn>
                                    </Th>
                                    <Th>Método de pago</Th>
                                    <Th>Estado</Th>
                                    <Th className="text-right">
                                        <SortBtn k="total">Total</SortBtn>
                                    </Th>
                                    <Th>Ítems</Th>
                                    <Th className="text-right">Acciones</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="p-6 text-center text-white/80">
                                            Cargando…
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-6 text-center text-white/80">
                                            No hay compras registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((c) => {
                                        const doc = c.tipoDocumento ?? "—";
                                        const serieNum = [c.serie, c.numero].filter(Boolean).join(" · ") || "—";
                                        const prov = c.proveedor?.nombre ?? "—";
                                        const ruc = c.proveedor?.ruc ? ` (${c.proveedor.ruc})` : "";
                                        const estado = c.estado ?? "—";

                                        return (
                                            <tr key={c.id} className="border-t border-white/10 hover:bg-white/5">
                                                <Td>{fmtDate(c.fecha)}</Td>
                                                <Td>
                                                    <span className="font-medium">{prov}</span>
                                                    <span className="text-white/60">{ruc}</span>
                                                </Td>
                                                <Td>{doc}</Td>
                                                <Td>{serieNum}</Td>
                                                <Td>{c.metodoPago ?? "—"}</Td>
                                                <Td>{estado}</Td>
                                                <Td right>{fmtMoney(c.total, (c.moneda as any) || "PEN")}</Td>
                                                <Td>{c._count?.detalles ?? 0}</Td>
                                                <Td right>
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/compras/${c.id}`}
                                                            className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
                                                            title="Ver detalle"
                                                        >
                                                            Ver
                                                        </Link>
                                                        {/* Botón Editar eliminado */}
                                                        <button
                                                            onClick={() => onDelete(c.id)}
                                                            className="rounded-lg border border-red-400/40 px-2 py-1 text-red-200 hover:bg-red-500/10"
                                                            title="Eliminar"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </Td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="flex items-center justify-between p-4 text-sm text-white/80">
                        <span>
                            Página {page} de {totalPages} · {total} resultado(s)
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-xl border border-white/20 px-3 py-1.5 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="rounded-xl border border-white/20 px-3 py-1.5 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

/* --------- helpers de tabla --------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
    return <td className={`px-4 py-3 align-middle ${right ? "text-right" : "text-left"}`}>{children}</td>;
}
