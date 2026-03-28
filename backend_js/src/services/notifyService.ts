// Notification service — mock implementation.
// Replace sendSms / sendEmail with real provider SDK calls.

export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || 'mock';
  if (provider === 'mock') {
    console.log(`[SMS MOCK] To: ${phone}  Code: ${code}`);
    return;
  }
  // TODO: integrate real SMS provider (e.g., Twilio, Aliyun SMS)
  throw new Error(`SMS provider "${provider}" not implemented`);
}

export async function sendEmailCode(email: string, code: string): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  if (provider === 'mock') {
    console.log(`[EMAIL MOCK] To: ${email}  Code: ${code}`);
    return;
  }
  // TODO: integrate real email provider (e.g., SendGrid, AWS SES)
  throw new Error(`Email provider "${provider}" not implemented`);
}
