import fs from "node:fs";
import path from "node:path";

import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "imports");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const originalName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const uniqueName = `${Date.now()}-${originalName}${extension}`;

    callback(null, uniqueName);
  },
});

const allowedExtensions = [".xlsx", ".xls"];

const allowedMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",

  // Bazı istemciler Excel dosyalarını bu MIME tipiyle gönderebilir.
  "application/octet-stream",
];

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();

  const isValidExtension = allowedExtensions.includes(extension);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  if (!isValidExtension || !isValidMimeType) {
    callback(
      new Error(
        "Sadece .xlsx veya .xls uzantılı Excel dosyaları yüklenebilir.",
      ),
    );

    return;
  }

  callback(null, true);
};

export const importUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
});
