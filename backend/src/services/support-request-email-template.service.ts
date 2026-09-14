type SupportRequestEmailTemplateInput = {
  ticketNumber: string;
  companyName: string;
  consultantName: string;
  description: string;
  createdAt?: Date;
  panelUrl?: string;
};

type SupportRequestEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCreatedAt(date: Date): {
  dateLabel: string;
  timeLabel: string;
  full: string;
} {
  const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  });
  const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
  const dateLabel = dateFormatter.format(date);
  const timeLabel = timeFormatter.format(date);
  return {
    dateLabel,
    timeLabel,
    full: `${dateLabel}, ${timeLabel}`,
  };
}

export function buildSupportRequestEmailTemplate(
  input: SupportRequestEmailTemplateInput,
): SupportRequestEmailTemplate {
  const safeTicketNumber = escapeHtml(input.ticketNumber);
  const safeCompanyName = escapeHtml(input.companyName);
  const safeConsultantName = escapeHtml(input.consultantName);
  const safeDescription = escapeHtml(input.description);
  const safePanelUrl = input.panelUrl ? escapeHtml(input.panelUrl) : null;

  const createdAt = formatCreatedAt(input.createdAt ?? new Date());
  const safeCreatedDate = escapeHtml(createdAt.dateLabel);
  const safeCreatedTime = escapeHtml(createdAt.timeLabel);

  return {
    subject: `Yeni Destek Talebi · ${input.ticketNumber} · ${input.companyName}`,

    text: [
      "Yeni bir destek talebi oluşturuldu.",
      "",
      `Talep No: ${input.ticketNumber}`,
      `Oluşturulma: ${createdAt.full}`,
      `Firma: ${input.companyName}`,
      `Atanan Uzman: ${input.consultantName}`,
      "",
      "Talep Açıklaması:",
      input.description,
      "",
      input.panelUrl
        ? `Talebi görüntülemek için: ${input.panelUrl}`
        : "Destek talebini Teşvik360 panelinden görüntüleyebilirsiniz.",
    ].join("\n"),

    html: `
      <div style="
        margin: 0;
        padding: 40px 16px;
        background-color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
      ">
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="max-width: 600px; margin: 0 auto;"
        >
          <tr>
            <td style="padding-bottom: 24px; text-align: center;">
              <div style="
                font-size: 13px;
                letter-spacing: 4px;
                color: #475569;
                text-transform: uppercase;
                font-weight: 700;
              ">
                Teşvik360
              </div>
            </td>
          </tr>

          <tr>
            <td style="
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
            ">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="
                    height: 5px;
                    background: linear-gradient(90deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%);
                    background-color: #4f46e5;
                    line-height: 5px;
                    font-size: 0;
                  ">&nbsp;</td>
                </tr>
              </table>

              <div style="padding: 36px 40px 8px 40px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align: middle;">
                      <div style="
                        font-size: 11px;
                        color: #64748b;
                        font-weight: 700;
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                        margin-bottom: 8px;
                      ">
                        Destek Talebi
                      </div>
                      <h1 style="
                        margin: 0;
                        font-size: 22px;
                        font-weight: 700;
                        color: #0f172a;
                        line-height: 1.3;
                        letter-spacing: -0.3px;
                      ">
                        Yeni bir talep oluşturuldu
                      </h1>
                    </td>
                    <td style="vertical-align: middle; text-align: right; white-space: nowrap;">
                      <span style="
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: #ecfdf5;
                        color: #047857;
                        border: 1px solid #a7f3d0;
                        border-radius: 999px;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                      ">
                        ● Yeni
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="padding: 24px 40px 8px 40px;">
                <div style="
                  padding: 20px 24px;
                  background-color: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                ">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="vertical-align: top;">
                        <div style="
                          font-size: 11px;
                          color: #64748b;
                          font-weight: 700;
                          letter-spacing: 1.5px;
                          text-transform: uppercase;
                          margin-bottom: 6px;
                        ">
                          Talep Numarası
                        </div>
                        <div style="
                          font-size: 24px;
                          font-weight: 700;
                          color: #4f46e5;
                          font-family: 'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace;
                          letter-spacing: 1px;
                        ">
                          ${safeTicketNumber}
                        </div>
                      </td>
                      <td style="vertical-align: top; text-align: right; padding-left: 16px;">
                        <div style="
                          font-size: 11px;
                          color: #64748b;
                          font-weight: 700;
                          letter-spacing: 1.5px;
                          text-transform: uppercase;
                          margin-bottom: 6px;
                        ">
                          Oluşturulma
                        </div>
                        <div style="
                          font-size: 15px;
                          font-weight: 600;
                          color: #0f172a;
                          line-height: 1.4;
                          white-space: nowrap;
                        ">
                          ${safeCreatedDate}
                        </div>
                        <div style="
                          font-size: 13px;
                          color: #64748b;
                          font-family: 'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace;
                          margin-top: 2px;
                        ">
                          ${safeCreatedTime}
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>

              <div style="padding: 20px 40px 8px 40px;">
                <div style="
                  font-size: 11px;
                  color: #64748b;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  text-transform: uppercase;
                  margin-bottom: 8px;
                ">
                  Firma
                </div>
                <div style="
                  font-size: 16px;
                  font-weight: 600;
                  color: #0f172a;
                  line-height: 1.5;
                  word-break: break-word;
                ">
                  ${safeCompanyName}
                </div>
              </div>

              <div style="padding: 20px 40px 8px 40px;">
                <div style="
                  font-size: 11px;
                  color: #64748b;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  text-transform: uppercase;
                  margin-bottom: 8px;
                ">
                  Atanan Uzman
                </div>
                <div style="
                  font-size: 16px;
                  font-weight: 600;
                  color: #0f172a;
                  line-height: 1.5;
                  word-break: break-word;
                ">
                  ${safeConsultantName}
                </div>
              </div>

              <div style="padding: 24px 40px 8px 40px;">
                <div style="
                  font-size: 11px;
                  color: #64748b;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  text-transform: uppercase;
                  margin-bottom: 10px;
                ">
                  Talep Açıklaması
                </div>
                <div style="
                  padding: 22px 24px;
                  background-color: #fafbff;
                  border: 1px solid #e0e7ff;
                  border-radius: 12px;
                  font-size: 15px;
                  line-height: 1.7;
                  color: #1e293b;
                  white-space: pre-wrap;
                  word-break: break-word;
                ">${safeDescription}</div>
              </div>

              ${
                safePanelUrl
                  ? `
              <div style="padding: 28px 40px 8px 40px; text-align: center;">
                <a href="${safePanelUrl}" style="
                  display: inline-block;
                  padding: 14px 32px;
                  background-color: #4f46e5;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 10px;
                  font-size: 15px;
                  font-weight: 600;
                  letter-spacing: 0.2px;
                  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
                ">
                  Talebi Görüntüle →
                </a>
              </div>
              `
                  : ""
              }

              <div style="padding: 28px 40px 0 40px;">
                <div style="border-top: 1px solid #e2e8f0; height: 1px; line-height: 1px; font-size: 0;">&nbsp;</div>
              </div>

              <div style="padding: 20px 40px 32px 40px;">
                <p style="
                  margin: 0;
                  font-size: 13px;
                  line-height: 1.6;
                  color: #64748b;
                  text-align: center;
                ">
                  Bu bildirim otomatik olarak gönderilmiştir. Talebi yanıtlamak için
                  Teşvik360 panelinize giriş yapabilirsiniz.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 20px 8px 20px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8; font-weight: 500;">
                © Teşvik360 · Destek Talep Sistemi
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1; line-height: 1.5;">
                Bu e-posta yalnızca ilgili kişilere yöneliktir.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  };
}
