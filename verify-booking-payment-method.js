import "dotenv/config";
import mongoose from "mongoose";
import Booking from "./src/models/booking.model.js";
import { PAYMENT_METHOD } from "./src/constants/statusCodes.js";

console.log("\n🔍 Booking Payment Method Validation Check\n");
console.log("=" .repeat(60));

// Display PAYMENT_METHOD constants
console.log("\n📋 Available Payment Methods from Constants:");
Object.entries(PAYMENT_METHOD).forEach(([key, value]) => {
  console.log(`  ${key}: "${value}"`);
});

// Get schema enum
const bookingSchema = Booking.schema;
const paymentMethodField = bookingSchema.path('paymentMethod');
const allowedValues = paymentMethodField.enumValues || paymentMethodField.options.enum;

console.log("\n✅ Booking Model Accepts:");
allowedValues.forEach((value) => {
  console.log(`  - "${value}"`);
});

// Check consistency
console.log("\n🔎 Consistency Check:");
const constantsValues = Object.values(PAYMENT_METHOD).sort();
const schemaValues = allowedValues.sort();

const isConsistent = JSON.stringify(constantsValues) === JSON.stringify(schemaValues);

if (isConsistent) {
  console.log("  ✅ PASS - Booking model enum matches PAYMENT_METHOD constants");
} else {
  console.log("  ❌ FAIL - Mismatch detected!");
  console.log("\n  Constants:", constantsValues);
  console.log("  Schema:   ", schemaValues);
  
  const missingInSchema = constantsValues.filter(v => !schemaValues.includes(v));
  const extraInSchema = schemaValues.filter(v => !constantsValues.includes(v));
  
  if (missingInSchema.length) {
    console.log("\n  Missing in schema:", missingInSchema);
  }
  if (extraInSchema.length) {
    console.log("\n  Extra in schema (should remove):", extraInSchema);
  }
}

// Test validation
console.log("\n🧪 Validation Tests:");

const testCases = [
  { value: "cash", shouldPass: true },
  { value: "bank_transfer", shouldPass: true },
  { value: "credit_card", shouldPass: true },
  { value: "e_wallet", shouldPass: true },
  { value: "online", shouldPass: false },
  { value: "card", shouldPass: false },
  { value: "wallet", shouldPass: false },
  { value: "transfer", shouldPass: false },
];

testCases.forEach(({ value, shouldPass }) => {
  const isValid = allowedValues.includes(value);
  const status = isValid === shouldPass ? "✅" : "❌";
  const expected = shouldPass ? "ACCEPT" : "REJECT";
  const actual = isValid ? "ACCEPTED" : "REJECTED";
  
  console.log(`  ${status} "${value}" - Expected: ${expected}, Actual: ${actual}`);
});

console.log("\n" + "=".repeat(60));

// Summary
console.log("\n📊 Summary:");
const allPassed = testCases.every(({ value, shouldPass }) => 
  allowedValues.includes(value) === shouldPass
);

if (allPassed && isConsistent) {
  console.log("  🎉 All checks PASSED!");
  console.log("  ✅ Booking model is ready for production");
  console.log("\n💡 Frontend can now use these payment methods:");
  allowedValues.forEach((value) => {
    console.log(`     - paymentMethod: "${value}"`);
  });
} else {
  console.log("  ⚠️  Some checks FAILED!");
  console.log("  🔧 Please review the booking model enum configuration");
}

console.log("\n");
