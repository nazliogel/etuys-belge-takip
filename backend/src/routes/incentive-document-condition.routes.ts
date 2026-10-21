import { Router } from "express";

import { IncentiveDocumentConditionController } from "../controllers/incentive-document-condition.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { requireConditionManager } from "../middlewares/require-condition-manager.js";
import { validate } from "../middlewares/validate.js";
import { IncentiveDocumentConditionRepository } from "../repositories/incentive-document-condition.repository.js";
import {
  conditionIdParamSchema,
  conditionListSchema,
  createConditionSchema,
  reorderConditionsSchema,
  setConditionStatusSchema,
  updateConditionSchema,
} from "../schemas/incentive-document-condition.schema.js";
import { IncentiveDocumentConditionService } from "../services/incentive-document-condition.service.js";

const router = Router();

const repository = new IncentiveDocumentConditionRepository();
const service = new IncentiveDocumentConditionService(repository);
const controller = new IncentiveDocumentConditionController(service);

router.use(authenticate);

router.get("/", validate(conditionListSchema), controller.list);

router.post(
  "/",
  requireConditionManager,
  validate(createConditionSchema),
  controller.create,
);

router.patch(
  "/reorder",
  requireConditionManager,
  validate(reorderConditionsSchema),
  controller.reorder,
);

router.patch(
  "/:id/status",
  requireConditionManager,
  validate(setConditionStatusSchema),
  controller.setStatus,
);

router.patch(
  "/:id",
  requireConditionManager,
  validate(updateConditionSchema),
  controller.update,
);

router.delete(
  "/:id",
  requireConditionManager,
  validate(conditionIdParamSchema),
  controller.deactivate,
);

export const incentiveDocumentConditionRouter = router;