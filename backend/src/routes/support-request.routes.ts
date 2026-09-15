import { Router } from "express";

import { SupportRequestController } from "../controllers/support-request.controller.js";

import { authenticate } from "../middlewares/auth.js";

import { CompanyRepository } from "../repositories/company.repository.js";

import { SupportRequestRepository } from "../repositories/support-request.repository.js";

import { UserRepository } from "../repositories/user.repository.js";

import { SupportRequestService } from "../services/support-request.service.js";

import { EmailService } from "../services/email.service.js";

const router = Router();

const supportRequestRepository = new SupportRequestRepository();

const companyRepository = new CompanyRepository();

const userRepository = new UserRepository();

const emailService = new EmailService();

const supportRequestService = new SupportRequestService(
  supportRequestRepository,
  companyRepository,
  userRepository,
  emailService,
);

const supportRequestController = new SupportRequestController(
  supportRequestService,
);

router.use(authenticate);

// Liste
router.get("/", supportRequestController.list);

// Sabit route'lar /:id'den önce olmalı
router.get("/consultants", supportRequestController.listConsultants);

router.get("/unread-count", supportRequestController.getUnreadCount);

// Detay
router.get("/:id", supportRequestController.getById);

// Oluştur
router.post("/", supportRequestController.create);

// Bildirim / okunma
router.patch("/:id/unread", supportRequestController.markUnread);

// Durum değişiklikleri
router.patch("/:id/in-progress", supportRequestController.markInProgress);

router.patch("/:id/resolve", supportRequestController.resolve);

export { router as supportRequestRouter };
