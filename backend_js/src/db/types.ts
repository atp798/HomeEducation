export interface User {
  id: number;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en';
  notification_ai_reply: number; // 0 | 1
  notification_new_session: number;
  notification_channel: 'app' | 'sms' | 'email';
  dnd_enabled: number;
  dnd_start: string;
  dnd_end: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  title: string;
  status: 'active' | 'archived';
  last_message: string | null;
  last_message_at: string | null;
  unread: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface LoginRecord {
  id: number;
  user_id: number;
  device: string;
  ip: string;
  created_at: string;
}

export interface VerificationCode {
  id: number;
  target: string;
  code: string;
  type: 'login' | 'reset' | 'bind';
  expires_at: string;
  used: number;
  attempts: number;
  created_at: string;
}
