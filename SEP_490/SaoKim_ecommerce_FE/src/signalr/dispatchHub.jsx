import * as signalR from "@microsoft/signalr";
import { getToken } from "../api/lib/apiClient";

const API_BASE = "https://localhost:7278";
let dispatchConnection = null;

export function getDispatchHubConnection() {
  if (!dispatchConnection) {
    dispatchConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/dispatch`, {
        accessTokenFactory: () => getToken(),
      })
      .withAutomaticReconnect()
      .build();
  }
  return dispatchConnection;
}
