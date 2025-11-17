import * as signalR from "@microsoft/signalr";

const API_BASE = "https://localhost:7278";

let inventoryConnection = null;

export function getInventoryHubConnection() {
  if (!inventoryConnection) {
    inventoryConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/inventory`, {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect()
      .build();
  }
  return inventoryConnection;
}
