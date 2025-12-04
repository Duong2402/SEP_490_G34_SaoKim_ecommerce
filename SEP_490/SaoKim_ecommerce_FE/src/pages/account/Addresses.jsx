import React from "react";
import AccountPage from "./AccountPage";

export default function Addresses() {
  // Wrapper to open the addresses tab within the unified account experience
  return <AccountPage initialTab="addresses" />;
}
