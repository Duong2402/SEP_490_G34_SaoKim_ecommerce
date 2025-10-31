import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCog, faHome, faSearch, faEye, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
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
  const [typeFilter, setTypeFilter] = useState("All"); // All | Sales | Project
  const [pageSize, setPageSize] = useState(10);

  const API_BASE = "https://localhost:7278";

  const typeQuery = useMemo(() => {
    if (typeFilter === "All") return "";
    if (typeFilter === "Sales") return "type=Sales";
    if (typeFilter === "Project") return "type=Project";
    return "";
  }, [typeFilter]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/warehousemanager/dispatch-slips${typeQuery ? `?${typeQuery}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        // Kỳ vọng API trả về { items: [...] }
        setRows(data.items || []);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [typeQuery]); // nạp lại khi đổi filter

  const normType = (t) => {
    if (t === 1 || t === "1") return "Sales";
    if (t === 2 || t === "2") return "Project";
    if (typeof t === "string") return t; // "Sales"/"Project"
    // fallback dựa trên field
    return (t?.customerId || t?.salesOrderNo) ? "Sales" : "Project";
  };

  const handleConfirm = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/dispatch-slips/${id}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Confirmed successfully!");
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 1, confirmedAt: new Date().toISOString() } : r))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Confirm failed!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this dispatch slip?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/dispatch-slips/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Delete failed!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRows = useMemo(() => {
    const kw = (search || "").toLowerCase();
    return rows
      .filter((r) => {
        if (!kw) return true;
        const ref = r.referenceNo || "";
        const so = r.salesOrderNo || "";
        const req = r.requestNo || "";
        const customer = r.customerName || r.customer || ""; // tuỳ API
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
      })
      .slice(0, pageSize);
  }, [rows, search, pageSize]);

  const goToDetail = (id) => {
    // điều chỉnh path theo router của bạn
    window.location.href = `/dispatch-slips/${id}/items`;
  };

  const createSales = () => {
    window.location.href = `/dispatch-slips/new?type=Sales`;
  };
  const createProject = () => {
    window.location.href = `/dispatch-slips/new?type=Project`;
  };

  return (
    <WarehouseLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item>
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Manage Outbound</Breadcrumb.Item>
            <Breadcrumb.Item active>Dispatch Slips</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Dispatch Slips</h4>
          <p className="mb-0">Manage outbound slips for Sales and Project.</p>
        </div>

        <ButtonToolbar className="mb-2 mb-md-0">
          <ButtonGroup className="me-2">
            <Button variant={typeFilter === "All" ? "primary" : "outline-primary"} size="sm" onClick={() => setTypeFilter("All")}>
              All
            </Button>
            <Button variant={typeFilter === "Sales" ? "primary" : "outline-primary"} size="sm" onClick={() => setTypeFilter("Sales")}>
              Sales
            </Button>
            <Button variant={typeFilter === "Project" ? "primary" : "outline-primary"} size="sm" onClick={() => setTypeFilter("Project")}>
              Project
            </Button>
          </ButtonGroup>

          <ButtonGroup>
            <Button variant="outline-success" size="sm" onClick={createSales} title="New Sales Dispatch">
              <FontAwesomeIcon icon={faPlus} className="me-1" /> New Sales
            </Button>
            <Button variant="outline-info" size="sm" onClick={createProject} title="New Project Dispatch">
              <FontAwesomeIcon icon={faPlus} className="me-1" /> New Project
            </Button>
          </ButtonGroup>
        </ButtonToolbar>
      </div>

      {/* Search & View options */}
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
                <span className="icon icon-sm icon-gray">
                  <FontAwesomeIcon icon={faCog} />
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-xs dropdown-menu-right">
                <Dropdown.Item className="fw-bold text-dark">Show</Dropdown.Item>
                <Dropdown.Item className="d-flex fw-bold" onClick={() => setPageSize(10)}>
                  10{" "}
                  {pageSize === 10 && (
                    <span className="icon icon-small ms-auto">
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                </Dropdown.Item>
                <Dropdown.Item className="fw-bold" onClick={() => setPageSize(20)}>20</Dropdown.Item>
                <Dropdown.Item className="fw-bold" onClick={() => setPageSize(30)}>30</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

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
                  <td colSpan="11" className="text-center py-4">Loading...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4 text-muted">No data found</td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const t = normType(r.type ?? r);
                  const isSales = t === "Sales";
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <Badge bg={isSales ? "info" : "secondary"} text="white">
                          {t}
                        </Badge>
                      </td>
                      <td>
                        {isSales ? (r.salesOrderNo || r.referenceNo) : (r.requestNo || r.referenceNo)}
                      </td>
                      <td>
                        {isSales ? (r.customerName || r.customer || "-") : (r.projectName || r.project || "-")}
                      </td>
                      <td>
                        {isSales ? (r.shipTo || "-") : (r.siteName || r.site || "-")}
                      </td>
                      <td>{r.slipDate ? new Date(r.slipDate).toLocaleDateString() : "-"}</td>
                      <td>
                        {r.status === 1 ? (
                          <Badge bg="success" text="white">Confirmed</Badge>
                        ) : r.status === 2 ? (
                          <Badge bg="secondary" text="white">Cancelled</Badge>
                        ) : (
                          <Badge bg="warning" text="dark">Draft</Badge>
                        )}
                      </td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}</td>
                      <td>{r.confirmedAt ? new Date(r.confirmedAt).toLocaleDateString() : "-"}</td>
                      <td>{r.note || ""}</td>
                      <td className="text-end">
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-2"
                          title="View"
                          onClick={() => goToDetail(r.id)}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </Button>

                        {r.status === 0 && (
                          <>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              title="Confirm"
                              onClick={() => handleConfirm(r.id)}
                            >
                              <FontAwesomeIcon icon={faCheck} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDelete(r.id)}
                            >
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
    </WarehouseLayout>
  );
}
