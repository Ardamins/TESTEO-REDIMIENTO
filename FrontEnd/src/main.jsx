import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AdminContextProvder from "./Context/AdminContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AdminContextProvder>
      <App />
    </AdminContextProvder>
  </BrowserRouter>
);
