import React, { useState, useContext, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./Charts.css";
import { AdminContext } from "../../../Context/AdminContext";

const Charts = ({ width, height }) => {
  const { stats, handleTypeChange, type } = useContext(AdminContext);

  const fallbackMonthlyData = [
    { period: 1, sales: 0, purchase: 0 },
    { period: 2, sales: 0, purchase: 0 },
    { period: 3, sales: 0, purchase: 0 },
    { period: 4, sales: 0, purchase: 0 },
    { period: 5, sales: 0, purchase: 0 },
    { period: 6, sales: 0, purchase: 0 },
    { period: 7, sales: 0, purchase: 0 },
    { period: 8, sales: 0, purchase: 0 },
  ];

  const fallbackYearlyData = [
    { period: 2020, sales: 0, purchase: 0 },
    { period: 2021, sales: 0, purchase: 0 },
    { period: 2022, sales: 0, purchase: 0 },
    { period: 2023, sales: 0, purchase: 0 },
    { period: 2024, sales: 0, purchase: 0 },
  ];

  const handleModeChange = async (newType) => {
    if (newType !== type && handleTypeChange) {
      await handleTypeChange(newType);
    }
  };

  const chartData = stats?.chartData?.length
    ? stats.chartData
    : type === "yearly"
      ? fallbackYearlyData
      : fallbackMonthlyData;

  const formattedChartData = useMemo(() => {
    return chartData.map((item) => {
      let name = item.period;

      if (type === "monthly") {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        name = monthNames[item.period - 1] || item.period;
      }
      // For yearly, just use the year as is (2020, 2021, etc.)
      // No transformation needed for yearly data

      return {
        name: name.toString(), // Ensure it's a string
        Purchase: item.purchase || 0,
        Sales: item.sales || 0,
        period: item.period,
      };
    });
  }, [chartData, type]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ₹${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="charts-container">
      <div className="chart-header-toggle">
        <select
          className="chart-dropdown"
          value={type}
          onChange={(e) => handleModeChange(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <ResponsiveContainer width={width} height={height}>
        <BarChart
          data={formattedChartData}
          barSize={window.innerWidth <= 480 ? 7 : 15}
          margin={{
            top: window.innerHeight <= 800 ? 5 : 20,
            right: window.innerWidth <= 480 ? 10 : 30,
            left: window.innerWidth <= 480 ? -30 : 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: window.innerWidth <= 480 ? 10 : 12 }}
            stroke="#666"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: window.innerWidth <= 480 ? 10 : 12 }}
            stroke="#666"
            tickFormatter={(value) => {
              if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
              else if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
              return `₹${value}`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: window.innerWidth <= 480 ? "10px" : "12px",
            }}
          />
          <Bar
            dataKey="Purchase"
            fill="#60a5fa"
            radius={[4, 4, 0, 0]}
            name="Purchase"
          />
          <Bar
            dataKey="Sales"
            fill="#34d399"
            radius={[4, 4, 0, 0]}
            name="Sales"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Charts;
