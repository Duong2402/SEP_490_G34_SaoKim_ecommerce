import StaffSidebar from "../components/StaffSidebar";

const StaffLayout = ({ children }) => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <StaffSidebar/>
      
      <div className="flex-grow-1 bg-light" style={{ minHeight: "100vh", width: "100%" }}>
        <div
          className="d-flex justify-content-between align-items-center bg-white shadow-sm px-4 py-3 sticky-top"
          style={{ zIndex: 100 }}
        >
          <div></div>
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small">Hello, Duy</span>
            <button className="btn btn-outline-primary btn-sm">Logout</button>
          </div>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default StaffLayout;
