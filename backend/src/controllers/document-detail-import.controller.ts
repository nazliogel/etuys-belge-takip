import type { NextFunction, Request, Response } from "express";

import { DocumentDetailImportService } from "../services/document-detail-import.service.js";

export class DocumentDetailImportController {
  constructor(
    private readonly documentDetailImportService: DocumentDetailImportService,
  ) {}

  import = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.file) {
        throw new Error("Excel dosyası yüklenmedi.");
      }

      if (!req.user) {
        throw new Error("Kullanıcı bilgisi bulunamadı.");
      }

      const result = await this.documentDetailImportService.import({
        filePath: req.file.path,
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        uploadedById: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: "Belge detay Excel dosyası başarıyla içe aktarıldı.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
