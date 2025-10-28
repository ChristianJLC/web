// web/app/ventas/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
    id: string;
    nombreCliente: string;
    dni: string | null;
    metodoPago: string | null;
    total: any;
    fechaCreacion: string; // ISO
    _count: { detalles: number };
};

type SortKey = "fecha" | "total" | "cliente";

export default function VentasPage() {
    const [q, setQ] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);

    const [sort, setSort] = useState<SortKey>("fecha");
    const [dir, setDir] = useState<"asc" | "desc">("desc");

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

    // 🔹 Eliminar venta
    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta venta?")) return;
        try {
            const res = await fetch(`/api/ventas/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("No se pudo eliminar la venta.");
            setRows((prev) => prev.filter((v) => v.id !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams();
                if (q.trim()) p.set("q", q.trim());
                if (from) p.set("from", from);
                if (to) p.set("to", to);
                p.set("page", String(page));
                p.set("pageSize", String(pageSize));
                p.set("sort", sort);
                p.set("dir", dir);
                const res = await fetch(`/api/ventas?${p.toString()}`);
                const j = await res.json();
                if (!alive) return;
                setRows(j.data ?? []);
                setTotal(j.total ?? 0);
            } catch {
                if (!alive) return;
                setRows([]);
                setTotal(0);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [q, from, to, page, pageSize, sort, dir]);

    const fmtMoney = (v: any) =>
        new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(v ?? 0));
    const fmtDate = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleDateString("es-PE", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            })
            : "—";

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
                    <h1 className="text-2xl font-semibold">Ventas</h1>
                    <div className="flex items-center gap-2">
                        {/* 👇 Nuevo botón para volver al dashboard */}
                        <Link
                            href="/ventas/nueva"
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white"
                        >
                            Registrar venta
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
                    <form
                        onSubmit={onSearch}
                        className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto_auto_auto] items-center"
                    >
                        <div>
                            <label className="mb-1 block text-xs text-white/70">Buscar</label>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Cliente, DNI, método de pago…"
                                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/60 outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-white/70">Desde</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-white/70">Hasta</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 outline-none"
                            />
                        </div>

                        <div className="flex gap-2 self-end">
                            <button
                                type="submit"
                                className="rounded-xl bg-white/90 px-4 py-2.5 text-slate-900 shadow hover:bg-white"
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
                                className="rounded-xl border border-white/20 px-4 py-2.5 hover:bg-white/10"
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>
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
                                    <Th>
                                        <SortBtn k="cliente">Cliente</SortBtn>
                                    </Th>
                                    <Th>DNI</Th>
                                    <Th>Método de pago</Th>
                                    <Th>Ítems</Th>
                                    <Th className="text-right">
                                        <SortBtn k="total">Total</SortBtn>
                                    </Th>
                                    <Th className="text-right">Acciones</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-white/80">
                                            Cargando…
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-white/80">
                                            No hay ventas registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => (
                                        <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                                            <Td>{fmtDate(r.fechaCreacion)}</Td>
                                            <Td className="font-medium">{r.nombreCliente}</Td>
                                            <Td>{r.dni ?? "—"}</Td>
                                            <Td>{r.metodoPago ?? "—"}</Td>
                                            <Td>{r._count?.detalles ?? 0}</Td>
                                            <Td right>{fmtMoney(r.total)}</Td>
                                            <Td right>
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/ventas/${r.id}`}
                                                        className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
                                                    >
                                                        Ver
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(r.id)}
                                                        className="rounded-lg border border-red-400/40 px-2 py-1 text-red-200 hover:bg-red-500/10"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))
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

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({
    children,
    right,
    className = "",
}: {
    children: React.ReactNode;
    right?: boolean;
    className?: string;
}) {
    return (
        <td className={`px-4 py-3 align-middle ${right ? "text-right" : "text-left"} ${className}`}>
            {children}
        </td>
    );
}
