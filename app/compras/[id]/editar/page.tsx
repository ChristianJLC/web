// web/app/compras/[id]/editar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ProductoPick = {
    id: string;
    label: string;          // "SKU · Nombre"
    precioCompra: number;   // para precargar costo
};

type ItemForm = {
    detalleId?: string;       // para saber si es existente
    productoId: string;
    productoLabel: string;
    cantidad: string;         // como texto para input
    costoUnit: string;        // como texto para input
};

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
    total: any;
    items: Array<{
        id: string;
        productoId: string;
        sku: string;
        nombreProducto: string;
        cantidad: number;
        costoUnit: any;
        subtotal: any;
    }>;
};

function todayLocalISO(date?: Date) {
    const d = date ?? new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function EditarCompraPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Cabecera
    const [fecha, setFecha] = useState<string>(todayLocalISO());
    const [tipoDocumento, setTipoDocumento] = useState("");
    const [serie, setSerie] = useState("");
    const [numero, setNumero] = useState("");
    const [moneda, setMoneda] = useState("PEN");
    const [metodoPago, setMetodoPago] = useState("");
    const [notas, setNotas] = useState("");

    // Ítems
    const [items, setItems] = useState<ItemForm[]>([
        { productoId: "", productoLabel: "", cantidad: "1", costoUnit: "0" },
    ]);

    const setRow = (idx: number, patch: Partial<ItemForm>) =>
        setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    const addRow = () =>
        setItems((arr) => [
            ...arr,
            { productoId: "", productoLabel: "", cantidad: "1", costoUnit: "0" },
        ]);

    const delRow = (idx: number) =>
        setItems((arr) => arr.filter((_, i) => i !== idx));

    // Buscar productos (usa /api/productos?q=)
    const buscarProducto = async (q: string): Promise<ProductoPick[]> => {
        if (!q.trim()) return [];
        const res = await fetch(
            `/api/productos?q=${encodeURIComponent(q)}&pageSize=5`
        );
        const j = await res.json().catch(() => ({ data: [] }));
        return (j.data ?? []).map((p: any) => ({
            id: p.id,
            label: `${p.sku} · ${p.nombre}`,
            precioCompra: Number(p.precioCompra ?? 0),
        }));
    };

    // Cargar compra
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/compras/${id}`, { cache: "no-store" });
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.error || "No se pudo cargar la compra.");
                }
                const c: CompraDetalle = await res.json();

                if (!alive) return;

                // Cabecera
                setFecha(todayLocalISO(new Date(c.fecha)));
                setTipoDocumento(c.tipoDocumento || "");
                setSerie(c.serie || "");
                setNumero(c.numero || "");
                setMoneda(c.moneda || "PEN");
                setMetodoPago(c.metodoPago || "");
                setNotas(c.notas || "");

                // Ítems
                setItems(
                    (c.items || []).map((it) => ({
                        detalleId: it.id,
                        productoId: it.productoId,
                        productoLabel: `${it.sku} · ${it.nombreProducto}`,
                        cantidad: String(it.cantidad),
                        costoUnit: String(it.costoUnit ?? "0"),
                    }))
                );
            } catch (e: any) {
                if (alive) setError(e.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [id]);

    // Total
    const total = useMemo(
        () =>
            items.reduce(
                (acc, it) =>
                    acc + Number(it.costoUnit || 0) * Math.max(0, Number(it.cantidad || 0)),
                0
            ),
        [items]
    );

    const fmtMoney = (v: number) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
        }).format(v);

    // Guardar
    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            const cleaned = items
                .map((x) => ({
                    detalleId: x.detalleId, // puede venir vacío si es nuevo
                    productoId: x.productoId,
                    cantidad: Number(x.cantidad || 0),
                    costoUnit: Number(x.costoUnit || 0),
                }))
                .filter((x) => x.productoId && x.cantidad > 0);

            if (cleaned.length === 0) {
                throw new Error("Agrega al menos un ítem válido.");
            }

            const payload = {
                fecha, // YYYY-MM-DD
                tipoDocumento: tipoDocumento || null,
                serie: serie || null,
                numero: numero || null,
                moneda: moneda || null,
                metodoPago: metodoPago || null,
                notas: notas || null,
                items: cleaned,
            };

            const res = await fetch(`/api/compras/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "No se pudo guardar la compra.");
            }

            // Vuelve al detalle (o al listado si prefieres)
            router.push(`/compras/${id}`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Editar compra</h1>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => router.push("/compras")}
                            className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="edit-form"
                            disabled={saving}
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : "Guardar cambios"}
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-6">
                        Cargando…
                    </div>
                ) : (
                    <form id="edit-form" onSubmit={onSubmit} className="grid gap-6">
                        {/* Cabecera */}
                        <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <h2 className="mb-3 text-lg font-medium">Cabecera</h2>
                            <div className="grid gap-3 md:grid-cols-3">
                                <Input
                                    label="Fecha"
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                />
                                <Input
                                    label="Tipo de documento"
                                    placeholder="Factura / Boleta"
                                    value={tipoDocumento}
                                    onChange={(e) => setTipoDocumento(e.target.value)}
                                />
                                <Input
                                    label="Serie"
                                    value={serie}
                                    onChange={(e) => setSerie(e.target.value)}
                                />
                                <Input
                                    label="Número"
                                    value={numero}
                                    onChange={(e) => setNumero(e.target.value)}
                                />
                                <Input
                                    label="Moneda"
                                    placeholder="PEN"
                                    value={moneda}
                                    onChange={(e) => setMoneda(e.target.value)}
                                />
                                <Input
                                    label="Método de pago"
                                    placeholder="Efectivo/Transferencia…"
                                    value={metodoPago}
                                    onChange={(e) => setMetodoPago(e.target.value)}
                                />
                                <label className="grid gap-1 md:col-span-3">
                                    <span className="text-xs text-white/80">Notas</span>
                                    <textarea
                                        value={notas}
                                        onChange={(e) => setNotas(e.target.value)}
                                        placeholder="Opcional"
                                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Ítems */}
                        <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-lg font-medium">Ítems</h2>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white/10"
                                >
                                    Agregar ítem
                                </button>
                            </div>

                            <div className="space-y-2">
                                {items.map((it, idx) => (
                                    <div
                                        key={idx}
                                        className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]"
                                    >
                                        <ProductoLookup
                                            value={it.productoLabel}
                                            fetcher={buscarProducto}
                                            onChangeText={(t) => setRow(idx, { productoLabel: t })}
                                            onPick={(opt) =>
                                                setRow(idx, {
                                                    productoId: opt.id,
                                                    productoLabel: opt.label,
                                                    costoUnit: String(opt.precioCompra ?? 0),
                                                })
                                            }
                                        />
                                        <Input
                                            label="Cantidad"
                                            type="number"
                                            min={1}
                                            value={it.cantidad}
                                            onChange={(e) => setRow(idx, { cantidad: e.target.value })}
                                        />
                                        <Input
                                            label="Costo unit."
                                            type="number"
                                            step="0.01"
                                            value={it.costoUnit}
                                            onChange={(e) =>
                                                setRow(idx, { costoUnit: e.target.value })
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() => delRow(idx)}
                                            className="self-end rounded-lg border border-red-400/40 px-3 py-2 text-red-200 hover:bg-red-500/10"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 text-right text-lg font-semibold">
                                Total: {fmtMoney(total)}
                            </div>
                        </section>
                    </form>
                )}
            </div>
        </main>
    );
}

