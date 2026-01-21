/**
 * Runtime configuration loader
 * Dynamically infers API URL from browser location
 */

/** Get API base URL based on current browser location */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }
  // Fallback for SSR or non-browser environments
  return 'http://localhost:8000';
}
