import { Router } from "express";
import {
  listUserDocuments,
  getUserDocument,
  createUserDocument,
  updateUserDocument,
  deleteUserDocument,
} from "../controllers/userDocument.controller.js";

const router = Router();

router.get("/", listUserDocuments);
router.get("/:id", getUserDocument);
router.post("/", createUserDocument);
router.put("/:id", updateUserDocument);
router.delete("/:id", deleteUserDocument);

export default router;
