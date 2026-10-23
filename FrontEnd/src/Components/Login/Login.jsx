import React from "react";
import "./Login.css";
import LeftComponent from "./LeftComponent/LeftComponent";
import RightComponent from "./RightComponent/RightComponent";

const Login = () => {
  return (
    <div className="Login">
      <LeftComponent />
      <RightComponent />
    </div>
  );
};

export default Login;
