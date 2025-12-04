import React from "react";
import AccountPage from "../account/AccountPage";

export default function ChangePassword() {
  // Redirect legacy usage to the unified account page password tab
  return <AccountPage initialTab="password" />;
}
