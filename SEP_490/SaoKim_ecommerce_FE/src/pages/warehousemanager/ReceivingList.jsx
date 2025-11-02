import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCog, faHome, faSearch, faEye, faTrash } from "@fortawesome/free-solid-svg-icons";
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
} from "@themesberg/react-bootstrap";
import WarehouseLayout from "../../layouts/WarehouseLayout";


export default function ReceivingList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const API_BASE = "https://localhost:7278";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips`);
        const data = await res.json();
        setRows(data.items || []);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleConfirm = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Confirmed successfully!");
        setRows((prev) => prev.map(r => r.id === id ? { ...r, status: 1, confirmedAt: new Date().toISOString() } : r));
      } else {
        alert("Confirm failed!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRows = rows.filter(
    (r) =>
      r.referenceNo?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier?.toLowerCase().includes(search.toLowerCase())
  );

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
            <Breadcrumb.Item>Manage Inbound</Breadcrumb.Item>
            <Breadcrumb.Item active>Receiving Slips</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Receiving Slips</h4>
          <p className="mb-0">Manage all incoming goods and their receipts.</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0">
          <ButtonGroup>
            <Button variant="outline-primary" size="sm">
              Download
            </Button>
            <Button variant="outline-primary" size="sm">
              Import
            </Button>
            <Button variant="outline-primary" size="sm">
              Export
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* Search & Filter section */}
      <div className="table-settings mb-4">
        <Row className="justify-content-between align-items-center">
          <Col xs={8} md={6} lg={3} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by reference or supplier"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Col>

          <Col xs={4} md={2} xl={1} className="ps-md-0 text-end">
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle
                split
                as={Button}
                variant="link"
                className="text-dark m-0 p-0"
              >
                <span className="icon icon-sm icon-gray">
                  <FontAwesomeIcon icon={faCog} />
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-xs dropdown-menu-right">
                <Dropdown.Item className="fw-bold text-dark">Show</Dropdown.Item>
                <Dropdown.Item className="d-flex fw-bold">
                  10{" "}
                  <span className="icon icon-small ms-auto">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                </Dropdown.Item>
                <Dropdown.Item className="fw-bold">20</Dropdown.Item>
                <Dropdown.Item className="fw-bold">30</Dropdown.Item>
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
                <th>Reference No</th>
                <th>Supplier</th>
                <th>Receipt Date</th>
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
                  <td colSpan="8" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No data found
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.referenceNo}</td>
                    <td>{r.supplier}</td>
                    <td>{new Date(r.receiptDate).toLocaleDateString()}</td>
                    <td>
                      {r.status === 1 ? (
                        <Badge bg="success" text="white">
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      {r.confirmedAt
                        ? new Date(r.confirmedAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{r.note}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        title="View"
                        onClick={() => window.location.href = `/receiving-slips/${r.id}/items`}
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
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </WarehouseLayout>
  );
}
