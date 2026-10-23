import React, { useState, useContext, useEffect } from "react";
import "./Statistics.css";
import DashboardHeader from "../DashBoardHeader/DashBoardHeader";
import Charts from "../Dashboard/Charts/Charts";
import StatCard from "./StatCard/StatCard";
import Cards from "../Dashboard/Cards/Cards";
import { AdminContext } from "../../Context/AdminContext";

const Statistics = () => {
  const { stats, overallStats, inventoryStats } = useContext(AdminContext);

  // ✅ keep cards in state
  const [statsCards, setStatsCards] = useState([]);

  useEffect(() => {
    if (overallStats) {
      setStatsCards([
        {
          id: 1,
          title: "Total Revenue",
          value: `₹${stats?.salesOverview?.revenue?.toLocaleString()}`,
          change: `${inventoryStats?.revenueDifference}% vs last week`,
          bgColor: "#facc15",
        },
        {
          id: 2,
          title: "Products Sold",
          value: `${inventoryStats?.topSelling?.toLocaleString()}`,
          change: `${inventoryStats?.productSoldDifference}% vs last week`,
          bgColor: "#22d3ee",
        },
        {
          id: 3,
          title: "Products In Stock",
          value: `${
            inventoryStats?.totalProducts -
            inventoryStats?.lowStocksOrdered -
            inventoryStats?.lowStocksNotInStock
          }`,
          change: `${inventoryStats?.productInStockDifference}% vs last week`,
          bgColor: "#e879f9",
        },
      ]);
    }
  }, [overallStats, stats, inventoryStats]);

  const [chartProducts, setChartProducts] = useState([
    { id: 1, type: "chart", component: "chart-box" },
    { id: 2, type: "cards", component: "cards" },
  ]);

  return (
    <div className="statistics-container">
      <DashboardHeader title="Statistics" showSearch={false} />
      <hr />

      <div className="up">
        <div className="stats-cards">
          {statsCards.map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragIndex = parseInt(
                  e.dataTransfer.getData("text/plain")
                );
                if (dragIndex !== index) {
                  const newCards = [...statsCards];
                  const dragged = newCards.splice(dragIndex, 1)[0];
                  newCards.splice(index, 0, dragged);
                  setStatsCards(newCards); // ✅ update state
                }
              }}
              style={{
                cursor: "grab",
                flex: "1",
                minWidth: "100px",
                transition: "transform 0.2s ease",
                ...(window.innerWidth >= 1024 && window.innerWidth <= 1440
                  ? { minWidth: "200px", flex: "0 0 200px" } // styles only for laptop screens
                  : {}),
              }}
            >
              <StatCard
                title={card.title}
                value={card.value}
                change={card.change}
                bgColor={card.bgColor}
              />
            </div>
          ))}
        </div>

        <div className="chart-products">
          {chartProducts.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragIndex = parseInt(
                  e.dataTransfer.getData("text/plain")
                );
                if (dragIndex !== index) {
                  const newChartProducts = [...chartProducts];
                  const dragged = newChartProducts.splice(dragIndex, 1)[0];
                  newChartProducts.splice(index, 0, dragged);
                  setChartProducts(newChartProducts);
                }
              }}
              style={{
                cursor: "grab",
                flex: index === 0 ? "2" : "1",
                transition: "transform 0.2s ease",
              }}
            >
              {item.type === "chart" ? (
                <div className="chart-box">
                  <h3>Sales & Purchase</h3>
                  <Charts width="100%" height={370} />
                </div>
              ) : (
                <Cards className="cds" maxheight={370} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
