import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import type { DashboardData } from "@/components/dashboard/dashboard-page";
import { UserRole } from "../mock-auth";

// --- Ortak mock veri ---
export const dashboardMockData = {
  company: {
    name: "1453 İstanbul Otomat İnşaat Otomotiv Sanayi ve Ticaret Limited Şirketi",
  },
  documents: [
    {
      number: "521456",
      endDate: "12.03.2024",
      status: "expired",
    },
  ],
  authorization: {
    holder: "Erkan Akkaş",
    endDate: "31.12.2026",
    remainingDays: 154,
  },
  stats: {
    totalCompanies: 128,
    activeDocuments: 214,
    expiringSoon: 18,
    unreadNotifications: 7,
  },
  urgencies: [
    {
      id: "u1",
      type: "danger" as const,
      title: "Belge süresi dolmuş",
      description: "521456 numaralı belgenin normal bitiş tarihi geçmiştir.",
    },
    {
      id: "u2",
      type: "warning" as const,
      title: "Yetki süresi yaklaşıyor",
      description:
        "Erkan Akkaş adına verilen yetkinin bitmesine 154 gün kaldı.",
    },
  ],
  notifications: [
    {
      id: "n1",
      title: "Belge işlemi sonuçlandı",
      description:
        "521456 numaralı belgenin kapatma başvurusu sonuçlandırıldı.",
      date: "05.07.2026",
      isRead: false,
    },
    {
      id: "n2",
      title: "Yetki süresi hatırlatması",
      description:
        "Erkan Akkaş adına verilen yetkilendirme süresi yaklaşmaktadır.",
      date: "01.07.2026",
      isRead: false,
    },
  ],
  adminActivities: [
    {
      id: "a1",
      title: "Yeni firma kaydı oluşturuldu",
      description: "1453 İstanbul Otomat sisteme eklendi.",
    },
    {
      id: "a2",
      title: "Belge bilgisi güncellendi",
      description: "521456 numaralı belgenin durumu güncellendi.",
    },
  ],
  documentHistory: [
    {
      id: "h1",
      action: "Belge kapatma başvurusu onaylandı",
      documentNumber: "521456",
      date: "05.07.2026 14:32",
      performedBy: "Erkan Akkaş",
      status: "success" as const,
    },
    {
      id: "h2",
      action: "Belge süresi uzatıldı",
      documentNumber: "521456",
      date: "12.06.2026 09:15",
      performedBy: "Sistem",
      status: "info" as const,
    },
    {
      id: "h3",
      action: "Yetki belgesi güncellendi",
      documentNumber: "521456",
      date: "28.05.2026 16:47",
      performedBy: "Erkan Akkaş",
      status: "warning" as const,
    },
    {
      id: "h4",
      action: "Belge süresi dolmuş olarak işaretlendi",
      documentNumber: "521456",
      date: "12.03.2024 00:00",
      performedBy: "Sistem",
      status: "danger" as const,
    },
    {
      id: "h5",
      action: "Belge sisteme kaydedildi",
      documentNumber: "521456",
      date: "10.01.2024 11:22",
      performedBy: "Erkan Akkaş",
      status: "info" as const,
    },
  ],
};

export function getDashboardData(role: UserRole): DashboardData {
  const d = dashboardMockData;

  if (role === "ADMIN") {
    return {
      hero: {
        eyebrow: "Yönetim Paneli",
        title: "Genel Bakış",
        description: "Firma, belge ve yetki süreçlerinin güncel özeti.",
      },
      summary: [
        {
          title: "Toplam Firma",
          value: String(d.stats.totalCompanies),
          description: "Sistemde kayıtlı firma",
          icon: <Building2 size={22} />,
        },
        {
          title: "Aktif Belge",
          value: String(d.stats.activeDocuments),
          description: "Aktif durumda bulunan belge",
          icon: <FileCheck2 size={22} />,
        },
        {
          title: "Süresi Yaklaşan",
          value: String(d.stats.expiringSoon),
          description: "Yakında sona erecek kayıt",
          icon: <CalendarClock size={22} />,
        },
        {
          title: "Yeni Bildirim",
          value: String(d.stats.unreadNotifications),
          description: "Okunmamış bildirim",
          icon: <Bell size={22} />,
        },
      ],
      alertsSection: {
        title: "Yaklaşan Süreler",
        description: "Yakında süresi dolacak belge ve yetkiler.",
      },
      alerts: d.urgencies.map((u) => ({
        level: u.type,
        title: u.title,
        description: u.description,
      })),
      activitiesSection: {
        title: "Son İşlemler",
        description: "Sistem üzerinde gerçekleştirilen son işlemler.",
      },
      activities: d.adminActivities.map((a) => ({
        title: a.title,
        description: a.description,
      })),
      documentHistorySection: {
        title: "Belge İşlem Geçmişi",
        description: "Sistemdeki tüm belge işlemlerinin kronolojik kaydı.",
      },
      documentHistory: d.documentHistory,
    };
  }

  // COMPANY
  const doc = d.documents[0];
  const unread = d.notifications.filter((n) => !n.isRead).length;

  return {
    hero: {
      eyebrow: "Hoş geldiniz",
      title: d.company.name,
      description:
        "Belge durumlarınızı, yetki sürenizi ve önemli bildirimlerinizi buradan takip edebilirsiniz.",
      action: {
        href: "/dashboard/documents",
        label: "Belgelerimi Görüntüle",
      },
    },
    summary: [
      {
        title: "Aktif Belge",
        value: String(d.documents.length),
        description: "Firmanıza ait belge",
        icon: <FileCheck2 size={22} />,
      },
      {
        title: "Belge Bitiş Tarihi",
        value: doc.endDate,
        description: `Belge No: ${doc.number}`,
        icon: <CalendarDays size={22} />,
      },
      {
        title: "Yetki Bitiş Tarihi",
        value: d.authorization.endDate,
        description: `${d.authorization.remainingDays} gün kaldı`,
        icon: <ShieldCheck size={22} />,
      },
      {
        title: "Yeni Bildirim",
        value: String(unread),
        description: "Okunmamış bildirim",
        icon: <Bell size={22} />,
      },
    ],
    alertsSection: {
      title: "Önemli Hatırlatmalar",
      description: "İşlem yapmanız gerekebilecek durumlar",
    },
    alerts: d.urgencies.map((u) => ({
      level: u.type,
      title: u.title,
      description: u.description,
    })),
    // activitiesSection ve activities yok — company'de "Son Bildirimler" görünmeyecek
  };
}
