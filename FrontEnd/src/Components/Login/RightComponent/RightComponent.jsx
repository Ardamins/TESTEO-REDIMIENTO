import React from "react";
import "./RightComponent.css";
import { assets } from "../../../assets/assets";

const RightComponent = () => {
  return (
    <div className="rightComponent">
      <div className="middleBox">
        <div className="headerBox">
          <p>Welcome to Company Name</p>
          <img src={assets.Frame} alt="" />
        </div>
        <div className="contentBox">
          <img src={assets.Group} alt="" />
        </div>
      </div>
    </div>
  );
};

export default RightComponent;
