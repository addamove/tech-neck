/** Resolve bundled public assets under either localhost '/' or a Pages subpath.
 * Legacy manifest paths stay compatible; remote, blob and data URLs stay intact.
 */
export function publicAssetUrl(path: string, baseUrl = import.meta.env.BASE_URL): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path;
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (base !== '/' && path.startsWith(base)) return path;
  return `${base}${path.replace(/^\/+/, '').replace(/^\.\//, '')}`;
}
