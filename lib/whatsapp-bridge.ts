const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://localhost:3001";
const BRIDGE_API_KEY = process.env.WHATSAPP_BRIDGE_API_KEY || "";

interface BridgeRequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
}

export async function bridgeRequest<T = unknown>(
  path: string,
  options: BridgeRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, formData } = options;

  const headers: Record<string, string> = {
    "x-api-key": BRIDGE_API_KEY,
  };

  let fetchBody: BodyInit | undefined;

  if (formData) {
    fetchBody = formData;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${BRIDGE_URL}${path}`, {
    method,
    headers,
    body: fetchBody,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Bridge request failed: ${res.status}`);
  }

  return res.json() as T;
}

export function getBridgeWebSocketUrl(): string {
  const wsUrl = BRIDGE_URL.replace(/^http/, "ws");
  return `${wsUrl}/ws?apiKey=${encodeURIComponent(BRIDGE_API_KEY)}`;
}
