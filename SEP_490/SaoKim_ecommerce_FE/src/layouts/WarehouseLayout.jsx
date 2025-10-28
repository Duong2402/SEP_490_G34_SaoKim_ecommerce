import React from "react";
import WarehouseSidebar from "../components/WarehouseSidebar";

const WarehouseLayout = ({ children }) => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <WarehouseSidebar />
      <div
        className="flex-grow-1 bg-light p-4"
        style={{
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default WarehouseLayout;
