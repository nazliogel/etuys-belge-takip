import path from "node:path";

interface AuthorizationExpiryEmailTemplateParams {
  companyName: string;
  targetDate: Date;
}
interface ClosureEmailTemplateParams {
  companyName: string;
  documentNumber: string;
  targetDate: Date;
  investorAddress?: string | null;
  authorizationExpired?: boolean; // YENİ
}

interface ExtensionEmailTemplateParams {
  companyName: string;
  targetDate: Date;
  authorizationExpired?: boolean; // YENİ
}
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
function isPastDate(date: Date): boolean {
  const now = new Date();
  const target = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return target < today;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getShortCompanyName(companyName: string): string {
  return companyName.trim().split(/\s+/).slice(0, 2).join(" ");
}

const AUTHORIZATION_NOTICE =
  "Ekranlarınızın takibi, olası teşvik belgesi süre uzatma ya da kapatma işlemlerinin yapılabilmesi " +
  "ve genel süreçlerinizin takip edilebilmesi noktasında yetkilendirme işlemlerinin yapılması gerekmektedir. " +
  "Yetkilendirme evrakları ve süreç bilgisi ayrıca tarafınıza iletilmektedir.";

function authNoticeText(show: boolean): string {
  return show ? `${AUTHORIZATION_NOTICE}\n\n` : "";
}

function authNoticeHtml(show: boolean): string {
  return show
    ? `<p><strong>${escapeHtml(AUTHORIZATION_NOTICE)}</strong></p>`
    : "";
}

export function createClosureEmailTemplate(params: ClosureEmailTemplateParams) {
  const companyName = params.companyName.trim();
  const documentNumber = params.documentNumber.trim();
  const targetDate = formatDate(params.targetDate);
  const investorAddress =
    params.investorAddress?.trim() || "Adres bilgisi sistemde bulunmamaktadır.";
  const authorizationExpired = params.authorizationExpired === true;
  const expired = isPastDate(params.targetDate);
  const subject = `${getShortCompanyName(companyName)} Yatırım Teşvik Belgesi Kapatma İşlemleri Hk.`;

  const text = `Merhabalar,

${documentNumber} belge numaralı yatırım teşvik belgenizin süresi ${targetDate} tarihinde ${expired ? "dolmuş" : "dolacak"} olup bu belge için süre bitimine müteakip yasal olarak 3 ay içerisinde kapatma işlemleri yapılması gerekmektedir.

Yatırım teşvik belgesi kapatma evrakları ekte yer almaktadır.

Firma olarak evrakları tamamlamanızı ve dosyanızı tarafımıza göndermenizi rica edeceğim.

Sonrasında bizde gerekli dosyalarımızı hazırlayıp kuruma müracaatımızı tamamlamış olacağız.


**İşlemlere ilişkin hizmet bedeli ve harç masrafları hakkında uzmanlarımız sizi ayrıca bilgilendirecektir.

Belgenizin kapanış müracaat işlemlerini evraklarınız bize eksiksiz geldikten sonra 10 gün içerisinde tamamlayacağız.

Kapanış işlemlerinde müracaatımız sonrası Ankara’dan uzmanlar ya da bulunduğunuz il müdürlüğünden uzmanlar doğrudan fiziki ziyarete gelecekler.

Firmanıza ziyaret öncesi tarafınıza yine bilgi vermiş olacağız.

Teşvik belgesindeki adres: ${investorAddress} Şu an bu adreste misiniz?

Belgenizin kapanış işlem müracaatı sonrası yeni belge alımı için işlemlerinizi yapabiliriz. Yeni belge alırsanız ilk etapta 3 yıl, sonra talebiniz olursa ilave 1,5 yıl ile belge kullanımını başlatabiliriz.

${authNoticeText(authorizationExpired)}İfade edemediğim bir nokta varsa aşağıdaki iletişim bilgilerinden bana ulaşabilirsiniz.

Saygılarımla,

İyi Çalışmalar Dilerim.`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      ${escapeHtml(documentNumber)} belge numaralı yatırım teşvik
      belgenizin süresi ${escapeHtml(targetDate)} tarihinde ${expired ? "dolmuş" : "dolacak"} olup
      bu belge için süre bitimine müteakip yasal olarak 3 ay içerisinde
      kapatma işlemleri yapılması gerekmektedir.
    </p>

    <p>
      Yatırım teşvik belgesi kapatma evrakları ekte yer almaktadır.
    </p>

    <p>
      Firma olarak evrakları tamamlamanızı ve dosyanızı tarafımıza
      göndermenizi rica edeceğim.
    </p>

    <p>
      Sonrasında bizde gerekli dosyalarımızı hazırlayıp kuruma
      müracaatımızı tamamlamış olacağız.
    </p>

       <p>
      <strong>İşlemlere ilişkin hizmet bedeli ve harç masrafları hakkında
      uzmanlarımız sizi ayrıca bilgilendirecektir.</strong>
    </p>

    <p>
      Belgenizin kapanış müracaat işlemlerini evraklarınız bize eksiksiz
      geldikten sonra 10 gün içerisinde tamamlayacağız.
    </p>

    <p>
      Kapanış işlemlerinde müracaatımız sonrası Ankara’dan uzmanlar ya da
      bulunduğunuz il müdürlüğünden uzmanlar doğrudan fiziki ziyarete
      gelecekler.
    </p>

    <p>
      Firmanıza ziyaret öncesi tarafınıza yine bilgi vermiş olacağız.
    </p>

    <p>
      Teşvik belgesindeki adres:
      ${escapeHtml(investorAddress)}
      Şu an bu adreste misiniz?
    </p>

    <p>
      Belgenizin kapanış işlem müracaatı sonrası yeni belge alımı için
      işlemlerinizi yapabiliriz. Yeni belge alırsanız ilk etapta 3 yıl,
      sonra talebiniz olursa ilave 1,5 yıl ile belge kullanımını
      başlatabiliriz.
    </p>
    ${authNoticeHtml(authorizationExpired)}
    <p>
      İfade edemediğim bir nokta varsa aşağıdaki iletişim bilgilerinden
      bana ulaşabilirsiniz.
    </p>

    <p>
      Saygılarımla,
      <br /><br />
      İyi Çalışmalar Dilerim.
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
        filename: "YATIRIM TEŞVİK BELGESİ-KAPATMA EVRAKLARI 2025.pdf",
        path: path.join(
          attachmentDirectory,
          "yatirim-tesvik-kapatma-evraklari-2025.pdf",
        ),
      },
      {
        filename: "BEYAN VE TAAHHÜTNAME-KREDİLİ.DOCX",
        path: path.join(attachmentDirectory, "beyan-taahhutname-kredili.docx"),
      },
      {
        filename: "BEYAN VE TAAHHÜTNAME-KREDİSİZ.DOCX",
        path: path.join(attachmentDirectory, "beyan-taahhutname-kredisiz.docx"),
      },
    ],
  };
}

