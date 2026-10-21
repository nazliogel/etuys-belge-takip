import type { UserRole } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import type {
  ConditionListFilters,
  IncentiveDocumentConditionRepository,
} from "../repositories/incentive-document-condition.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class IncentiveDocumentConditionService {
  constructor(
    private readonly repository: IncentiveDocumentConditionRepository,
  ) {}

  async list(role: UserRole, filters: ConditionListFilters = {}) {
    if (role === "COMPANY") {
      return this.repository.findMany({ ...filters, status: "PUBLISHED" });
    }

    if (role !== "ADMIN" && role !== "OPERATION") {
      throw new AppError("Bu şart maddelerine erişim yetkiniz bulunmuyor.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "CONDITION_ACCESS_DENIED",
      });
    }

    return this.repository.findMany(filters);
  }

  async create(input: {
    title: string;
    description: string;
    sortOrder?: number;
    status?: "DRAFT" | "PUBLISHED";
  }) {
    return this.repository.create({
      title: input.title.trim(),
      description: input.description.trim(),
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? "DRAFT",
    });
  }

  async update(
    id: number,
    input: { title?: string; description?: string; sortOrder?: number },
  ) {
    const result = await this.repository.update(id, {
      ...input,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
    });

    if (result.count === 0) {
      throw this.notFound();
    }

    return this.repository.findActiveById(id);
  }

  async setStatus(id: number, status: "DRAFT" | "PUBLISHED") {
    const result = await this.repository.update(id, { status });

    if (result.count === 0) {
      throw this.notFound();
    }

    return this.repository.findActiveById(id);
  }

  async reorder(items: Array<{ id: number; sortOrder: number }>) {
    const current = await Promise.all(
      items.map(({ id }) => this.repository.findActiveById(id)),
    );

    if (current.some((condition) => condition === null)) {
      throw this.notFound();
    }

    await this.repository.reorder(items);
    return this.list("ADMIN");
  }

  async deactivate(id: number) {
    const result = await this.repository.setActive(id, false);

    if (result.count === 0) {
      throw this.notFound();
    }

    return { id, isActive: false };
  }

  private notFound() {
    return new AppError("Şart maddesi bulunamadı.", {
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: "INCENTIVE_DOCUMENT_CONDITION_NOT_FOUND",
    });
  }
}
