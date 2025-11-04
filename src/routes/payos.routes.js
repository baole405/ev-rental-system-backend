import { Router } from "express";
import { webhook as handlePayOSWebhook } from "../controllers/payos.webhook.controller.js";
import { createCheckout } from "../controllers/payos.controller.js";

const router = Router();

router.post("/payos/checkout", createCheckout);
router.post("/payos/webhook", handlePayOSWebhook);

export default router;