export function createExtensionEmailTemplate(
  params: ExtensionEmailTemplateParams,
) {
  const companyName = params.companyName.trim();
  const targetDate = formatDate(params.targetDate);
  const authorizationExpired = params.authorizationExpired === true;
  const expired = isPastDate(params.targetDate);
  const status = expired ? "dolmuştur" : "dolacaktır";

  const subject = `${getShortCompanyName(companyName)} Yatırım Teşvik Belgesi Süre Uzatma İşlemleri Hk.`;

  const text = `Merhaba,

Yatırım teşvik belgenizin süresi ${targetDate} tarihinde ${status}. Belgenizin Bakanlık tarafından iptal edilmemesi adına 1,5 yıllık ek süre uzatımı veya belge kapatma işlemlerinden birinin yapılması zorunludur.

Ek süre talebi için güncel aya ait, "Sanayi ve Teknoloji Bakanlığı’na verilmek üzere" ibareli SGK borcu yoktur yazısı paylaşmanız yeterli olacaktır.

İşlem detayları ve masraflar hakkında uzmanımız sizinle iletişime geçecektir.

${authNoticeText(authorizationExpired)}Sağlıklı günler dileriz.`;

  const html = `
    <p>Merhaba,</p>

    <p>
      Yatırım teşvik belgenizin süresi
      <strong>${escapeHtml(targetDate)}</strong> tarihinde ${status}.
      Belgenizin Bakanlık tarafından iptal edilmemesi adına 1,5 yıllık ek
      süre uzatımı veya belge kapatma işlemlerinden birinin yapılması
      zorunludur.
    </p>

    <p>
      Ek süre talebi için güncel aya ait, "Sanayi ve Teknoloji Bakanlığı’na
      verilmek üzere" ibareli SGK borcu yoktur yazısı paylaşmanız yeterli
      olacaktır.
    </p>

    <p>
      İşlem detayları ve masraflar hakkında uzmanımız sizinle iletişime
      geçecektir.
    </p>
    ${authNoticeHtml(authorizationExpired)}
    <p>Sağlıklı günler dileriz.</p>
  `;

  return {
    subject,
    text,
    html,
    attachments: [],
  };
}

