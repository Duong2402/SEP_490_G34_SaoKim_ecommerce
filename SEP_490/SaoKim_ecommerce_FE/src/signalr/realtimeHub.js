import * as signalR from "@microsoft/signalr";
import { API_BASE as RAW_API_BASE } from "../api/lib/apiClient";

const normalizeBase = (u) => (u ? String(u).replace(/\/+$/, "") : "");

// fallback nếu apiClient export rỗng
const API_BASE = normalizeBase(RAW_API_BASE) || "https://localhost:7278";

let conn = null;
let starting = null;

function readTokenFromStorage() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function resolveToken(getAccessToken) {
  try {
    const t = (await getAccessToken?.()) || "";
    return t || readTokenFromStorage();
  } catch {
    return readTokenFromStorage();
  }
}

export function getRealtimeConnection(getAccessToken) {
  if (conn) return conn;

  conn = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/realtime`, {
      accessTokenFactory: async () => {
        const token = await resolveToken(getAccessToken);

        return token || "";
      },
    })
    .withAutomaticReconnect()
    .build();

  conn.onreconnecting((err) => {
    console.warn("[SignalR] reconnecting", err);
  });
  conn.onreconnected(() => {
    console.log("[SignalR] reconnected");
  });
  conn.onclose((err) => {
    console.warn("[SignalR] closed", err);
  });

  return conn;
}

export async function ensureRealtimeStarted(getAccessToken) {
  const connection = getRealtimeConnection(getAccessToken);

  if (connection.state === signalR.HubConnectionState.Connected) return connection;
  if (starting) return starting;

  starting = connection
    .start()
    .catch((err) => {
      starting = null;
      throw err;
    })
    .then(() => {
      starting = null;
      return connection;
    });

  return starting;
}
