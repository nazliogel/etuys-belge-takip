
const CONSULTANT_PHONES: Record<string, string> = {
  "salih şahin": "0532 111 22 33",
  "beyza başaran": "0533 222 33 44",
  "erkan akkaş": "0534 333 44 55",
  "emin kutay inangu": "0534 333 99 95",
  // yeni danışman eklendikçe buraya normalize edilmiş isim: telefon
  // şeklinde ekleyin.
};

function normalizeConsultantName(name: string): string {
  
  return name.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}


export function getConsultantPhone(
  consultant: string | null | undefined,
): string | null {
  if (!consultant) {
    return null;
  }

  const key = normalizeConsultantName(consultant);

  return CONSULTANT_PHONES[key] ?? null;
}