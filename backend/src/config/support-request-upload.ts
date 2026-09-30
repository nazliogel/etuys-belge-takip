import path from "node:path";
import multer from "multer";

import { AppError } from "../errors/app-error.js";

const allowedTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

/**
 * Multer dosya adını latin1 olarak çözüyor; Türkçe karakterler bozuluyor
 * (ör. "Başvuru.pdf" → "BaÅvuru.pdf"). UTF-8'e geri çeviriyoruz.
 * Ad zaten doğru geldiyse (çeviri geçersiz karakter üretirse) dokunmuyoruz.
 */
function decodeOriginalName(name: string) {
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes("\uFFFD") ? name : decoded;
}

export const supportRequestUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, callback) => {
    file.originalname = decodeOriginalName(file.originalname);

    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes[extension]?.includes(file.mimetype)) {
      callback(
        new AppError("Desteklenmeyen dosya türü.", {
          statusCode: 400,
          code: "SUPPORT_REQUEST_FILE_TYPE_INVALID",
        }),
      );
      return;
    }

    callback(null, true);
  },
}).array("files", 5);
