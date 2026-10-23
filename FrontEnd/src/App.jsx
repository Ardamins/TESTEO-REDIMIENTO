import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Login from "./Components/Login/Login";
import Product from "./Components/Product/Product";
import Invoice from "./Components/Invoice/Invoice";
import Statistics from "./Components/Statistics/Statistics";
import Setting from "./Components/Setting/Setting";
import Dashboard from "./Components/Dashboard/Dashboard";
import IndividualProductPage from "./Components/Product/IndividualProductModal/IndividualProductPage";
import { useContext } from "react";
import { AdminContext } from "./Context/AdminContext";
import "./index.css";

function App() {
  const { admin } = useContext(AdminContext);
  const location = useLocation();

  return (
    <div className="app">
      <Routes>
        <Route
          path="/login"
          element={!admin ? <Login /> : <Navigate to="/dashboard" />}
        />

        <Route path="/" element={admin ? <Home /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="product" element={<Product />} />
          <Route
            path="product/addNewProduct"
            element={<IndividualProductPage />}
          />
          <Route path="invoice" element={<Invoice />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="setting" element={<Setting />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={admin ? location.pathname : "/login"} />}
        />
      </Routes>
    </div>
  );
}

export default App;
