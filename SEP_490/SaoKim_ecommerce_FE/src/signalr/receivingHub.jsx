import * as signalR from "@microsoft/signalr";

const API_BASE = "https://localhost:7278";

let connection = null;

export function getReceivingHubConnection() {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/receiving`, {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();
  }
  return connection;
}
