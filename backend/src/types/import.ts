import type { ImportBatchStatus } from "../generated/prisma/client.js";

export type ImportBatchListQuery = {
  page: number;
  limit: number;
  status?: ImportBatchStatus;
};

export type ImportBatchListResponse = {
  items: Awaited<
    ReturnType<
      import("../repositories/import.repository.js").ImportRepository["findMany"]
    >
  >;
  totalCount: number;
};
