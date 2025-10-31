import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faCog,
  faHome,
  faSearch,
  faEye,
  faTrash,
  faPlus,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import {
  Col,
  Row,
  Form,
  Button,
  ButtonGroup,
  Breadcrumb,
  InputGroup,
  Dropdown,
  Card,
  Table,
  Badge,
  ButtonToolbar,
} from "@themesberg/react-bootstrap";
import WarehouseLayout from "../../layouts/WarehouseLayout";

export default function DispatchList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const API_BASE = "https://localhost:7278";

  // xác định query string dựa trên filter
  const typeQuery = useMemo(() => {
    if (typeFilter === "All") return "";
    return `type=${typeFilter}`;
  }, [typeFilter]);

  // format ngày cho đẹp
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

  // gọi API
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/warehousemanager/dispatch-slips${typeQuery ? `?${typeQuery}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (active) setRows(data.items || []);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [typeQuery]);

  const normType = (t) => {
    if (t === 1 || t === "1") return "Sales";
    if (t === 2 || t === "2") return "Project";
    if (typeof t === "string") return t;
    return (t?.customerId || t?.salesOrderNo) ? "Sales" : "Project";
  };

  // confirm slip
  const handleConfirm = async (id) => {
    if (!window.confirm("Are you sure to confirm this dispatch slip?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/dispatch-slips/${id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to confirm");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 1, confirmedAt: new Date().toISOString() } : r)));
      alert("Confirmed successfully!");
    } catch (err) {
      alert(err.message || "Confirm failed!");
    }
  };

  // delete slip
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this dispatch slip?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/dispatch-slips/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      alert("Deleted successfully!");
    } catch (err) {
      alert(err.message || "Delete failed!");
    }
  };

  // lọc dữ liệu
  const filteredRows = useMemo(() => {
    const kw = (search || "").toLowerCase();
    return rows.filter((r) => {
      if (!kw) return true;
      const ref = r.referenceNo || "";
      const so = r.salesOrderNo || "";
      const req = r.requestNo || "";
      const customer = r.customerName || r.customer || "";
      const project = r.projectName || r.project || "";
      const site = r.siteName || r.site || "";
      return (
        ref.toLowerCase().includes(kw) ||
        so.toLowerCase().includes(kw) ||
        req.toLowerCase().includes(kw) ||
        customer.toLowerCase().includes(kw) ||
        project.toLowerCase().includes(kw) ||
        site.toLowerCase().includes(kw)
      );
    });
  }, [rows, search]);

  // phân trang client
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToDetail = (id) => {
    window.location.href = `/warehouse-dashboard/dispatch-slips/${id}/items`;
  };

  const createSales = () => {
    window.location.href = `/warehouse-dashboard/dispatch-slips/new?type=Sales`;
  };

  const createProject = () => {
    window.location.href = `/warehouse-dashboard/dispatch-slips/new?type=Project`;
  };

  return (
    <WarehouseLayout>
      {/* Header + Filter */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb className="d-none d-md-inline-block breadcrumb-dark breadcrumb-transparent">
            <Breadcrumb.Item>
              <FontAwesomeIcon icon={faHome} href="/warehouse-dashboard"/>
            </Breadcrumb.Item>
            <Breadcrumb.Item>Manage Outbound</Breadcrumb.Item>
            <Breadcrumb.Item active>Dispatch Slips</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Dispatch Slips</h4>
          <p className="mb-0">Manage outbound slips for Sales and Project.</p>
        </div>

        <ButtonToolbar className="mb-2 mb-md-0">
          <ButtonGroup className="me-2">
            {["All", "Sales", "Project"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </Button>
            ))}
          </ButtonGroup>

          <ButtonGroup>
            <Button variant="outline-success" size="sm" onClick={createSales}>
              <FontAwesomeIcon icon={faPlus} className="me-1" /> New Sales
            </Button>
            <Button variant="outline-info" size="sm" onClick={createProject}>
              <FontAwesomeIcon icon={faPlus} className="me-1" /> New Project
            </Button>
          </ButtonGroup>
        </ButtonToolbar>
      </div>

      {/* Search + Settings */}
      <div className="table-settings mb-4">
        <Row className="justify-content-between align-items-center">
          <Col xs={8} md={6} lg={3} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by reference / SO / Request / customer / project"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Col>

          <Col xs={4} md={2} xl={1} className="ps-md-0 text-end">
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle split as={Button} variant="link" className="text-dark m-0 p-0">
                <FontAwesomeIcon icon={faCog} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-xs dropdown-menu-right">
                <Dropdown.Item className="fw-bold text-dark">Show</Dropdown.Item>
                {[10, 20, 30].map((size) => (
                  <Dropdown.Item key={size} onClick={() => setPageSize(size)}>
                    {size}{" "}
                    {pageSize === size && (
                      <FontAwesomeIcon icon={faCheck} className="ms-auto" />
                    )}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          <Table hover className="user-table align-items-center mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Reference / SO / Request</th>
                <th>Customer / Project</th>
                <th>Site / Ship-To</th>
                <th>Slip Date</th>
                <th>Status</th>
                <th>Created</th>
                <th>Confirmed</th>
                <th>Note</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-muted">
                    No data found
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => {
                  const t = normType(r.type ?? r);
                  const isSales = t === "Sales";
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <Badge bg={isSales ? "info" : "secondary"}>{t}</Badge>
                      </td>
                      <td>{isSales ? (r.salesOrderNo || r.referenceNo) : (r.requestNo || r.referenceNo)}</td>
                      <td>{isSales ? (r.customerName || "-") : (r.projectName || "-")}</td>
                      <td>{isSales ? (r.shipTo || "-") : (r.siteName || "-")}</td>
                      <td>{formatDate(r.slipDate)}</td>
                      <td>
                        {r.status === 1 ? (
                          <Badge bg="success">Confirmed</Badge>
                        ) : r.status === 2 ? (
                          <Badge bg="secondary">Cancelled</Badge>
                        ) : (
                          <Badge bg="warning" text="dark">
                            Draft
                          </Badge>
                        )}
                      </td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>{formatDate(r.confirmedAt)}</td>
                      <td>{r.note || ""}</td>
                      <td className="text-end">
                        <Button variant="outline-info" size="sm" className="me-2" onClick={() => goToDetail(r.id)}>
                          <FontAwesomeIcon icon={faEye} />
                        </Button>

                        {r.status === 0 && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => handleConfirm(r.id)}
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(r.id)}>
                              <FontAwesomeIcon icon={faTrash} />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <Button
            variant="outline-primary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            <FontAwesomeIcon icon={faChevronLeft} /> Prev
          </Button>
          <span className="text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline-primary"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            Next <FontAwesomeIcon icon={faChevronRight} />
          </Button>
        </div>
      )}
    </WarehouseLayout>
  );
}
