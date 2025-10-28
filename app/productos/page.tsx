// web/app/productos/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProductoRow = {
    id: string;
    sku: string;
    nombre: string;
    marca: string | null;
    categoria: string;
    oemCode: string | null;
    precioCompra: any;
    precioVenta: any; // Decimal -> string
    stock: number;
    minStock: number;
    fechaActualizacion: string; // ISO
};

type SortKey = "sku" | "nombre" | "precio" | "stock" | "actualizado";

export default function ProductosPage() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<ProductoRow[]>([]);
    const [total, setTotal] = useState(0);
    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(total / pageSize)),
        [total, pageSize]
    );

    // sorting
    const [sort, setSort] = useState<SortKey>("actualizado");
    const [dir, setDir] = useState<"asc" | "desc">("desc");

    // modal create/edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ProductoRow | null>(null);

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                params.set("page", String(page));
                params.set("pageSize", String(pageSize));
                params.set("sort", sort);
                params.set("dir", dir);

                const res = await fetch(`/api/productos?${params.toString()}`);
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
    }, [q, page, pageSize, sort, dir]);

    // helpers
    const fmtMoney = (v: any) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
            maximumFractionDigits: 2,
        }).format(Number(v ?? 0));

    const fmtDate = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleString("es-PE", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            })
            : "—";

    const onSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // reset al buscar
    };

    const toggleSort = (key: SortKey) => {
        if (sort === key) {
            setDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSort(key);
            setDir(key === "actualizado" ? "desc" : "asc");
        }
        setPage(1);
    };

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };
    const openEdit = (p: ProductoRow) => {
        setEditing(p);
        setModalOpen(true);
    };
    const onSaved = () => {
        setModalOpen(false);
        // refrescar lista
        const ev = new Event("refresh-productos");
        window.dispatchEvent(ev);
        // recargar local
        setPage((p) => p); // trigger useEffect
    };

    useEffect(() => {
        const handler = () => setPage((p) => p); // refresca
        window.addEventListener("refresh-productos", handler);
        return () => window.removeEventListener("refresh-productos", handler);
    }, []);

    const onDelete = async (id: string) => {
        if (!confirm("¿Eliminar este producto?")) return;
        const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
        if (res.ok) setPage((p) => p);
        else alert("No se pudo eliminar");
    };

    const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
        <button
            type="button"
            onClick={() => toggleSort(k)}
            className="inline-flex items-center gap-1"
            title="Ordenar"
        >
            {children}
            <span className="text-xs opacity-70">
                {sort === k ? (dir === "asc" ? "▲" : "▼") : "↕"}
            </span>
        </button>
    );

    return (
        <main className="min-h-screen p-6 text-white bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* header */}
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Productos</h1>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/compras/nueva"
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white"
                        >
                            Nueva compra
                        </Link>
                        <Link
                            href="/dashboard"
                            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 shadow hover:bg-white/20"
                        >
                            Volver al dashboard
                        </Link>
                    </div>
                </header>

                {/* buscador */}
                <section className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <form onSubmit={onSearchSubmit} className="flex gap-3">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar por SKU, nombre, marca, categoría u OEM"
                            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/60 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-white/90 px-4 py-3 text-slate-900 shadow hover:bg-white"
                        >
                            Buscar
                        </button>
                    </form>
                </section>

                {/* tabla */}
                <section className="rounded-2xl border border-white/10 bg-white/10 p-0 backdrop-blur overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-white/10 text-white/80">
                                <tr>
                                    <Th>
                                        <SortBtn k="sku">SKU</SortBtn>
                                    </Th>
                                    <Th>
                                        <SortBtn k="nombre">Nombre</SortBtn>
                                    </Th>
                                    <Th>Marca</Th>
                                    <Th>Categoría</Th>
                                    <Th>OEM</Th>
                                    <Th className="text-right">
                                        <SortBtn k="precio">Precio venta</SortBtn>
                                    </Th>
                                    <Th className="text-right">
                                        <SortBtn k="stock">Stock</SortBtn>
                                    </Th>
                                    <Th className="text-right">Mín.</Th>
                                    <Th className="text-right">
                                        <SortBtn k="actualizado">Actualizado</SortBtn>
                                    </Th>
                                    <Th className="text-right">Acciones</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="p-6 text-center text-white/80">
                                            Cargando…
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-6 text-center text-white/80">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((p) => {
                                        const low = (p.stock ?? 0) <= (p.minStock ?? 0);
                                        return (
                                            <tr
                                                key={p.id}
                                                className="border-t border-white/10 hover:bg-white/5"
                                            >
                                                <Td mono>{p.sku}</Td>
                                                <Td>{p.nombre}</Td>
                                                <Td>{p.marca ?? "—"}</Td>
                                                <Td>{p.categoria}</Td>
                                                <Td mono>{p.oemCode ?? "—"}</Td>
                                                <Td right>{fmtMoney(p.precioVenta)}</Td>
                                                <Td right>
                                                    <span
                                                        className={[
                                                            "inline-flex items-center justify-end rounded px-2 py-0.5 text-xs",
                                                            low
                                                                ? "bg-red-500/20 text-red-200"
                                                                : "bg-emerald-500/20 text-emerald-200",
                                                        ].join(" ")}
                                                    >
                                                        {p.stock ?? 0}
                                                    </span>
                                                </Td>
                                                <Td right>{p.minStock}</Td>
                                                <Td right>{fmtDate(p.fechaActualizacion)}</Td>
                                                <Td right>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEdit(p)}
                                                            className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => onDelete(p.id)}
                                                            className="rounded-lg border border-red-400/40 px-2 py-1 text-red-200 hover:bg-red-500/10"
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

                    {/* paginación */}
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

            {/* Modal de crear/editar */}
            {modalOpen && (
                <ProductModal
                    onClose={() => setModalOpen(false)}
                    onSaved={onSaved}
                    initial={editing ?? undefined}
                />
            )}
        </main>
    );
}

