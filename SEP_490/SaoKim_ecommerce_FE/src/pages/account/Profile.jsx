import React from "react";
import AccountPage from "./AccountPage";

export default function Profile() {
  // Wrapper to keep backward compatibility while using the unified account page
  return <AccountPage initialTab="profile" />;
}
