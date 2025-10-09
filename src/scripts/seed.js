import dotenv from "dotenv";
import connectDB from "../config/mongodb.js";
import { seedDatabase } from "../seed/index.js";

// Load environment variables
dotenv.config();

const runSeed = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Connect to MongoDB
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Run seed functions
    await seedDatabase();
    console.log("✅ Database seeding completed successfully!");

    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
    process.exit(1);
  }
};

runSeed();
