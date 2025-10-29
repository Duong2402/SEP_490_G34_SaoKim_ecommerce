import StaffSidebar from "../components/StaffSidebar";

const StaffLayout = ({ children }) => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}>
      <StaffSidebar/>
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

export default StaffLayout;
