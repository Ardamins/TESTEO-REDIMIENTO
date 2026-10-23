import React from "react";
import "./StatCard.css";

const StatCard = ({ title, value, change, bgColor, icon }) => {
  return (
    <div className="stat-card" style={{ backgroundColor: bgColor }}>
      <div className="stat-header">
        <span>{title}</span>
        {icon && <span>{icon}</span>}
      </div>
      <h2>{value}</h2>
      <p>{change}</p>
    </div>
  );
};

export default StatCard;
