export class TraccarUnavailableError extends Error {
  constructor(message = "Servidor Traccar no disponible") {
    super(message);
    this.name = "TraccarUnavailableError";
  }
}

export type TraccarPosition = {
  id: number;
  deviceId: number;
  latitude: number;
  longitude: number;
  speed: number; // nudos
  course?: number;
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
  attributes?: Record<string, unknown>;
};

export type TraccarDeviceRemote = {
  id: number;
  name: string;
  uniqueId: string;
  status?: string;
  lastUpdate?: string | null;
};

export type TraccarEvent = {
  id: number;
  type: string;
  deviceId: number;
  geofenceId?: number;
  positionId?: number;
  eventTime?: string;
  attributes?: Record<string, unknown>;
};

function baseUrl(): string {
  const url = process.env.TRACCAR_URL;
  if (!url) throw new TraccarUnavailableError("TRACCAR_URL no configurada");
  return url.replace(/\/$/, "");
}

function authHeader(): string {
  const user = process.env.TRACCAR_USER ?? "";
  const password = process.env.TRACCAR_PASSWORD ?? "";
  return "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
}

async function traccarFetch(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new TraccarUnavailableError();
  }
  if (!res.ok) {
    throw new TraccarUnavailableError(`Traccar respondió ${res.status} en ${path}`);
  }
  return res;
}

export const traccarClient = {
  async createDevice(input: { name: string; uniqueId: string }): Promise<TraccarDeviceRemote> {
    const res = await traccarFetch("/devices", { method: "POST", body: JSON.stringify(input) });
    return res.json();
  },

  async updateDevice(id: number, input: { name: string; uniqueId: string }): Promise<TraccarDeviceRemote> {
    const res = await traccarFetch(`/devices/${id}`, {
      method: "PUT",
      body: JSON.stringify({ id, ...input }),
    });
    return res.json();
  },

  async deleteDevice(id: number): Promise<void> {
    await traccarFetch(`/devices/${id}`, { method: "DELETE" });
  },

  async getDevices(): Promise<TraccarDeviceRemote[]> {
    const res = await traccarFetch("/devices");
    return res.json();
  },

  async getPositions(deviceId: number, from: Date, to: Date): Promise<TraccarPosition[]> {
    const params = new URLSearchParams({
      deviceId: String(deviceId),
      from: from.toISOString(),
      to: to.toISOString(),
    });
    const res = await traccarFetch(`/positions?${params}`);
    return res.json();
  },

  async getPositionById(id: number): Promise<TraccarPosition | null> {
    const res = await traccarFetch(`/positions?id=${id}`);
    const list: TraccarPosition[] = await res.json();
    return list[0] ?? null;
  },

  // Cookie de sesión para el WebSocket (Traccar no acepta Basic auth en /api/socket).
  async getSessionCookie(): Promise<string> {
    const user = process.env.TRACCAR_USER ?? "";
    const password = process.env.TRACCAR_PASSWORD ?? "";
    let res: Response;
    try {
      res = await fetch(`${baseUrl()}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: user, password }),
      });
    } catch {
      throw new TraccarUnavailableError();
    }
    if (!res.ok) throw new TraccarUnavailableError(`Login Traccar falló: ${res.status}`);
    const cookie = res.headers.get("set-cookie");
    if (!cookie) throw new TraccarUnavailableError("Traccar no devolvió cookie de sesión");
    return cookie.split(";")[0];
  },
};