function Th({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
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

/** ---------- Modal Crear/Editar ---------- */
function ProductModal({
    initial,
    onClose,
    onSaved,
}: {
    initial?: Partial<ProductoRow>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!initial?.id;
    const [form, setForm] = useState({
        sku: initial?.sku ?? "",
        nombre: initial?.nombre ?? "",
        marca: initial?.marca ?? "",
        categoria: initial?.categoria ?? "",
        oemCode: initial?.oemCode ?? "",
        precioCompra: String(initial?.precioCompra ?? "0"),
        precioVenta: String(initial?.precioVenta ?? "0"),
        stock: String(initial?.stock ?? "0"),
        minStock: String(initial?.minStock ?? "0"),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
            let endpoint = "/api/productos";
            let method: "POST" | "PUT" = "POST";
            let payload: any;

            if (isEdit) {
                // EDIT: solo campos permitidos
                method = "PUT";
                endpoint = `/api/productos/${initial!.id}`;
                payload = {
                    nombre: form.nombre.trim(),
                    marca: form.marca?.trim() || null,
                    categoria: form.categoria.trim(),
                    oemCode: form.oemCode?.trim() || null,
                    precioVenta: Number(form.precioVenta || 0),
                    minStock: Number(form.minStock || 0),
                };
            } else {
                // CREATE (temporal): todos los campos
                payload = {
                    sku: form.sku.trim(),
                    nombre: form.nombre.trim(),
                    marca: form.marca?.trim() || null,
                    categoria: form.categoria.trim(),
                    oemCode: form.oemCode?.trim() || null,
                    precioCompra: Number(form.precioCompra || 0),
                    precioVenta: Number(form.precioVenta || 0),
                    stock: Number(form.stock || 0),
                    minStock: Number(form.minStock || 0),
                };
            }

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error || "No se pudo guardar");
            }

            onSaved();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const onChange =
        (k: keyof typeof form) =>
            (e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/10 p-6 text-white backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {isEdit ? "Editar producto" : "Nuevo producto (temporal)"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-white/20 px-2 py-1 hover:bg-white/10"
                    >
                        Cerrar
                    </button>
                </div>

                {error && (
                    <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={save} className="grid grid-cols-2 gap-3">
                    <Input label="SKU" value={form.sku} onChange={onChange("sku")} required readOnly={isEdit} />
                    <Input
                        label="Nombre"
                        value={form.nombre}
                        onChange={onChange("nombre")}
                        required
                        className="col-span-1 md:col-span-2"
                    />
                    <Input label="Marca" value={form.marca} onChange={onChange("marca")} />
                    <Input label="Categoría" value={form.categoria} onChange={onChange("categoria")} required />
                    <Input label="OEM" value={form.oemCode} onChange={onChange("oemCode")} />

                    {/* Solo lectura en edición */}
                    <Input
                        label="Precio compra"
                        type="number"
                        step="0.01"
                        value={form.precioCompra}
                        onChange={onChange("precioCompra")}
                        readOnly={isEdit}
                    />

                    <Input
                        label="Precio venta"
                        type="number"
                        step="0.01"
                        value={form.precioVenta}
                        onChange={onChange("precioVenta")}
                    />

                    {/* Solo lectura en edición */}
                    <Input
                        label="Stock"
                        type="number"
                        value={form.stock}
                        onChange={onChange("stock")}
                        readOnly={isEdit}
                    />

                    <Input label="Mínimo" type="number" value={form.minStock} onChange={onChange("minStock")} />

                    <div className="col-span-2 mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-white/90 px-4 py-2 text-slate-900 shadow hover:bg-white disabled:opacity-60"
                        >
                            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Input({
    label,
    className = "",
    ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className={`grid gap-1 ${className}`}>
            <span className="text-xs text-white/80">{label}</span>
            <input
                {...rest}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none transition placeholder:text-white/50 focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20 disabled:opacity-60 read-only:opacity-80"
            />
        </label>
    );
}
