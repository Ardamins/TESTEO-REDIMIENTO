import React, {
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import "./Dashboard.css";
import { assets } from "../../assets/assets";
import Charts from "./Charts/Charts";
import DashboardHeader from "../DashBoardHeader/DashBoardHeader";
import Cards from "./Cards/Cards";
import { AdminContext } from "../../Context/AdminContext";

const Dashboard = () => {
  const { stats, fetchDashboardStats, type } = useContext(AdminContext);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const salesCardContent = useMemo(
    () => (
      <div className="card">
        <h3>Sales Overview</h3>
        <div className="card-row">
          <div className="card-item">
            <img src={assets.Sales} alt="Sales" />
            <p>₹ {stats?.salesOverview?.salesCount?.toLocaleString()} Sales</p>
          </div>
          <div className="card-item">
            <img src={assets.Revenue} alt="Revenue" />
            <p>₹ {stats?.salesOverview?.revenue?.toLocaleString()} Revenue</p>
          </div>
          <div className="card-item">
            <img src={assets.Profit} alt="Profit" />
            <p>₹ {stats?.salesOverview?.profit?.toLocaleString()} Profit</p>
          </div>
          <div className="card-item">
            <img src={assets.Cost} alt="Cost" />
            <p>₹ {stats?.salesOverview?.cost?.toLocaleString()} Cost</p>
          </div>
        </div>
      </div>
    ),
    [stats]
  );

  const purchaseCardContent = useMemo(
    () => (
      <div className="card">
        <h3>Purchase Overview</h3>
        <div className="card-row">
          <div className="card-item">
            <img src={assets.Purchase} alt="Purchase" />
            <p>{stats?.purchaseOverview?.purchaseCount} Purchase</p>
          </div>
          <div className="card-item">
            <img src={assets.Cost} alt="Cost" />
            <p>₹ {stats?.purchaseOverview?.cost?.toLocaleString()} Cost</p>
          </div>
          <div className="card-item">
            <img src={assets.Cancel} alt="Cancel" />
            <p>{stats?.purchaseOverview?.canceledOrders} Cancel</p>
          </div>
          <div className="card-item">
            <img src={assets.Profit} alt="Return" />
            <p>₹ {stats?.purchaseOverview?.returns?.toLocaleString()} Return</p>
          </div>
        </div>
      </div>
    ),
    [stats]
  );

  const chartCardContent = useMemo(
    () => (
      <div className="card chart-card">
        <div className="chart-header">
          <h3>Sales & Purchase</h3>
        </div>
        <div className="chart-placeholder">
          <Charts width="100%" height={300} />
        </div>
      </div>
    ),
    []
  );

  const inventoryCardContent = useMemo(
    () => (
      <div className="card">
        <h3>Inventory Summary</h3>
        <div className="card-row">
          <div className="card-item">
            <img src={assets.Quantity} alt="Quantity" />
            <p>
              {stats?.inventorySummary?.quantityInHand?.toLocaleString()}{" "}
              Quantity in Hand
            </p>
          </div>
          <div className="card-item">
            <img src={assets.way} alt="To be received" />
            <p>
              {stats?.inventorySummary?.toBeReceived?.toLocaleString()} To be
              received
            </p>
          </div>
        </div>
      </div>
    ),
    [stats]
  );

  const productCardContent = useMemo(
    () => (
      <div className="card">
        <h3>Product Summary</h3>
        <div className="card-row">
          <div className="card-item">
            <img src={assets.Suppliers} alt="Suppliers" />
            <p>{stats?.productSummary?.suppliers} Number of Suppliers</p>
          </div>
          <div className="card-item">
            <img src={assets.Quantity} alt="Categories" />
            <p>{stats?.productSummary?.categories} Number of Categories</p>
          </div>
        </div>
      </div>
    ),
    [stats]
  );

  const [leftCards, setLeftCards] = useState([
    { id: "sales", content: salesCardContent },
    { id: "purchase", content: purchaseCardContent },
    { id: "chart", content: chartCardContent },
  ]);

  const [rightCards, setRightCards] = useState([
    { id: "inventory", content: inventoryCardContent },
    { id: "product", content: productCardContent },
    { id: "cards", content: <Cards maxheight={300} /> },
  ]);

  useEffect(() => {
    setLeftCards((prev) => [
      { ...prev[0], content: salesCardContent },
      { ...prev[1], content: purchaseCardContent },
      prev[2], // chart card doesn't depend on stats
    ]);

    setRightCards((prev) => [
      { ...prev[0], content: inventoryCardContent },
      { ...prev[1], content: productCardContent },
      prev[2], // cards component
    ]);
  }, [
    salesCardContent,
    purchaseCardContent,
    inventoryCardContent,
    productCardContent,
  ]);

  const handleDragStart = useCallback((e, cardId, fromColumn) => {
    setDraggedItem(cardId);
    setDraggedFromColumn(fromColumn);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    e.dataTransfer.setData("text/plain", cardId);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e, targetColumn, targetIndex) => {
      e.preventDefault();

      if (!draggedItem || !draggedFromColumn) return;

      const sourceColumn = draggedFromColumn;
      const draggedCardId = draggedItem;

      // Only allow reordering within the same column
      if (sourceColumn !== targetColumn) {
        setDraggedItem(null);
        setDraggedFromColumn(null);
        return;
      }

      if (sourceColumn === "left") {
        setLeftCards((prev) => {
          const draggedCardIndex = prev.findIndex(
            (card) => card.id === draggedCardId
          );
          if (draggedCardIndex === -1) return prev;

          const newCards = [...prev];
          const [draggedCard] = newCards.splice(draggedCardIndex, 1);
          newCards.splice(targetIndex, 0, draggedCard);
          return newCards;
        });
      } else if (sourceColumn === "right") {
        setRightCards((prev) => {
          const draggedCardIndex = prev.findIndex(
            (card) => card.id === draggedCardId
          );
          if (draggedCardIndex === -1) return prev;

          const newCards = [...prev];
          const [draggedCard] = newCards.splice(draggedCardIndex, 1);
          newCards.splice(targetIndex, 0, draggedCard);
          return newCards;
        });
      }

      setDraggedItem(null);
      setDraggedFromColumn(null);
    },
    [draggedItem, draggedFromColumn]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDraggedFromColumn(null);
  }, []);

  return (
    <div className="dashboard-container">
      <DashboardHeader title="Home" showSearch={false} />
      <hr />

      <div className="dashboard-content">
        <div className="dashboard-left">
          {leftCards.map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id, "left")}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "left", index)}
              onDragEnd={handleDragEnd}
              style={{
                cursor: "grab",
                opacity: draggedItem === card.id ? 0.5 : 1,
              }}
            >
              {card.content}
            </div>
          ))}
        </div>

        <div className="dashboard-right">
          {rightCards.map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id, "right")}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "right", index)}
              onDragEnd={handleDragEnd}
              style={{
                cursor: "grab",
                opacity: draggedItem === card.id ? 0.5 : 1,
              }}
            >
              {card.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Dashboard);
