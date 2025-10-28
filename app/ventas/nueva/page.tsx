// web/app/ventas/nueva/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** ---------------- Tipos ---------------- */
type ProductoPick = {
    id: string;
    label: string;          // "SKU · Nombre"
    precioVenta: number;    // para precargar
    stock: number;          // para validar
};

type Item = {
    productoId: string;
    productoLabel: string;
    cantidad: string;       // como texto para el input
    precioUnit: string;     // como texto para el input
    descuento: string;      // por unidad
};

export default function NuevaVentaPage() {
    const router = useRouter();

    // Estado general
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    /** --------------- Cliente --------------- */
    const [nombreCliente, setNombreCliente] = useState("");
    const [dni, setDni] = useState("");



    // --- helper para fecha local (YYYY-MM-DD) ---
    function todayLocalISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    /** --------------- Cabecera --------------- */
    const [fecha, setFecha] = useState<string>(todayLocalISO());

    const [metodoPago, setMetodoPago] = useState("");
    const [notas, setNotas] = useState("");

    /** --------------- Ítems --------------- */
    const [items, setItems] = useState<Item[]>([
        { productoId: "", productoLabel: "", cantidad: "1", precioUnit: "0", descuento: "0" },
    ]);

    const addRow = () =>
        setItems((arr) => [
            ...arr,
            { productoId: "", productoLabel: "", cantidad: "1", precioUnit: "0", descuento: "0" },
        ]);

    const delRow = (idx: number) =>
        setItems((arr) => arr.filter((_, i) => i !== idx));

    const setRow = (idx: number, patch: Partial<Item>) =>
        setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    // Buscar productos (prefiere endpoint existente /api/productos?q=&pageSize=5)
    const buscarProducto = async (q: string): Promise<ProductoPick[]> => {
        if (!q.trim()) return [];
        const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}&pageSize=5`);
        const j = await res.json().catch(() => ({ data: [] }));
        const list = (j.data ?? []).map((p: any) => ({
            id: p.id,
            label: `${p.sku} · ${p.nombre}`,
            precioVenta: Number(p.precioVenta ?? 0),
            stock: Number(p.stock ?? 0),
        })) as ProductoPick[];
        return list;
    };

    /** --------------- Cálculos --------------- */
    const total = useMemo(() => {
        return items.reduce((sum, it) => {
            const cant = Number(it.cantidad || 0);
            const pu = Number(it.precioUnit || 0);
            const desc = Number(it.descuento || 0);
            const unitNet = Math.max(0, pu - desc);
            return sum + unitNet * Math.max(0, cant);
        }, 0);
    }, [items]);

    const fmtMoney = (v: number) =>
        new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);

    /** --------------- Envío --------------- */
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            // Validaciones mínimas
            if (!nombreCliente.trim()) throw new Error("Ingresa el nombre del cliente.");
            const validItems = items
                .map((x) => ({
                    productoId: x.productoId,
                    cantidad: Number(x.cantidad || 0),
                    precioUnit: Number(x.precioUnit || 0),
                    descuento: Number(x.descuento || 0),
                }))
                .filter((x) => x.productoId && x.cantidad > 0 && x.precioUnit >= 0 && x.descuento >= 0);

            if (validItems.length === 0) {
                throw new Error("Agrega al menos un ítem válido.");
            }

            const payload = {
                fecha,
                nombreCliente: nombreCliente.trim(),
                dni: dni?.trim() || null,
                metodoPago: metodoPago || null,
                notas: notas || null,
                items: validItems,
            };

            const res = await fetch("/api/ventas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "No se pudo registrar la venta.");
            }

            router.push("/ventas");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Nueva venta</h1>
                </header>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={submit} className="grid gap-6">
                    {/* Cliente */}
                    <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <h2 className="mb-3 text-lg font-medium">Cliente</h2>

                        <div className="grid gap-3 md:grid-cols-3">
                            <Input
                                label="Nombre del cliente"
                                placeholder="Nombres y apellidos"
                                value={nombreCliente}
                                onChange={(e) => setNombreCliente(e.target.value)}
                                required
                            />
                            <Input
                                label="DNI (opcional)"
                                placeholder="DNI"
                                value={dni}
                                onChange={(e) => setDni(e.target.value)}
                            />
                            <Input
                                label="Notas (opcional)"
                                placeholder="Alguna observación…"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                            />
                        </div>
                    </section>

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
                                label="Método de pago"
                                placeholder="Efectivo/Tarjeta/Transferencia…"
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                            />
                            <div className="grid gap-1">
                                <span className="text-xs text-white/80">Total</span>
                                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                                    {fmtMoney(total)}
                                </div>
                            </div>
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
                                <div key={idx} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                                    <ProductoLookup
                                        value={it.productoLabel}
                                        fetcher={buscarProducto}
                                        onChangeText={(t) => setRow(idx, { productoLabel: t })}
                                        onPick={(opt) => {
                                            setRow(idx, {
                                                productoId: opt.id,
                                                productoLabel: opt.label,
                                                precioUnit: String(opt.precioVenta ?? 0),
                                            });
                                        }}
                                    />
                                    <Input
                                        label="Cantidad"
                                        type="number"
                                        min={1}
                                        value={it.cantidad}
                                        onChange={(e) => setRow(idx, { cantidad: e.target.value })}
                                    />
                                    <Input
                                        label="Precio unit."
                                        type="number"
                                        step="0.01"
                                        value={it.precioUnit}
                                        onChange={(e) => setRow(idx, { precioUnit: e.target.value })}
                                    />
                                    <Input
                                        label="Desc. unit."
                                        type="number"
                                        step="0.01"
                                        value={it.descuento}
                                        onChange={(e) => setRow(idx, { descuento: e.target.value })}
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

                    {/* Acciones */}
                    <div className="flex justify-end gap-2">
                        <Link
                            href="/ventas"
                            className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : "Registrar venta"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

/** ----------------- Componentes UI ----------------- */
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

/** Buscador de productos con lista desplegable */
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

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQ(v);
        onChangeText(v);
    };

    // debounce + fetch
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
                    onChange={handleInput}
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
                            title={`Stock: ${o.stock} · Precio: S/ ${o.precioVenta.toFixed(2)}`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{o.label}</span>
                                <span className="text-sm text-white/70">
                                    S/ {o.precioVenta.toFixed(2)} · stk {o.stock}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
