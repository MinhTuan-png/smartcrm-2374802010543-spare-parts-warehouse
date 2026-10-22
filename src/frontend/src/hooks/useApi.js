// Trạng thái của một lần lấy dữ liệu: đang tải / có lỗi / có dữ liệu (rỗng hay không do trang quyết định).
import { useCallback, useEffect, useState } from 'react';

/**
 * @param {() => Promise<any>} load hàm gọi stockApi; đổi `deps` thì gọi lại
 * @param {any[]} deps
 * @returns {{data:any, loading:boolean, error:import('../api/client.js').ApiError|null, reload:() => void}}
 */
export function useApi(load, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false; // tránh cập nhật state sau khi trang đã đổi bộ lọc hoặc đã tháo
    setState((s) => ({ data: s.data, loading: true, error: null }));
    load()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
