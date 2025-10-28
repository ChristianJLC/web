// web/app/compras/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type CompraDetalle = {
    id: string;
    fecha: string; // ISO
    proveedor: { id: string; nombre: string | null; ruc: string | null } | null;
    tipoDocumento: string | null;
    serie: string | null;
    numero: string | null;
    moneda: string | null;
    metodoPago: string | null;
    notas: string | null;
    total: any; // string (Decimal)
    createdAt?: string;
    updatedAt?: string;
    items: Array<{
        id: string;
        productoId: string;
        sku: string;
        nombreProducto: string;
        cantidad: number;
        costoUnit: any; // string (Decimal)
        subtotal: any;  // string (Decimal)
    }>;
};

export default function CompraDetallePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<CompraDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/compras/${params.id}`, { cache: "no-store" });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.error || "No se pudo cargar la compra");
                }
                const j = (await res.json()) as CompraDetalle;
                if (alive) setData(j);
            } catch (e: any) {
                if (alive) setErr(e.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [params.id]);

    const fmtMoney = (v: any) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: data?.moneda || "PEN",
            maximumFractionDigits: 2,
        }).format(Number(v ?? 0));

    const fmtDate = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleString("es-PE", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            })
            : "—";

    const subtotal = (data?.items ?? []).reduce(
        (acc, it) => acc + Number(it.subtotal ?? 0),
        0
    );
    const total = Number(data?.total ?? subtotal);

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 print:bg-white print:text-black">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between print:hidden">
                    <h1 className="text-2xl font-semibold">Detalle de compra</h1>
                    <button
                        onClick={() => router.push("/compras")}
                        className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 shadow hover:bg-white/20"
                    >
                        Volver al listado
                    </button>
                </header>

                {loading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-6">
                        Cargando…
                    </div>
                ) : err ? (
                    <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-red-200">
                        {err}
                    </div>
                ) : !data ? (
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-6">
                        No se encontró la compra.
                    </div>
                ) : (
                    <>
                        {/* Cabecera */}
                        <section className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                            <div className="grid gap-3 md:grid-cols-3">
                                <Field label="Fecha" value={fmtDate(data.fecha)} />
                                <Field
                                    label="Proveedor"
                                    value={
                                        data.proveedor?.nombre
                                            ? `${data.proveedor.nombre}${data.proveedor.ruc ? " · " + data.proveedor.ruc : ""
                                            }`
                                            : "—"
                                    }
                                />
                                <Field label="Tipo doc." value={data.tipoDocumento || "—"} />
                                <Field label="Serie" value={data.serie || "—"} />
                                <Field label="Número" value={data.numero || "—"} />
                                <Field label="Moneda" value={data.moneda || "PEN"} />
                                <Field label="Método de pago" value={data.metodoPago || "—"} />
                                <Field className="md:col-span-3" label="Notas" value={data.notas || "—"} />
                            </div>
                        </section>

                        {/* Items */}
                        <section className="rounded-2xl border border-white/10 bg-white/10 p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-white/10 text-white/80">
                                        <tr>
                                            <Th>SKU</Th>
                                            <Th>Producto</Th>
                                            <Th className="text-right">Cantidad</Th>
                                            <Th className="text-right">Costo unit.</Th>
                                            <Th className="text-right">Subtotal</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-6 text-center text-white/80">
                                                    Sin ítems.
                                                </td>
                                            </tr>
                                        ) : (
                                            data.items.map((it) => (
                                                <tr key={it.id} className="border-t border-white/10 hover:bg-white/5">
                                                    <Td mono>{it.sku}</Td>
                                                    <Td>{it.nombreProducto}</Td>
                                                    <Td right>{it.cantidad}</Td>
                                                    <Td right>{fmtMoney(it.costoUnit)}</Td>
                                                    <Td right>{fmtMoney(it.subtotal)}</Td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totales */}
                            <div className="flex flex-col gap-1 p-4 items-end text-sm">
                                <div className="flex gap-6">
                                    <span className="opacity-80">Subtotal:</span>
                                    <span className="font-medium">{fmtMoney(subtotal)}</span>
                                </div>
                                <div className="flex gap-6 text-base">
                                    <span className="opacity-90">Total:</span>
                                    <span className="font-semibold">{fmtMoney(total)}</span>
                                </div>
                            </div>
                        </section>

                        {/* Acciones inferiores */}
                        <div className="print:hidden flex justify-end gap-2">
                            <Link
                                href={`/compras/${params.id}/editar`}
                                className="rounded-xl border border-blue-400/40 bg-white/10 px-4 py-2 text-blue-200 shadow hover:bg-blue-500/10"
                            >
                                Editar
                            </Link>
                            <button
                                onClick={() => window.print()}
                                className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white"
                            >
                                Imprimir / PDF
                            </button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}

/* ---------- UI helpers ---------- */
function Field({
    label,
    value,
    className = "",
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${className}`}>
            <div className="text-xs text-white/70">{label}</div>
            <div className="mt-0.5 text-sm">{value}</div>
        </div>
    );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}

function Td({
    children,
    right,
    mono,
}: {
    children: React.ReactNode;
    right?: boolean;
    mono?: boolean;
}) {
    return (
        <td
            className={[
                "px-4 py-3 align-middle",
                right ? "text-right" : "text-left",
                mono ? "font-mono text-[13px]" : "",
            ].join(" ")}
        >
            {children}
        </td>
    );
}
