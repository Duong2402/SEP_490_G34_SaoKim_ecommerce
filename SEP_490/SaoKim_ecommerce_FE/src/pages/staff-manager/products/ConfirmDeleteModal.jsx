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
    <Modal show={show} onHide={onClose} centered dialogClassName="staff-modal">
      <Modal.Header closeButton>
        <Modal.Title className="staff-modal__title">{title}</Modal.Title>
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

ConfirmDeleteModal.defaultProps = {
  title: "Xóa sản phẩm",
  message: "Bạn có chắc muốn xóa sản phẩm này? Thao tác không thể hoàn tác.",
  confirmText: "Xóa",
  cancelText: "Hủy",
  loading: false,
};

export default ConfirmDeleteModal;
