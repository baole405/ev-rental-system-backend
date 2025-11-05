import { Router } from "express";
import {
  createCheckout,
  verifyPayment,
} from "../controllers/payos.controller.js";
import { webhook as handlePayOSWebhook } from "../controllers/payos.webhook.controller.js";

const router = Router();

router.post("/payos/checkout", createCheckout);
router.post("/payos/verify-payment", verifyPayment);
router.post("/payos/webhook", handlePayOSWebhook);

export default router;
