import React, { useContext } from "react";
import "./Cards.css";
import { AdminContext } from "../../../Context/AdminContext";

const Cards = ({ maxheight }) => {
  const { url, stats } = useContext(AdminContext);

  const generateRating = (sold) => {
    const maxSold = Math.max(...stats.topProducts.map((p) => p.sold), 1);
    const rating = Math.ceil((sold / maxSold) * 5);

    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={`dot ${index < rating ? "filled" : ""}`}
      ></span>
    ));
  };

  return (
    <div className="card">
      <h3>Top Products</h3>
      <ul
        className="product-list"
        style={{ maxHeight: maxheight, minHeight: maxheight }}
      >
        {stats.topProducts && stats.topProducts.length > 0 ? (
          stats.topProducts.map((product, index) => (
            <li key={index}>
              <div className="lbox">
                <span>{product.name}</span>
                {product.imageUrl && (
                  <img
                    src={url + "/images/" + product.imageUrl}
                    alt={product.name}
                  />
                )}
              </div>

              <div className="rbox">
                <div className="rating">{generateRating(product.sold)}</div>
                <div className="sold-count">
                  <span className="sold-text">{product.sold} sold</span>
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="no-data">
            <span>No top products data available</span>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Cards;
