import cors from "cors";
import express from "express";

import { prisma } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./routes/auth.routes.js";
import { companyRouter } from "./routes/company.routes.js";
import companyIdentityRoutes from "./routes/company-identity.routes.js";
import { documentRouter } from "./routes/document.routes.js";
import { closedDocumentRouter } from "./routes/closed-document.routes.js";
import { importRouter } from "./routes/import.routes.js";
import documentDetailImportRoutes from "./routes/document-detail-import.routes.js";
import { userRouter } from "./routes/user.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "E-TUYS Belge Takip API çalışıyor.",
  });
});

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/companies", companyRouter);
app.use("/api/companies", companyIdentityRoutes);
app.use("/api/documents", documentRouter);
app.use("/api/closed-documents", closedDocumentRouter);
app.use("/api/imports", importRouter);
app.use("/api/document-detail-import", documentDetailImportRoutes);
app.use("/api/users", userRouter);

app.use(errorHandler);

export default app;
