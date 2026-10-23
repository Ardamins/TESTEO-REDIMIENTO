import React, { useState } from "react";
import "./OrderProductModal.css";

const OrderProductModal = ({ product, onClose, onOrder }) => {
  const [orderQty, setOrderQty] = useState(1);

  const handleSubmit = () => {
    if (orderQty > 0) {
      onOrder(product, orderQty);
      onClose();
    }
  };

  return (
    <div className="order-modal-overlay">
      <div className="order-modal">
        <h2>Order Product</h2>
        <p>
          <strong>{product.name || product.productName}</strong>
        </p>

        <div className="modal-row">
          <label>Enter Quantity:</label>
          <input
            type="number"
            value={orderQty}
            min="1"
            onChange={(e) => setOrderQty(parseInt(e.target.value))}
          />
        </div>

        <div className="order-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="order-btn" onClick={handleSubmit}>
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderProductModal;
