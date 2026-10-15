import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api/client';

/**
 * Load an image from a protected API endpoint.
 *
 * `<img src>` cannot send the Authorization header, so the image is fetched through the
 * API client and shown from an object URL (which is revoked when it changes or unmounts).
 * `path` is relative to the API base, e.g. `/cameras/cam-001/snapshot`.
 */
export function useAuthedImage(path: string | null, refreshKey: unknown = 0) {
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) return;
    let objectUrl = '';
    let cancelled = false;
    setError(false);
    apiClient
      .get<Blob>(path, { responseType: 'blob', params: { t: Date.now() } })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, refreshKey]);

  return { src, error };
}

/** URL for an MJPEG stream; streams cannot use headers, so the token goes in the query. */
export function authedStreamUrl(path: string): string {
  const token = localStorage.getItem('token') ?? '';
  return `/api/v1${path}?token=${encodeURIComponent(token)}`;
}
