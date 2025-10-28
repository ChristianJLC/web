"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ---------- Tipos auxiliares ---------- */
type Option = { id: string; label: string; nombre: string; ruc?: string | null };
type LookupOption = { id: string; label: string;[k: string]: any };
type CreatedProducto = { id: string; sku: string; nombre: string; precioCompra: number };

export default function NuevaCompraPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Proveedor
    const [provQuery, setProvQuery] = useState("");
    const [provOptions, setProvOptions] = useState<Option[]>([]);
    const [proveedorId, setProveedorId] = useState<string>("");
    const [proveedorSel, setProveedorSel] = useState<{ id: string; nombre: string; ruc?: string } | null>(null);

    const [proveedorNuevo, setProveedorNuevo] = useState({
        nombre: "",
        ruc: "",
        telefono: "",
        correo: "",
        ciudad: "",
        notas: "",
    });

    function todayLocalISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }


    // Compra
    const [fecha, setFecha] = useState<string>(todayLocalISO());
    const [tipoDocumento, setTipoDocumento] = useState("");
    const [serie, setSerie] = useState("");
    const [numero, setNumero] = useState("");
    const [moneda, setMoneda] = useState("PEN");
    const [metodoPago, setMetodoPago] = useState("");
    const [notas, setNotas] = useState("");

    // Ítems
    type Item = { productoId: string; productoLabel: string; cantidad: string; costoUnit: string };
    const [items, setItems] = useState<Item[]>([{ productoId: "", productoLabel: "", cantidad: "", costoUnit: "" }]);

    // Buscar proveedor
    useEffect(() => {
        let alive = true;
        const ctrl = new AbortController();
        (async () => {
            const qs = new URLSearchParams();
            if (provQuery.trim()) qs.set("q", provQuery.trim());
            qs.set("pageSize", "10");
            try {
                const res = await fetch(`/api/proveedores?${qs.toString()}`, { signal: ctrl.signal });
                const j = await res.json().catch(() => ({ data: [] }));
                if (!alive) return;
                const opts: Option[] = (j.data ?? []).map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                    ruc: p.ruc,
                    label: `${p.nombre}${p.ruc ? ` (${p.ruc})` : ""}`,
                }));
                setProvOptions(opts);
            } catch {
                if (!alive) return;
                setProvOptions([]);
            }
        })();
        return () => {
            alive = false;
            ctrl.abort();
        };
    }, [provQuery]);

    // Buscar producto
    const buscarProducto = async (q: string) => {
        if (!q.trim()) return [];
        const res = await fetch(`/api/productos?q=${encodeURIComponent(q)}&pageSize=5`);
        const j = await res.json().catch(() => ({ data: [] }));
        return (j.data ?? []).map((p: any) => ({
            id: p.id,
            label: `${p.sku} · ${p.nombre}`,
            ultimoCosto: Number(p.precioCompra ?? 0),
        }));
    };

    const total = useMemo(
        () => items.reduce((acc, it) => acc + Number(it.costoUnit || 0) * Number(it.cantidad || 0), 0),
        [items]
    );

    const addRow = () =>
        setItems((arr) => [...arr, { productoId: "", productoLabel: "", cantidad: "", costoUnit: "" }]);

    const delRow = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
    const setRow = (idx: number, patch: Partial<Item>) =>
        setItems((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    // Modal nuevo producto
    const [showNuevoProd, setShowNuevoProd] = useState(false);
    const [nuevoProdRow, setNuevoProdRow] = useState<number | null>(null);

    // Función: abrir modal y decidir qué fila usar
    const openNuevoProducto = () => {
        let target = items.findIndex((x) => !x.productoId);
        if (target === -1) {
            target = items.length;
            setItems((prev) => [
                ...prev,
                { productoId: "", productoLabel: "", cantidad: "1", costoUnit: "0" },
            ]);
        }
        setNuevoProdRow(target);
        setShowNuevoProd(true);
    };

    // Enviar formulario
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            const payload: any = {
                fecha,
                tipoDocumento: tipoDocumento || null,
                serie: serie || null,
                numero: numero || null,
                moneda: moneda || null,
                metodoPago: metodoPago || null,
                notas: notas || null,
                items: items
                    .filter((x) => x.productoId && Number(x.cantidad) > 0)
                    .map((x) => ({
                        productoId: x.productoId,
                        cantidad: Number(x.cantidad),
                        costoUnit: Number(x.costoUnit),
                    })),
            };

            if (proveedorId) payload.proveedorId = proveedorId;
            else if (proveedorNuevo.nombre.trim()) payload.proveedorNuevo = { ...proveedorNuevo };
            else throw new Error("Selecciona un proveedor o ingresa uno nuevo.");

            if (payload.items.length === 0) throw new Error("Agrega al menos un ítem válido.");

            const res = await fetch("/api/compras", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "No se pudo registrar la compra.");
            }

            router.push("/productos");
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
                    <h1 className="text-2xl font-semibold">Nueva compra</h1>
                </header>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={submit} className="grid gap-6">
                    {/* Proveedor */}
                    <ProveedorSection
                        provQuery={provQuery}
                        setProvQuery={setProvQuery}
                        provOptions={provOptions}
                        proveedorId={proveedorId}
                        setProveedorId={setProveedorId}
                        setProveedorSel={setProveedorSel}
                        setProveedorNuevo={setProveedorNuevo}
                        proveedorNuevo={proveedorNuevo}
                    />

                    {/* Cabecera */}
                    <CabeceraSection
                        fecha={fecha}
                        setFecha={setFecha}
                        tipoDocumento={tipoDocumento}
                        setTipoDocumento={setTipoDocumento}
                        serie={serie}
                        setSerie={setSerie}
                        numero={numero}
                        setNumero={setNumero}
                        moneda={moneda}
                        setMoneda={setMoneda}
                        metodoPago={metodoPago}
                        setMetodoPago={setMetodoPago}
                        notas={notas}
                        setNotas={setNotas}
                    />

                    {/* Ítems */}
                    <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-medium">Ítems</h2>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white/10"
                                >
                                    Agregar ítem
                                </button>
                                <button
                                    type="button"
                                    onClick={openNuevoProducto}
                                    className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white/10"
                                >
                                    Nuevo producto
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {items.map((it, idx) => (
                                <div key={idx} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                                    <ProductoLookup
                                        value={it.productoLabel}
                                        onPick={(opt: LookupOption) =>
                                            setRow(idx, { productoId: opt.id, productoLabel: opt.label })
                                        }
                                        onChangeText={(t: string) => setRow(idx, { productoLabel: t })}
                                        fetcher={buscarProducto}
                                    />

                                    <input
                                        type="number"
                                        min={1}
                                        value={it.cantidad}
                                        onChange={(e) => setRow(idx, { cantidad: e.target.value })}
                                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                                        placeholder="Cant."
                                    />

                                    <input
                                        type="number"
                                        step="0.01"
                                        value={it.costoUnit}
                                        onChange={(e) => setRow(idx, { costoUnit: e.target.value })}
                                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                                        placeholder="Costo"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => delRow(idx)}
                                        className="rounded-lg border border-red-400/40 px-3 py-2 text-red-200 hover:bg-red-500/10"
                                    >
                                        Quitar
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 text-right text-lg font-semibold">Total: S/ {total.toFixed(2)}</div>
                    </section>

                    <div className="flex justify-end gap-2">
                        <Link href="/productos" className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10">
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : "Registrar compra"}
                        </button>
                    </div>
                </form>
            </div>

            {showNuevoProd && (
                <NuevoProductoModal
                    onClose={() => {
                        setShowNuevoProd(false);
                        setNuevoProdRow(null);
                    }}
                    onCreated={(prod: CreatedProducto) => {
                        if (nuevoProdRow != null) {
                            setRow(nuevoProdRow, {
                                productoId: prod.id,
                                productoLabel: `${prod.sku} · ${prod.nombre}`,
                                costoUnit: String(prod.precioCompra), // si no quieres precargar el costo: usa "" en vez de String(...)
                            });
                        }
                        setShowNuevoProd(false);
                        setNuevoProdRow(null);
                    }}
                />
            )}
        </main>
    );
}

