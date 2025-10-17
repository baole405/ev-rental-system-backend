import Brand from "../models/brand.model.js";

const DEFAULT_BRANDS = [
  {
    code: "TESLA-M3",
    name: "Tesla Model 3",
    description: "Compact premium EV sedan with long range and Autopilot features.",
    baseDailyRate: 1450000,
    depositAmount: 5000000,
    imageUrl: null,
  },
  {
    code: "NISSAN-LEAF",
    name: "Nissan Leaf",
    description: "Practical urban EV hatchback ideal for city trips.",
    baseDailyRate: 950000,
    depositAmount: 3000000,
    imageUrl: null,
  },
  {
    code: "VINFAST-VF-E34",
    name: "VinFast VF e34",
    description: "Vietnamese crossover EV with smart assistant integration.",
    baseDailyRate: 870000,
    depositAmount: 2500000,
    imageUrl: null,
  },
  {
    code: "VINFAST-VF3",
    name: "VinFast VF 3",
    description: "Compact city EV ideal for short urban trips.",
    baseDailyRate: 590000,
    depositAmount: 5000000,
    imageUrl: null,
  },
  {
    code: "HYUNDAI-KONA",
    name: "Hyundai Kona Electric",
    description: "Compact SUV EV balancing range and versatility.",
    baseDailyRate: 1150000,
    depositAmount: 4000000,
    imageUrl: null,
  },
  {
    code: "KIA-EV6",
    name: "Kia EV6",
    description: "Sporty crossover EV with ultra-fast charging capability.",
    baseDailyRate: 1280000,
    depositAmount: 4500000,
    imageUrl: null,
  },
];

export const seedBrands = async () => {
  const brandMap = new Map();

  for (const brand of DEFAULT_BRANDS) {
    const doc = await Brand.findOneAndUpdate(
      { code: brand.code },
      brand,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    brandMap.set(brand.code, doc);
  }

  const count = await Brand.estimatedDocumentCount();
  console.log(`Brand seed complete. Total brands: ${count}`);

  return brandMap;
};

export default seedBrands;
