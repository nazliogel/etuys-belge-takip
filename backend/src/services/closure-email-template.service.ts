import path from "node:path";

interface ClosureEmailTemplateParams {
  companyName: string;
  documentNumber: string;
  targetDate: Date;
  investorAddress?: string | null;
}

interface ExtensionEmailTemplateParams {
  companyName: string;
  targetDate: Date;
}
interface AuthorizationExpiryEmailTemplateParams {
  companyName: string;
  targetDate: Date;
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
function getShortCompanyName(companyName: string): string {
  return companyName.trim().split(/\s+/).slice(0, 2).join(" ");
}
export function createClosureEmailTemplate(params: ClosureEmailTemplateParams) {
  const companyName = params.companyName.trim();
  const documentNumber = params.documentNumber.trim();
  const targetDate = formatDate(params.targetDate);
  const investorAddress =
    params.investorAddress?.trim() || "Adres bilgisi sistemde bulunmamaktadır.";

  const subject = `${getShortCompanyName(companyName)} Yatırım Teşvik Belgesi Kapatma İşlemleri Hk.`;

  const text = `Merhabalar,

${documentNumber} belge numaralı yatırım teşvik belgenizin süresi ${targetDate} tarihinde dolacak olup bu belge için süre bitimine müteakip yasal olarak 3 ay içerisinde kapatma işlemleri yapılması gerekmektedir.

Yatırım teşvik belgesi kapatma evrakları ekte yer almaktadır.

Firma olarak evrakları tamamlamanızı ve dosyanızı tarafımıza göndermenizi rica edeceğim.

Sonrasında bizde gerekli dosyalarımızı hazırlayıp kuruma müracaatımızı tamamlamış olacağız.

İşlemler için uzman masrafları hariç, harç masrafları dahil 40.000 TL + KDV faturalandırmamız olacak.

**Uzman masrafları firmanıza uzmanların ziyareti zamanı belli olacak.

Belgenizin kapanış müracaat işlemlerini evraklarınız bize eksiksiz geldikten sonra 10 gün içerisinde tamamlayacağız.

Kapanış işlemlerinde müracaatımız sonrası Ankara’dan uzmanlar ya da bulunduğunuz il müdürlüğünden uzmanlar doğrudan fiziki ziyarete gelecekler.

Firmanıza ziyaret öncesi tarafınıza yine bilgi vermiş olacağız.

Teşvik belgesindeki adres: ${investorAddress} Şu an bu adreste misiniz?

Belgenizin kapanış işlem müracaatı sonrası yeni belge alımı için işlemlerinizi yapabiliriz. Yeni belge alırsanız ilk etapta 3 yıl, sonra talebiniz olursa ilave 1,5 yıl ile belge kullanımını başlatabiliriz.

İfade edemediğim bir nokta varsa aşağıdaki iletişim bilgilerinden bana ulaşabilirsiniz.

Saygılarımla,

Best regards,`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      ${escapeHtml(documentNumber)} belge numaralı yatırım teşvik
      belgenizin süresi ${escapeHtml(targetDate)} tarihinde dolacak olup
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
      İşlemler için uzman masrafları hariç, harç masrafları dahil
      <strong>40.000 TL + KDV</strong> faturalandırmamız olacak.
    </p>

    <p>
      <strong>**Uzman masrafları firmanıza uzmanların ziyareti zamanı
      belli olacak.</strong>
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

    <p>
      İfade edemediğim bir nokta varsa aşağıdaki iletişim bilgilerinden
      bana ulaşabilirsiniz.
    </p>

    <p>
      Saygılarımla,
      <br /><br />
      Best regards,
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

  const subject = `${getShortCompanyName(companyName)} Yatırım Teşvik Belgesi Süre Uzatma İşlemleri Hk.`;

  const text = `Merhabalar,

Yatırım teşvik belgenizin üç yıllık süresi ${targetDate} tarihinde dolacaktır. Süre bitimine müteakip ilave bir buçuk yıl süre uzatım hakkınız mevcut.

Süre uzatımı için güncel aya ait SGK borcu yoktur yazısı (Sanayi ve Teknoloji Bakanlığı’na verilmek üzere ibaresi eklenmelidir.) gerekmektedir.

Yatırım teşvik belgesi süre uzatım ücreti harçlar dahil 20.000 TL + KDV şeklindedir.

***Bakanlıkça yayınlanan tebliğ ve karara istinaden belge süresi dolan firmaların süre bitimi ardından 6 ay içerisinde belge kapatma işlemi ya da mevcutta süre uzatma hakları varsa bu işlemi gerçekleştirilmesi gerekliliği bulunduğunu ve aksi durumda bakanlığın herhangi bir işlem gerçekleştirmeyen firmaların belgelerini iptal etme hakkı bulunduğu bilgisini de hatırlatmak isteriz.

Saygılarımla,

Best regards,`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      Yatırım teşvik belgenizin üç yıllık süresi
      ${escapeHtml(targetDate)} tarihinde dolacaktır. Süre bitimine
      müteakip ilave bir buçuk yıl süre uzatım hakkınız mevcut.
    </p>

    <p>
      Süre uzatımı için güncel aya ait SGK borcu yoktur yazısı
      (Sanayi ve Teknoloji Bakanlığı’na verilmek üzere ibaresi
      eklenmelidir.) gerekmektedir.
    </p>

    <p>
      Yatırım teşvik belgesi süre uzatım ücreti harçlar dahil
      <strong>20.000 TL + KDV</strong> şeklindedir.
    </p>

    <p>
      <strong>
        ***Bakanlıkça yayınlanan tebliğ ve karara istinaden belge süresi
        dolan firmaların süre bitimi ardından 6 ay içerisinde belge
        kapatma işlemi ya da mevcutta süre uzatma hakları varsa bu işlemi
        gerçekleştirilmesi gerekliliği bulunduğunu ve aksi durumda
        bakanlığın herhangi bir işlem gerçekleştirmeyen firmaların
        belgelerini iptal etme hakkı bulunduğu bilgisini de hatırlatmak
        isteriz.
      </strong>
    </p>

    <p>
      Saygılarımla,
      <br /><br />
      Best regards,
    </p>
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

  const subject = `${getShortCompanyName(companyName)} E-TUYS Yetkilendirme Süresi Hk.`;

  const text = `Merhabalar,

Yatırım teşvik belgenizin yürütümü için tarafımıza vermiş olduğunuz yetkilendirmenin süresi ${targetDate} tarihinde dolacaktır.

Yetki süresinin sona ermesinin ardından firmanıza ait ekranları kontrol edemeyeceğimiz için belge kapatma ve gerekli olması hâlinde yapılması gereken diğer işlemleri gerçekleştirebilmemiz adına yetkilendirmenin yenilenmesi gerekmektedir.

Yetkilendirme evrakları ekte yer almaktadır. Evrakların aşağıdaki şekilde tamamlanarak tarafımıza iletilmesini rica ederiz.

1- E-TUYS Dilekçesi: Firma kaşesi ve imzası yeterlidir.

2- E-TUYS Taahhütnamesi: Noter onaylı olması gerekmektedir.

3- Kullanıcı Yetkilendirme Formu: Firma kaşesi ve imzası yeterlidir.

4- Vekâletname: Noter onaylı olması gerekmektedir.

5- İmza sirküleri

Evraklarınız hazırlandıktan sonra KEP adresiniz üzerinden Bakanlığın KEP adresine gönderim yapılırken bilgisayarınıza uzaktan bağlanarak destek olacağım.

Bu işlem için firmanıza ait kurumsal bir KEP adresi ile firma yetkilisine ait elektronik imza gerekmektedir.

Saygılarımla,

Best regards,`;

  const html = `
    <p>Merhabalar,</p>

    <p>
      Yatırım teşvik belgenizin yürütümü için tarafımıza vermiş olduğunuz
      yetkilendirmenin süresi <strong>${escapeHtml(targetDate)}</strong>
      tarihinde dolacaktır.
    </p>

    <p>
      Yetki süresinin sona ermesinin ardından firmanıza ait ekranları kontrol
      edemeyeceğimiz için belge kapatma ve gerekli olması hâlinde yapılması
      gereken diğer işlemleri gerçekleştirebilmemiz adına yetkilendirmenin
      yenilenmesi gerekmektedir.
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
      Best regards,
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
