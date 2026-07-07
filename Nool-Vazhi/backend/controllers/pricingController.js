const AuctionRequest = require('../models/AuctionRequest');

const getPricingEstimate = (req, res) => {
  const { bundles, season } = req.query;
  const b = Number(bundles) || 1;

  const multipliers = { peak: 1.2, festival: 1.5, monsoon: 1.8, offpeak: 0.9, normal: 1.0 };
  const multiplier = multipliers[season] || 1.0;

  const baseCost = 1500;
  const perBundle = 200 * b;
  const poolDiscount = b >= 5 ? 0.15 : b >= 3 ? 0.10 : 0.05;
  const subtotal = (baseCost + perBundle) * multiplier;
  const discount = subtotal * poolDiscount;

  res.json({
    baseCost: Math.round(baseCost * multiplier),
    perBundle: Math.round(perBundle * multiplier),
    poolDiscount: Math.round(discount),
    total: Math.round(subtotal - discount),
    multiplier,
    season: season || 'normal',
    routes: [
      { route: 'Mumbai → Pune', regular: 3500, pooled: 2800, savings: 700 },
      { route: 'Delhi → Jaipur', regular: 4200, pooled: 3360, savings: 840 },
      { route: 'Chennai → Bangalore', regular: 3800, pooled: 3040, savings: 760 },
      { route: 'Hyderabad → Mumbai', regular: 6500, pooled: 5200, savings: 1300 },
      { route: 'Kolkata → Patna', regular: 2800, pooled: 2240, savings: 560 },
    ],
  });
};

const getSuggestedPrice = async (req, res) => {
  try {
    const { from, to, weight } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'Missing from/to locations' });

    const base_rate = 5; // ₹5/kg
    
    // Deterministic pseudo-distance factor based on location names (since we lack true lat/lng API in demo)
    const mockDistance = (from.length + to.length) * 10;
    const distance_factor = 1 + (mockDistance / 100);

    // Demand factor based on open requests
    const openAuctions = await AuctionRequest.countDocuments({ status: 'OPEN' });
    const demand_factor = Math.min(Math.max(1 + (openAuctions / 10) * 0.2, 0.8), 1.3);

    const suggested = base_rate * distance_factor * demand_factor;
    
    res.json({
      suggested: Number(suggested.toFixed(1)),
      min: Number((suggested * 0.85).toFixed(1)),
      max: Number((suggested * 1.15).toFixed(1)),
      demand_factor,
      distance_factor
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPricingEstimate, getSuggestedPrice };