export function createAuthorizationExpiryEmailTemplate(
  params: AuthorizationExpiryEmailTemplateParams,
) {
  const companyName = params.companyName.trim();
  const targetDate = formatDate(params.targetDate);
  const expired = isPastDate(params.targetDate);
  const subject = `${getShortCompanyName(companyName)} E-TUYS Yetkilendirme Süresi Hk.`;

  const text = `Merhabalar,

Yatırım teşvik belgenizin yürütümü için tarafımıza vermiş olduğunuz yetkilendirmenin süresi ${targetDate} tarihinde ${expired ? "dolmuştur" : "dolacaktır"}.

Yetki süresinin sona ermesinin ardından firmanıza ait ekranları kontrol edemeyeceğimiz için ekranlarınızın takibi, olası teşvik belgesi süre uzatma ya da kapatma işlemlerinin yapılabilmesi ve genel süreçlerinizin takip edilebilmesi adına yetkilendirmenin yenilenmesi gerekmektedir.

Yetkilendirme evrakları ekte yer almaktadır. Evrakların aşağıdaki şekilde tamamlanarak tarafımıza iletilmesini rica ederiz.

1- E-TUYS Dilekçesi: Firma kaşesi ve imzası yeterlidir.

2- E-TUYS Taahhütnamesi: Noter onaylı olması gerekmektedir.

3- Kullanıcı Yetkilendirme Formu: Firma kaşesi ve imzası yeterlidir.

4- Vekâletname: Noter onaylı olması gerekmektedir.

5- İmza sirküleri

Evraklarınız hazırlandıktan sonra KEP adresiniz üzerinden Bakanlığın KEP adresine gönderim yapılırken bilgisayarınıza uzaktan bağlanarak destek olacağım.

Bu işlem için firmanıza ait kurumsal bir KEP adresi ile firma yetkilisine ait elektronik imza gerekmektedir.

Saygılarımla,

İyi Çalışmalar Dilerim.`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      Yatırım teşvik belgenizin yürütümü için tarafımıza vermiş olduğunuz
      yetkilendirmenin süresi <strong>${escapeHtml(targetDate)}</strong>
      tarihinde ${expired ? "dolmuştur" : "dolacaktır"}.
    </p>

       <p>
      Yetki süresinin sona ermesinin ardından firmanıza ait ekranları kontrol
      edemeyeceğimiz için ekranlarınızın takibi, olası teşvik belgesi süre
      uzatma ya da kapatma işlemlerinin yapılabilmesi ve genel süreçlerinizin
      takip edilebilmesi adına yetkilendirmenin yenilenmesi gerekmektedir.
    </p>
    <p>
      Yetkilendirme evrakları ekte yer almaktadır. Evrakların aşağıdaki şekilde
      tamamlanarak tarafımıza iletilmesini rica ederiz.
    </p>

    <ol>
      <li>
        <strong>E-TUYS Dilekçesi:</strong>
        Firma kaşesi ve imzası yeterlidir.
      </li>
      <li>
        <strong>E-TUYS Taahhütnamesi:</strong>
        Noter onaylı olması gerekmektedir.
      </li>
      <li>
        <strong>Kullanıcı Yetkilendirme Formu:</strong>
        Firma kaşesi ve imzası yeterlidir.
      </li>
      <li>
        <strong>Vekâletname:</strong>
        Noter onaylı olması gerekmektedir.
      </li>
      <li>
        <strong>İmza sirküleri</strong>
      </li>
    </ol>

    <p>
      Evraklarınız hazırlandıktan sonra KEP adresiniz üzerinden Bakanlığın KEP
      adresine gönderim yapılırken bilgisayarınıza uzaktan bağlanarak destek
      olacağım.
    </p>

    <p>
      Bu işlem için firmanıza ait kurumsal bir KEP adresi ile firma yetkilisine
      ait elektronik imza gerekmektedir.
    </p>

    <p>
      Saygılarımla,
      <br /><br />
      İyi Çalışmalar Dilerim.
    </p>
  `;

  const attachmentDirectory = path.resolve(
    process.cwd(),
    "assets",
    "email-attachments",
    "authorization",
  );

  return {
    subject,
    text,
    html,
    attachments: [
      {
        filename: "E-TUYS DİLEKÇE.DOCX",
        path: path.join(attachmentDirectory, "E-TUYS DİLEKÇE.DOCX"),
      },
      {
        filename: "E-TUYS TAAHHÜTNAME 2026.doc",
        path: path.join(attachmentDirectory, "E-TUYS TAAHHÜTNAME 2026.doc"),
      },
      {
        filename: "E-TUYS Kullanıcı Yetkilendirme Formu.xlsx",
        path: path.join(
          attachmentDirectory,
          "E-TUYS-Kullanici_Yetkilendirme_Formu - Kopya.xlsx",
        ),
      },
      {
        filename: "2026 TEŞVİK VEKALETNAMESİ.DOC",
        path: path.join(attachmentDirectory, "2026 TEŞVİK VEKALETNAMESİ.DOC"),
      },
    ],
  };
}
