import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReceivingList from "./pages/warehousemanager/ReceivingList";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/receiving-slips" element={<ReceivingList />} />
      </Routes>
    </BrowserRouter>
  );
}
