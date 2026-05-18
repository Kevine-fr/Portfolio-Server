import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from './contact.schema';
import { CreateContactDto, UpdateContactDto } from './contact.dto';
import { MailService } from '../../mail/mail.service';

function escapeHtml(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectModel(Contact.name) private model: Model<ContactDocument>,
    private readonly mail: MailService,
  ) {}

  findAll(query: any = {}) {
    const filter: any = {};
    if (query.read !== undefined) filter.read = query.read === 'true';
    if (query.archived !== undefined) filter.archived = query.archived === 'true';
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const c = await this.model.findById(id).exec();
    if (!c) throw new NotFoundException();
    return c;
  }

  async create(dto: CreateContactDto, meta: { ip?: string; userAgent?: string } = {}) {
    const created = await this.model.create({ ...dto, ...meta });

    // Fire-and-forget notification email. We do NOT await it inside the
    // request flow — the user shouldn't wait for SMTP, and any failure
    // must NOT prevent the contact from being saved.
    this.notifyAdmin(created, meta).catch((err) =>
      this.logger.error(`notifyAdmin failed: ${err?.message || err}`),
    );

    return created;
  }

  async update(id: string, dto: UpdateContactDto) {
    const c = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!c) throw new NotFoundException();
    return c;
  }

  async remove(id: string) {
    const c = await this.model.findByIdAndDelete(id).exec();
    if (!c) throw new NotFoundException();
    return { deleted: true };
  }

  countUnread() {
    return this.model.countDocuments({ read: false, archived: false });
  }

  // ─── Email notification ───────────────────────────────────────────────────
  private async notifyAdmin(c: ContactDocument, meta: { ip?: string; userAgent?: string }) {
    const to = process.env.CONTACT_NOTIFY_TO;
    if (!to) {
      this.logger.warn('CONTACT_NOTIFY_TO not set — skipping notification.');
      return;
    }
    if (!this.mail.isEnabled()) return;

    const adminUrl    = process.env.ADMIN_DOMAIN ? `https://${process.env.ADMIN_DOMAIN}/contacts` : null;
    const subjectLine = `[Portfolio] ${c.subject || 'Nouveau message'} — ${c.name}`;
    const date        = c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');

    const textParts = [
      `Nouveau message reçu via le formulaire de contact du portfolio.`,
      ``,
      `De      : ${c.name} <${c.email}>`,
      c.subject ? `Sujet   : ${c.subject}` : null,
      `Date    : ${date}`,
      meta.ip ? `IP      : ${meta.ip}` : null,
      meta.userAgent ? `User-Agent : ${meta.userAgent}` : null,
      ``,
      `─────────────────────────────────────────`,
      ``,
      c.message,
      ``,
      `─────────────────────────────────────────`,
      ``,
      `Repondre directement : ${c.email}`,
      adminUrl ? `Gerer depuis l'admin : ${adminUrl}` : null,
    ].filter(Boolean);
    const text = textParts.join('\n');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#27272a">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f4f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;border:1px solid #e4e4e7">
        <tr>
          <td style="background:linear-gradient(135deg,#050309 0%,#1a1408 100%);color:#ffd97a;padding:20px 24px;font-size:13px;letter-spacing:0.25em;font-weight:600">
            &gt; NOUVEAU_MESSAGE.LOG
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
            <p style="margin:0 0 16px;font-size:14px;color:#71717a">
              Un nouveau message a ete recu via le formulaire de contact.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#71717a;width:100px;vertical-align:top">De</td>
                <td style="padding:8px 0;font-size:14px;color:#18181b">
                  <strong>${escapeHtml(c.name)}</strong><br>
                  <a href="mailto:${escapeHtml(c.email)}" style="color:#2563eb;text-decoration:none">${escapeHtml(c.email)}</a>
                </td>
              </tr>
              ${c.subject ? `
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#71717a;vertical-align:top">Sujet</td>
                <td style="padding:8px 0;font-size:14px;color:#18181b"><strong>${escapeHtml(c.subject)}</strong></td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#71717a;vertical-align:top">Date</td>
                <td style="padding:8px 0;font-size:14px;color:#18181b">${escapeHtml(date)}</td>
              </tr>
            </table>

            <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px;margin:0 0 20px">
              <div style="font-size:12px;color:#a1a1aa;letter-spacing:0.15em;margin-bottom:8px">MESSAGE</div>
              <div style="font-size:14px;line-height:1.6;color:#18181b;white-space:pre-wrap;word-wrap:break-word">${escapeHtml(c.message)}</div>
            </div>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:16px">
              <tr>
                <td>
                  <a href="mailto:${escapeHtml(c.email)}?subject=Re:%20${encodeURIComponent(c.subject || '')}"
                     style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500">
                    Repondre &rarr;
                  </a>
                  ${adminUrl ? `
                  <a href="${escapeHtml(adminUrl)}"
                     style="display:inline-block;margin-left:8px;background:#ffffff;color:#18181b;border:1px solid #d4d4d8;padding:9px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500">
                    Ouvrir l'admin
                  </a>` : ''}
                </td>
              </tr>
            </table>

            ${(meta.ip || meta.userAgent) ? `
            <details style="font-size:11px;color:#a1a1aa;font-family:'SF Mono',Menlo,monospace;border-top:1px solid #e4e4e7;padding-top:12px;margin-top:8px">
              <summary style="cursor:pointer;color:#71717a">Metadonnees techniques</summary>
              <div style="padding-top:8px;line-height:1.6">
                ${meta.ip ? `IP : ${escapeHtml(meta.ip)}<br>` : ''}
                ${meta.userAgent ? `UA : ${escapeHtml(meta.userAgent)}` : ''}
              </div>
            </details>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#fafafa;padding:12px 24px;font-size:11px;color:#a1a1aa;letter-spacing:0.1em;border-top:1px solid #e4e4e7">
            PORTFOLIO &middot; NOTIFICATION_SYSTEM
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    await this.mail.send({
      to,
      subject: subjectLine,
      text,
      html,
      replyTo: `${c.name} <${c.email}>`,
    });
  }
}
