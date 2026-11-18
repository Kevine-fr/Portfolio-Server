import { MailService } from './mail.service';
import { ContactsService } from '../modules/contacts/contacts.service';
import { createMemoryModel } from '../../test/utils/memory-model';
import { Contact, ContactSchema } from '../modules/contacts/contact.schema';

describe('MailService', () => {
  it('stays disabled (no-op) without SMTP configuration', async () => {
    const mail = new MailService();
    await mail.onModuleInit();
    expect(mail.isEnabled()).toBe(false);
    await expect(mail.send({ to: 'a@b.c', subject: 's', text: 't', html: 'h' })).resolves.toBe(false);
  });
});

describe('ContactsService notifications', () => {
  afterEach(() => delete process.env.CONTACT_NOTIFY_TO);

  it('saves the message even when the email fails, and escapes HTML', async () => {
    process.env.CONTACT_NOTIFY_TO = 'me@x.dev';
    const send = jest.fn().mockRejectedValue(new Error('smtp down'));
    const mail = { isEnabled: () => true, send } as any;
    const service = new ContactsService(createMemoryModel(Contact.name, ContactSchema) as any, mail);
    const created = await service.create(
      { name: '<b>Eve</b>', email: 'eve@x.dev', message: 'Hello <script>alert(1)</script> there' },
      { ip: '1.2.3.4' },
    );
    expect(created._id).toBeDefined();
    await new Promise((r) => setImmediate(r));
    expect(send).toHaveBeenCalledTimes(1);
    const { html, to } = send.mock.calls[0][0];
    expect(to).toBe('me@x.dev');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
  });
});
