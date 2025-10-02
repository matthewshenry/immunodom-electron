export async function bridgeFetch<T = unknown>(input: string, init?: RequestInit) {
  const res = await window.api.fetch(input, init);
  const contentType = res.headers["content-type"] || "";
  const data = contentType.includes("application/json")
    ? (JSON.parse(res.body) as T)
    : (res.body as unknown as T);
  return { ...res, data };
}
