import type { NextFunction, Request, Response } from "express";

import { DocumentRealizationImportService } from "../services/document-realization-import.service.js";

export class DocumentRealizationImportController {
  constructor(private readonly service: DocumentRealizationImportService) {}

  import = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Excel dosyası yüklenmedi.",
        });
        return;
      }

      const result = await this.service.import({
        filePath: req.file.path,
        fileName: req.file.originalname,
        storedFileName: req.file.filename,
        uploadedById: req.user.id,
      });

      res.status(200).json({
        success: true,
        message: "Gerçekleşme Excel dosyası işlendi. Sonuçları kontrol edin.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
