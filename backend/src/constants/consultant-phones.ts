type ConsultantContact = {
  phone: string;
  email: string;
};

const CONSULTANT_CONTACTS: Record<string, ConsultantContact> = {
  "salih şahin": {
    phone: "0532 111 22 33",
    email: "salihsahin@akkasgroup.com",
  },
  "beyza başaran": {
    phone: "0533 222 33 44",
    email: "beyzabasaran@akkasgroup.com",
  },
  "erkan akkaş": {
    phone: "0534 333 44 55",
    email: "erkanakkasgroup@gmail.com",
  },
  "emin kutay inangu": {
    phone: "0534 333 99 95",
    email: "emin.akkasgroup@gmail.com",
  },
};

function normalizeConsultantName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

export function getConsultantContact(
  consultantName: string | null | undefined,
): ConsultantContact | null {
  if (!consultantName) {
    return null;
  }

  const normalizedName = normalizeConsultantName(consultantName);

  return CONSULTANT_CONTACTS[normalizedName] ?? null;
}

export function getConsultantPhone(
  consultantName: string | null | undefined,
): string | null {
  return getConsultantContact(consultantName)?.phone ?? null;
}

export function getConsultantEmail(
  consultantName: string | null | undefined,
): string | null {
  return getConsultantContact(consultantName)?.email ?? null;
}