/* ---------- UI helpers ---------- */

function Input(
    props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
    const { label, className = "", ...rest } = props;
    return (
        <label className={`grid gap-1 ${className}`}>
            <span className="text-xs text-white/80">{label}</span>
            <input
                {...rest}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none transition placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
            />
        </label>
    );
}

function ProductoLookup({
    value,
    onPick,
    onChangeText,
    fetcher,
}: {
    value: string;
    onPick: (opt: ProductoPick) => void;
    onChangeText: (t: string) => void;
    fetcher: (q: string) => Promise<ProductoPick[]>;
}) {
    const [q, setQ] = useState(value);
    const [opts, setOpts] = useState<ProductoPick[]>([]);

    useEffect(() => setQ(value), [value]);

    useEffect(() => {
        if (!q.trim()) {
            setOpts([]);
            return;
        }
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            try {
                const list = await fetcher(q);
                if (!ctrl.signal.aborted) setOpts(list);
            } catch {
                if (!ctrl.signal.aborted) setOpts([]);
            }
        }, 250);
        return () => {
            ctrl.abort();
            clearTimeout(t);
        };
    }, [q, fetcher]);

    return (
        <div className="relative">
            <label className="grid gap-1">
                <span className="text-xs text-white/80">Producto</span>
                <input
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        onChangeText(e.target.value);
                    }}
                    placeholder="Buscar por SKU o nombre…"
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                />
            </label>
            {opts.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-slate-900/90 backdrop-blur">
                    {opts.map((o) => (
                        <button
                            type="button"
                            key={o.id}
                            onClick={() => {
                                onPick(o);
                                setOpts([]);
                            }}
                            className="block w-full px-3 py-2 text-left hover:bg-white/10"
                            title={`Costo: S/ ${o.precioCompra.toFixed(2)}`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{o.label}</span>
                                <span className="text-sm text-white/70">
                                    S/ {o.precioCompra.toFixed(2)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