/* ---- Secciones reutilizables ---- */
function ProveedorSection(props: any) {
    const {
        provQuery,
        setProvQuery,
        provOptions,
        proveedorId,
        setProveedorId,
        setProveedorSel,
        setProveedorNuevo,
        proveedorNuevo,
    } = props;
    return (
        <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <h2 className="mb-3 text-lg font-medium">Proveedor</h2>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Buscar proveedor</span>
                    <input
                        value={provQuery}
                        onChange={(e) => {
                            setProvQuery(e.target.value);
                            setProveedorId("");
                            setProveedorSel(null);
                        }}
                        placeholder="Nombre o RUC"
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 outline-none"
                    />
                </label>

                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Seleccionar</span>
                    <select
                        value={proveedorId}
                        onChange={(e) => {
                            const val = e.target.value;
                            setProveedorId(val);
                            const found = provOptions.find((o: Option) => o.id === val) || null;
                            setProveedorSel(
                                found ? { id: found.id, nombre: found.nombre, ruc: found.ruc || undefined } : null
                            );
                            setProveedorNuevo({
                                nombre: "",
                                ruc: "",
                                telefono: "",
                                correo: "",
                                ciudad: "",
                                notas: "",
                            });
                        }}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 outline-none text-white"
                    >
                        <option value="">— (ninguno)</option>
                        {provOptions.map((o: Option) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>

                {!proveedorId && (
                    <>
                        <div className="md:col-span-2 text-xs text-white/70 mt-2">O crear nuevo proveedor:</div>

                        {["nombre", "ruc", "telefono", "correo", "ciudad"].map((f) => (
                            <label key={f} className="grid gap-1">
                                <span className="text-xs text-white/80 capitalize">{f}</span>
                                <input
                                    value={proveedorNuevo[f as keyof typeof proveedorNuevo]}
                                    onChange={(e) =>
                                        setProveedorNuevo((p: any) => ({
                                            ...p,
                                            [f]: e.target.value,
                                        }))
                                    }
                                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                                />
                            </label>
                        ))}

                        <label className="grid gap-1 md:col-span-2">
                            <span className="text-xs text-white/80">Notas</span>
                            <textarea
                                value={proveedorNuevo.notas}
                                onChange={(e) =>
                                    setProveedorNuevo((p: any) => ({
                                        ...p,
                                        notas: e.target.value,
                                    }))
                                }
                                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                            />
                        </label>
                    </>
                )}
            </div>
        </section>
    );
}

function CabeceraSection(props: any) {
    const {
        fecha,
        setFecha,
        tipoDocumento,
        setTipoDocumento,
        serie,
        setSerie,
        numero,
        setNumero,
        moneda,
        setMoneda,
        metodoPago,
        setMetodoPago,
        notas,
        setNotas,
    } = props;
    return (
        <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <h2 className="mb-3 text-lg font-medium">Cabecera</h2>
            <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Fecha</span>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Tipo doc.</span>
                    <input
                        value={tipoDocumento}
                        onChange={(e) => setTipoDocumento(e.target.value)}
                        placeholder="Factura/Boleta"
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Serie</span>
                    <input
                        value={serie}
                        onChange={(e) => setSerie(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Número</span>
                    <input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Moneda</span>
                    <input
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1">
                    <span className="text-xs text-white/80">Método de pago</span>
                    <input
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
                <label className="grid gap-1 md:col-span-3">
                    <span className="text-xs text-white/80">Notas</span>
                    <input
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                    />
                </label>
            </div>
        </section>
    );
}

/* ---- Lookup de producto ---- */
function ProductoLookup({
    value,
    onPick,
    onChangeText,
    fetcher,
}: {
    value: string;
    onPick: (opt: LookupOption) => void;
    onChangeText: (t: string) => void;
    fetcher: (q: string) => Promise<LookupOption[]>;
}) {
    const [q, setQ] = useState(value);
    const [opts, setOpts] = useState<LookupOption[]>([]);
    useEffect(() => setQ(value), [value]);

    useEffect(() => {
        if (!q.trim()) return setOpts([]);
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            try {
                const list = await fetcher(q);
                if (!ctrl.signal.aborted) setOpts(list);
            } catch {
                if (!ctrl.signal.aborted) setOpts([]);
            }
        }, 300);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [q]);

    return (
        <div className="relative">
            <input
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    onChangeText(e.target.value);
                }}
                placeholder="Buscar producto"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
            />
            {opts.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/15 bg-slate-900/90 backdrop-blur">
                    {opts.map((o) => (
                        <button
                            type="button"
                            key={o.id}
                            onClick={() => {
                                onPick(o);
                                setOpts([]);
                            }}
                            className="block w-full px-3 py-2 text-left hover:bg-white/10"
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---- Modal nuevo producto ---- */
function NuevoProductoModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (prod: CreatedProducto) => void;
}) {
    const [form, setForm] = useState({
        sku: "",
        nombre: "",
        categoria: "",
        marca: "",
        presentacion: "",
        especificacion: "",
        oemCode: "",
        precioCompra: "",
        precioVenta: "",
        minStock: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handle = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            if (!form.sku.trim() || !form.nombre.trim() || !form.categoria.trim()) {
                throw new Error("SKU, Nombre y Categoría son obligatorios.");
            }

            const res = await fetch("/api/productos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    precioCompra: Number(form.precioCompra || 0),
                    precioVenta: Number(form.precioVenta || 0),
                    minStock: Number(form.minStock || 0),
                }),
            });

            const prod = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(prod?.error || "No se pudo crear el producto.");

            onCreated({
                id: prod.id,
                sku: prod.sku,
                nombre: prod.nombre,
                precioCompra: Number(prod.precioCompra ?? 0),
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 text-white shadow-xl border border-white/10">
                <h2 className="text-xl font-semibold mb-4">Nuevo producto</h2>
                {error && (
                    <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}
                <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                    {[
                        ["sku", "SKU *"],
                        ["nombre", "Nombre *"],
                        ["categoria", "Categoría *"],
                        ["marca", "Marca"],
                        ["presentacion", "Presentación"],
                        ["especificacion", "Especificación"],
                        ["oemCode", "OEM Code"],
                        ["precioCompra", "Precio compra"],
                        ["precioVenta", "Precio venta"],
                        ["minStock", "Stock mínimo"],
                    ].map(([k, label]) => (
                        <label key={k} className={`grid gap-1 ${k === "minStock" ? "md:col-span-2" : ""}`}>
                            <span className="text-xs text-white/80">{label}</span>
                            <input
                                type={["precioCompra", "precioVenta", "minStock"].includes(k) ? "number" : "text"}
                                value={form[k as keyof typeof form]}
                                onChange={(e) => handle(k, e.target.value)}
                                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none"
                            />
                        </label>
                    ))}
                    <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : "Crear producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
