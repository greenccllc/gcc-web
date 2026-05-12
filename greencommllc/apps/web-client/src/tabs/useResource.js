import { useState } from 'react';

export function useResource(path) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error((await res.json()).error || 'failed');
      setItems(await res.json());
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { items, loading, error, loaded, load };
}
