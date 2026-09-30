import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "support-requests",
);

export async function saveSupportRequestFiles(files: Express.Multer.File[]) {
  await mkdir(uploadDirectory, { recursive: true });

  const saved: {
    fileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
  }[] = [];

  try {
    for (const file of files) {
      const fileName = path.basename(file.originalname);
      const extension = path.extname(fileName).toLowerCase();
      const storedFileName = `${randomUUID()}${extension}`;

      await writeFile(path.join(uploadDirectory, storedFileName), file.buffer, {
        flag: "wx",
      });

      saved.push({
        fileName,
        storedFileName,
        mimeType: file.mimetype,
        size: file.size,
      });
    }

    return saved;
  } catch (error) {
    await Promise.all(
      saved.map((file) =>
        unlink(path.join(uploadDirectory, file.storedFileName)).catch(
          () => undefined,
        ),
      ),
    );
    throw error;
  }
}

export async function deleteSupportRequestFiles(
  files: { storedFileName: string }[],
) {
  await Promise.all(
    files.map((file) =>
      unlink(path.join(uploadDirectory, file.storedFileName)).catch(
        () => undefined,
      ),
    ),
  );
}
export function getSupportRequestFilePath(storedFileName: string) {
  if (
    !/^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/.test(
      storedFileName,
    )
  ) {
    throw new Error("Geçersiz dosya adı.");
  }

  return path.join(uploadDirectory, storedFileName);
}
