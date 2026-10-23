import React, { useContext, useEffect, useState } from "react";
import "./Sidebar.css";
import {
  FiHome,
  FiBox,
  FiFileText,
  FiBarChart2,
  FiSettings,
} from "react-icons/fi";
import { assets } from "../../assets/assets";
import { NavLink, useLocation } from "react-router-dom";
import { AdminContext } from "../../Context/AdminContext";

const Sidebar = () => {
  const { admin } = useContext(AdminContext);
  const location = useLocation();
  const [activeItem, setActiveItem] = useState("");

  // Map paths to menu item names
  const pathToNameMap = {
    "/dashboard": "Dashboard",
    "/product": "Product",
    "/invoice": "Invoice",
    "/statistics": "Statistics",
    "/setting": "Setting",
    "/product/addNewProduct": "Product",
  };

  // Set active item based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const activeName = pathToNameMap[currentPath] || "Dashboard";
    setActiveItem(activeName);
    localStorage.setItem("activeTab", activeName);
  }, [location.pathname]);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <FiHome className="icon" />,
      path: "/dashboard",
    },
    { name: "Product", icon: <FiBox className="icon" />, path: "/product" },
    {
      name: "Invoice",
      icon: <FiFileText className="icon" />,
      path: "/invoice",
    },
    {
      name: "Statistics",
      icon: <FiBarChart2 className="icon" />,
      path: "/statistics",
    },
    {
      name: "Setting",
      icon: <FiSettings className="icon" />,
      path: "/setting",
    },
  ];

  const handleClick = (itemName) => {
    setActiveItem(itemName);
    localStorage.setItem("activeTab", itemName);
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <img src={assets.Frame} alt="Company Logo" />
      </div>

      <ul className="menu">
        {menuItems.map((item) => (
          <NavLink to={item.path} key={item.name}>
            <li
              className={activeItem === item.name ? "active" : ""}
              onClick={() => handleClick(item.name)}
            >
              {item.icon}
              <span>{item.name}</span>
            </li>
          </NavLink>
        ))}
      </ul>

      <div className="profile">
        <div className="avatars"></div>
        <span>
          {admin.firstName} {admin.lastName}
        </span>
      </div>
    </div>
  );
};

export default Sidebar;
