import { UserDTO } from '@anuvarnika/shared';

export interface SendEmailBinding {
  send(message: unknown): Promise<void>;
}

export interface Env {
  DB: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_ALERT_EMAIL?: SendEmailBinding;
  ENVIRONMENT?: string;
  STORE_NAME?: string;
  UPI_ID?: string;
  ADMIN_EMAIL?: string;
  SESSION_SECRET?: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER_EMAIL?: string;
  GMAIL_SENDER_NAME?: string;
  R2_PUBLIC_URL?: string;
  FRONTEND_URL?: string;
  CROSS_ORIGIN_COOKIES?: string;
  DELHIVERY_PERSONAL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_OWNER_CHAT_ID?: string;
  APP_BASE_URL?: string;
}

export interface Variables {
  user?: UserDTO;
  sessionId?: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: Variables;
};
