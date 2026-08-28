type ConsultantContact = {
  phone: string;
  email: string;
};

const CONSULTANT_CONTACTS: Record<string, ConsultantContact> = {
  "salih şahin": {
    phone: "0553 350 72 30",
    email: "salihsahin@akkasgroup.com",
  },
  "beyza başaran": {
    phone: "0549 252 26 27",
    email: "beyzabasaran@akkasgroup.com",
  },
  "ezgi temel": {
    phone: "0554 915 24 28",
    email: "ezgitemel.akkasgroup@gmail.com",
  },
  "emin kutay inangu": {
    phone: "0552 703 70 36",
    email: "emin.akkasgroup@gmail.com",
  },
   "murathan aracı": {
    phone: "0553 313 61 66",
    email: "murathanaraci@aya.com.tr",
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