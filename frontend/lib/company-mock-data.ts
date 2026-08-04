export const companyMockData = {
  company: {
    id: 1453,
    name: "1453 İstanbul Otomat İnşaat Otomotiv Sanayi ve Ticaret Limited Şirketi",
    taxNumber: "1234567890",
  },

  authorization: {
    personName: "Erkan Akkaş",
    endDate: "31.12.2026",
    remainingDays: 154,
    status: "ACTIVE",
  },

  documents: [
    {
      id: 1028408,
      number: 521456,

      startDate: "17.03.2021",
      endDate: "12.03.2024",
      extensionDate: "12.09.2025",

      supportClass: "GENEL",
      status: "EXPIRED",

      transactions: [
        {
          id: 1,
          title: "Belge Kapatma Başvurusu",
          date: "05.07.2026",
          status: "Sonuçlandı",
        },
        {
          id: 2,
          title: "Revize Başvurusu",
          date: "08.06.2024",
          status: "Sonuçlandı",
        },
        {
          id: 3,
          title: "Yeni Belge Başvurusu",
          date: "17.03.2021",
          status: "Sonuçlandı",
        },
      ],
    },
  ],

  urgencies: [
    {
      id: 1,
      type: "danger",
      title: "Belge süresi dolmuş",
      description: "521456 numaralı belgenizin normal bitiş tarihi geçmiştir.",
    },
    {
      id: 2,
      type: "warning",
      title: "Yetki süresi yaklaşıyor",
      description:
        "Erkan Akkaş adına verilen yetkinin bitmesine 154 gün kaldı.",
    },
  ],

  notifications: [
    {
      id: 1,
      title: "Belge işlemi sonuçlandı",
      description:
        "521456 numaralı belgenizin kapatma başvurusu sonuçlandırıldı.",
      date: "05.07.2026",
      isRead: false,
    },
    {
      id: 2,
      title: "Yetki süresi hatırlatması",
      description:
        "Erkan Akkaş adına verilen yetkilendirme süresi yaklaşmaktadır.",
      date: "01.07.2026",
      isRead: false,
    },
  ],
};
