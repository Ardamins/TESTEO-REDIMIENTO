import React from "react";
import "./DashBoardHeader.css";

const DashboardHeader = ({ title, showSearch = true, onSearch }) => {
  const handleSearchChange = (e) => {
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="dashboard-header">
      <h2>{title}</h2>
      {showSearch && (
        <input
          type="text"
          placeholder="Search here..."
          className="search-bar"
          onChange={handleSearchChange}
        />
      )}
    </header>
  );
};

export default DashboardHeader;
