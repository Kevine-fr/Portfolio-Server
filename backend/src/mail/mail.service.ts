import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface SendOptions {
  to:        string | string[];
  subject:   string;
  text:      string;
  html:      string;
  replyTo?:  string;
}

/**
 * SMTP mail sender used by ContactsService to notify the admin when a
 * new message is received. Reads its config from env vars:
 *
 *   SMTP_HOST           e.g. smtp.gmail.com
 *   SMTP_PORT           465 (SSL) or 587 (TLS) — default 587
 *   SMTP_SECURE         "true" for SSL (port 465), default false
 *   SMTP_USER           SMTP login
 *   SMTP_PASS           SMTP password / app-password
 *   SMTP_FROM           "Portfolio <noreply@domain>" — default = SMTP_USER
 *   CONTACT_NOTIFY_TO   destination address(es), comma-separated
 *
 * If SMTP_HOST is missing or invalid, the service starts in DISABLED mode
 * and every send() call is a silent no-op — POST /contacts continues to
 * work, only the email notification is skipped.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = '';
  private enabled = false;

  async onModuleInit() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured (SMTP_HOST/USER/PASS missing) — mail sending disabled.');
      return;
    }

    const port   = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    this.fromAddress = process.env.SMTP_FROM || user;

    this.transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user, pass },
    });

    try {
      await this.transporter.verify();
      this.enabled = true;
      this.logger.log(`SMTP ready — host=${host}:${port} secure=${secure} from=${this.fromAddress}`);
    } catch (err: any) {
      this.logger.error(`SMTP verification failed: ${err?.message || err}`);
      this.transporter = null;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  async send(opts: SendOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) return false;
    try {
      await this.transporter.sendMail({
        from:    this.fromAddress,
        to:      opts.to,
        subject: opts.subject,
        text:    opts.text,
        html:    opts.html,
        replyTo: opts.replyTo,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`sendMail failed: ${err?.message || err}`);
      return false;
    }
  }
}
