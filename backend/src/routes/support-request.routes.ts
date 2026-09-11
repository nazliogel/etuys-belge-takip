import { Router } from "express";

import { SupportRequestController } from "../controllers/support-request.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { CompanyRepository } from "../repositories/company.repository.js";
import { SupportRequestRepository } from "../repositories/support-request.repository.js";
import { SupportRequestService } from "../services/support-request.service.js";

const router = Router();

const supportRequestRepository = new SupportRequestRepository();
const companyRepository = new CompanyRepository();

const supportRequestService = new SupportRequestService(
  supportRequestRepository,
  companyRepository,
);

const supportRequestController = new SupportRequestController(
  supportRequestService,
);

router.use(authenticate);

router.get("/", supportRequestController.list);

router.get("/:id", supportRequestController.getById);

router.post("/", supportRequestController.create);

router.patch("/:id/in-progress", supportRequestController.markInProgress);

router.patch("/:id/resolve", supportRequestController.resolve);

export { router as supportRequestRouter };
