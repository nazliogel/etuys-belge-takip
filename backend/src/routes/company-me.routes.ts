import { Router } from "express";

import {
  getConsultantEmail,
  getConsultantPhone,
} from "../constants/consultant-phones.js";
import { CompanyRepository } from "../repositories/company.repository.js";

const companyRepository = new CompanyRepository();

export const companyMeRouter = Router();

// Yetki süresi bitmiş firma da kendi danışman bilgisini görebilmeli.
// Sadece kendi firmasının iletişim alanlarını döner, başka veri sızdırmaz.
companyMeRouter.get("/consultant", async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "COMPANY") {
      res.status(200).json({ success: true, message: "OK", data: null });
      return;
    }

    const company = await companyRepository.findByUserId(req.user.id);

    res.status(200).json({
      success: true,
      message: "OK",
      data: company
        ? {
            consultant: company.consultant ?? null,
            consultantPhone: getConsultantPhone(company.consultant),
            consultantEmail: getConsultantEmail(company.consultant),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});