import OverAllInvoiceModel from "../models/OverallInvoice.js";

const getOverAllInvoiceStats = async (req, res) => {
  try {
    const stats = await OverAllInvoiceModel.findOne();

    if (!stats) {
      return res.status(404).json({ message: "No stats found" });
    }

    res.status(200).json({
      success: true,
      message: "Overall invoice stats retrieved successfully",
      stats,
    });
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default getOverAllInvoiceStats;
