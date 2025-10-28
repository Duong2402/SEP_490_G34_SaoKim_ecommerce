import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";
// import ReceivingList from "./pages/ReceivingList";
// import Outbound from "./pages/Outbound";
// import Inbound from "./pages/Inbound";
// import DispatchList from "./pages/DispatchList";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/inbound" element={<Navigate to="/receiving-slips" replace />} />

        <Route path="/receiving-slips" element={<ReceivingList />} />
        <Route path="/receiving-slips/:id/items" element={<ReceivingSlipItems />} />
        {/* 
        <Route path="/outbound" element={<Outbound />} />
        <Route path="/receiving-list" element={<ReceivingList />} />
        <Route path="/dispatch-list" element={<DispatchList />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
