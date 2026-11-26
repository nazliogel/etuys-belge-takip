import { prisma } from "../config/env.js";
import {
  queueKokpitCompanyNote,
} from "../services/kokpit-report-integration.service.js";

const noteInclude = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  company: {
    select: {
      name: true,
    },
  },
} as const;

export class CompanyNoteRepository {
  async findManyByCompanyId(companyId: number) {
    return prisma.companyNote.findMany({
      where: { companyId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(params: {
    companyId: number;
    text: string;
    authorId: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const note = await tx.companyNote.create({
        data: params,
        include: noteInclude,
      });

      await queueKokpitCompanyNote(tx, note);

      return {
        id: note.id,
        companyId: note.companyId,
        text: note.text,
        authorId: note.authorId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author
          ? {
            id: note.author.id,
            firstName: note.author.firstName,
            lastName: note.author.lastName,
          }
          : null,
      };
    });
  }

  async update(
    id: number,
    companyId: number,
    text: string,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "CompanyNote"
        WHERE id = ${id}
          AND "companyId" = ${companyId}
        FOR UPDATE
      `;

      const existing = await tx.companyNote.findUniqueOrThrow({
        where: { id, companyId },
      });

      const updatedAt = new Date(
        Math.max(
          Date.now(),
          existing.updatedAt.getTime() + 1,
        ),
      );

      const note = await tx.companyNote.update({
        where: { id, companyId },
        data: {
          text,
          updatedAt,
        },
        include: noteInclude,
      });

      if (existing.text !== text) {
        await queueKokpitCompanyNote(tx, note);
      }

      return {
        id: note.id,
        companyId: note.companyId,
        text: note.text,
        authorId: note.authorId,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: note.author
          ? {
            id: note.author.id,
            firstName: note.author.firstName,
            lastName: note.author.lastName,
          }
          : null,
      };
    });
  }
}