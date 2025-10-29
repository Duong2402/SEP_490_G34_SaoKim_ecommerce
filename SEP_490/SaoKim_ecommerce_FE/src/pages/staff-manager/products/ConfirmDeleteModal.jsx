import React from "react";
import PropTypes from "prop-types";
import { Modal, Button } from "react-bootstrap";


function ConfirmDeleteModal({
  show,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  loading,
}) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="mb-0">{message}</p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ConfirmDeleteModal.propTypes = {
  show: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

ConfirmDeleteModal.defaultProps = {
  title: "Delete Product",
  message:
    "Are you sure you want to delete this product? This action cannot be undone.",
  confirmText: "Delete",
  cancelText: "Cancel",
  loading: false,
};

export default ConfirmDeleteModal;
