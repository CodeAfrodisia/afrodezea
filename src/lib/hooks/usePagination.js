import { useMemo, useState, useEffect } from "react";

/** Generic paginator for an array OR remote data.
 *  If `total` is provided, we assume remote pagination (no local slice).
 */
export function usePagination({ items = [], pageSize = 6, initialPage = 1, total = null } = {}) {
  const [page, setPage] = useState(initialPage);

  // Local mode: compute slice
  const pagesLocal = useMemo(() =>
    Math.max(1, Math.ceil((items?.length || 0) / pageSize)), [items?.length, pageSize]);

  useEffect(() => { setPage(1); }, [pageSize]);

  const pageCount = total != null ? Math.max(1, Math.ceil(total / pageSize)) : pagesLocal;
  const canPrev = page > 1;
  const canNext = page < pageCount;

  const currentItems = useMemo(() => {
    if (total != null) return items; // remote mode: items already current page
    const from = (page - 1) * pageSize;
    return (items || []).slice(from, from + pageSize);
  }, [items, page, pageSize, total]);

  return { page, setPage, pageCount, canPrev, canNext, currentItems };
}

