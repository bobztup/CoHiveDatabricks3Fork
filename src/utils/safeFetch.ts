/**
 * Safe Fetch Wrapper
 * Ensures fetch calls never throw uncaught errors
 */

export async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  try {
    const response = await fetch(url, options).catch(err => {
      console.error('[SafeFetch] Network error:', err);
      return null;
    });
    return response;
  } catch (error) {
    console.error('[SafeFetch] Unexpected error:', error);
    return null;
  }
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await safeFetch(url, options);
    
    if (!response) {
      return { data: null, error: 'Network error: Unable to connect' };
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    const data = await response.json().catch(err => {
      console.error('[SafeFetch] JSON parse error:', err);
      return null;
    });
    
    return { data, error: data ? null : 'Failed to parse response' };
  } catch (error) {
    console.error('[SafeFetch] Unexpected error in safeFetchJson:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
