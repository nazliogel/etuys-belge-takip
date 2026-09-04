import path from "node:path";

interface ClosureEmailTemplateParams {
  companyName: string;
  documentNumber: string;
  documentEndDate: Date;
  investorAddress?: string | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createClosureEmailTemplate(
  params: ClosureEmailTemplateParams,
) {
  const companyName = params.companyName.trim();
  const documentNumber = params.documentNumber.trim();
  const documentEndDate = formatDate(params.documentEndDate);
  const investorAddress =
    params.investorAddress?.trim() ||
    "Adres bilgisi sistemde bulunmamaktadır.";

  const subject =
    `${companyName} Yatırım Teşvik Belgesi Kapatma İşlemleri Hk.`;

  const text = `Merhabalar,

${documentNumber} belge numaralı yatırım teşvik belgenizin süresi ${documentEndDate} tarihinde dolmuş olup, bu belge için süre bitimini müteakip yasal olarak 3 ay içerisinde kapatma işlemlerinin yapılması gerekmektedir.

Yatırım teşvik belgesi kapatma evrakları ekte yer almaktadır.

Firma olarak evrakları tamamlamanızı ve dosyanızı tarafımıza göndermenizi rica ederiz.

Sonrasında gerekli dosyalarımızı hazırlayıp kuruma müracaatımızı tamamlamış olacağız.

İşlemler için uzman masrafları hariç, harç masrafları dahil 40.000 TL + KDV faturalandırmamız olacaktır.

Uzman masrafları, uzmanların firmanızı ziyaret edeceği zaman belli olacaktır.

Belgenizin kapanış müracaat işlemlerini, evraklarınız bize eksiksiz ulaştıktan sonra 10 gün içerisinde tamamlayacağız.

Kapanış müracaatımız sonrasında Ankara'dan veya bulunduğunuz il müdürlüğünden uzmanlar firmanıza fiziki ziyarette bulunabilir. Ziyaret öncesinde tarafınıza ayrıca bilgi verilecektir.

Teşvik belgesindeki adres:
${investorAddress}

Şu anda bu adreste misiniz?

Belgenizin kapanış müracaatı sonrasında yeni belge alım işlemlerinizi de gerçekleştirebiliriz. Yeni belge alınması hâlinde ilk etapta 3 yıl, talep edilmesi durumunda ilave 1,5 yıl süreyle belge kullanımına devam edilebilir.

İfade edemediğimiz bir nokta olması hâlinde aşağıdaki iletişim bilgilerinden bize ulaşabilirsiniz.

Saygılarımızla,
Akkaş Group`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      <strong>${escapeHtml(documentNumber)}</strong> belge numaralı yatırım
      teşvik belgenizin süresi
      <strong>${escapeHtml(documentEndDate)}</strong> tarihinde dolmuş olup,
      bu belge için süre bitimini müteakip yasal olarak 3 ay içerisinde
      kapatma işlemlerinin yapılması gerekmektedir.
    </p>

    <p>Yatırım teşvik belgesi kapatma evrakları ekte yer almaktadır.</p>

    <p>
      Firma olarak evrakları tamamlamanızı ve dosyanızı tarafımıza
      göndermenizi rica ederiz.
    </p>

    <p>
      Sonrasında gerekli dosyalarımızı hazırlayıp kuruma müracaatımızı
      tamamlamış olacağız.
    </p>

    <p>
      İşlemler için uzman masrafları hariç, harç masrafları dahil
      <strong>40.000 TL + KDV</strong> faturalandırmamız olacaktır.
    </p>

    <p>
      <strong>Not:</strong> Uzman masrafları, uzmanların firmanızı ziyaret
      edeceği zaman belli olacaktır.
    </p>

    <p>
      Belgenizin kapanış müracaat işlemlerini, evraklarınız bize eksiksiz
      ulaştıktan sonra 10 gün içerisinde tamamlayacağız.
    </p>

    <p>
      Kapanış müracaatımız sonrasında Ankara'dan veya bulunduğunuz il
      müdürlüğünden uzmanlar firmanıza fiziki ziyarette bulunabilir.
      Ziyaret öncesinde tarafınıza ayrıca bilgi verilecektir.
    </p>

    <p>
      Teşvik belgesindeki adres:<br />
      <strong>${escapeHtml(investorAddress)}</strong>
    </p>

    <p>Şu anda bu adreste misiniz?</p>

    <p>
      Belgenizin kapanış müracaatı sonrasında yeni belge alım işlemlerinizi
      de gerçekleştirebiliriz. Yeni belge alınması hâlinde ilk etapta 3 yıl,
      talep edilmesi durumunda ilave 1,5 yıl süreyle belge kullanımına devam
      edilebilir.
    </p>

    <p>
      İfade edemediğimiz bir nokta olması hâlinde aşağıdaki iletişim
      bilgilerinden bize ulaşabilirsiniz.
    </p>

    <p>
      Saygılarımızla,<br />
      <strong>Akkaş Group</strong>
    </p>
  `;

  const attachmentDirectory = path.resolve(
    process.cwd(),
    "assets",
    "email-attachments",
    "closure",
  );

  return {
    subject,
    text,
    html,
    attachments: [
      {
        filename: "Yatirim Tesvik Belgesi Kapatma Evraklari 2025.pdf",
        path: path.join(
          attachmentDirectory,
          "yatirim-tesvik-kapatma-evraklari-2025.pdf",
        ),
      },
      {
        filename: "Beyan ve Taahhutname - Kredili.docx",
        path: path.join(
          attachmentDirectory,
          "beyan-taahhutname-kredili.docx",
        ),
      },
      {
        filename: "Beyan ve Taahhutname - Kredisiz.docx",
        path: path.join(
          attachmentDirectory,
          "beyan-taahhutname-kredisiz.docx",
        ),
      },
    ],
  };
}