import Link from "next/link";
import { fmtNumber } from "@/lib/format";

type Props = {
  basePath: string;
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  /** Filtros vigentes de la pantalla: viajan en cada enlace para no perderse al pasar de página. */
  params?: Record<string, string | undefined>;
};

function href(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

// Ventana de páginas alrededor de la actual: con decenas de páginas, listarlas
// todas es peor que no tener paginación.
function ventana(page: number, pageCount: number): number[] {
  const inicio = Math.max(1, Math.min(page - 2, pageCount - 4));
  const fin = Math.min(pageCount, inicio + 4);
  const out: number[] = [];
  for (let i = inicio; i <= fin; i++) out.push(i);
  return out;
}

export function Pagination({ basePath, page, pageCount, total, perPage, params = {} }: Props) {
  if (total === 0) return null;
  const desde = (page - 1) * perPage + 1;
  const hasta = Math.min(page * perPage, total);

  return (
    <div className="pagination">
      <span className="muted">
        {fmtNumber(desde)}–{fmtNumber(hasta)} de {fmtNumber(total)}
      </span>
      {pageCount > 1 && (
        <nav className="pagination-links" aria-label="Paginación">
          {page > 1 ? (
            <Link href={href(basePath, params, page - 1)} rel="prev">
              ‹ Anterior
            </Link>
          ) : (
            <span aria-disabled="true">‹ Anterior</span>
          )}
          {ventana(page, pageCount).map((n) =>
            n === page ? (
              <span key={n} className="current" aria-current="page">
                {n}
              </span>
            ) : (
              <Link key={n} href={href(basePath, params, n)}>
                {n}
              </Link>
            ),
          )}
          {page < pageCount ? (
            <Link href={href(basePath, params, page + 1)} rel="next">
              Siguiente ›
            </Link>
          ) : (
            <span aria-disabled="true">Siguiente ›</span>
          )}
        </nav>
      )}
    </div>
  );
}
