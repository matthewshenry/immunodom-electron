export {};

declare global {
  interface Window {
    api: {
      fetch: (input: string, init?: RequestInit) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        url: string;
        headers: Record<string, string>;
        body: string;
      }>;
    };
  }
}
