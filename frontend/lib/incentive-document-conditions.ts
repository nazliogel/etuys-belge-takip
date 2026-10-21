import { apiFetch } from "@/lib/api";

export type IncentiveDocumentConditionStatus = "DRAFT" | "PUBLISHED";

export interface IncentiveDocumentCondition {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  status: IncentiveDocumentConditionStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getIncentiveDocumentConditions(): Promise<
  IncentiveDocumentCondition[]
> {
  const response = await apiFetch<ApiResponse<IncentiveDocumentCondition[]>>(
    "/incentive-document-conditions",
  );

  return response.data;
}
export interface SaveIncentiveDocumentConditionInput {
  title: string;
  description: string;
  sortOrder?: number;
}

export async function createIncentiveDocumentCondition(
  input: SaveIncentiveDocumentConditionInput,
): Promise<IncentiveDocumentCondition> {
  const response = await apiFetch<ApiResponse<IncentiveDocumentCondition>>(
    "/incentive-document-conditions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return response.data;
}

export async function updateIncentiveDocumentCondition(
  id: number,
  input: SaveIncentiveDocumentConditionInput,
): Promise<IncentiveDocumentCondition> {
  const response = await apiFetch<ApiResponse<IncentiveDocumentCondition>>(
    `/incentive-document-conditions/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data;
}

export async function setIncentiveDocumentConditionStatus(
  id: number,
  status: IncentiveDocumentConditionStatus,
): Promise<IncentiveDocumentCondition> {
  const response = await apiFetch<ApiResponse<IncentiveDocumentCondition>>(
    `/incentive-document-conditions/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  return response.data;
}

export async function reorderIncentiveDocumentConditions(
  items: Array<{ id: number; sortOrder: number }>,
): Promise<IncentiveDocumentCondition[]> {
  const response = await apiFetch<ApiResponse<IncentiveDocumentCondition[]>>(
    "/incentive-document-conditions/reorder",
    {
      method: "PATCH",
      body: JSON.stringify({ items }),
    },
  );

  return response.data;
}

export async function deactivateIncentiveDocumentCondition(
  id: number,
): Promise<{ id: number; isActive: boolean }> {
  const response = await apiFetch<
    ApiResponse<{ id: number; isActive: boolean }>
  >(`/incentive-document-conditions/${id}`, {
    method: "DELETE",
  });

  return response.data;
}