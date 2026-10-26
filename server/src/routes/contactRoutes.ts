import { Router } from "express";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from "../controllers/contactController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  validateBody,
  createContactSchema,
  updateContactSchema,
} from "../middleware/validationMiddleware";

const router = Router();

router.use(authenticateToken);

router.get("/", getContacts);
router.post("/", validateBody(createContactSchema), createContact);
router.patch("/:id", validateBody(updateContactSchema), updateContact);
router.delete("/:id", deleteContact);
router.post("/:id/set-primary", setPrimaryContact);

export default router;
