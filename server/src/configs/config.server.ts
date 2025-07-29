require('dotenv').config();

interface IServerConfig {
  serverUrl: string;
  imageHost: string;
  clientUrl: string;
  attendanceUrl: string;
  SMTPUser: string;
  SMTPPassword: string;
}

const serverConfigEnv: Record<string, IServerConfig> = {
  development: {
    serverUrl:
      (process.env.DEV_SERVER_URL as string) || 'http://localhost:8080',
    imageHost:
      (process.env.DEV_IMAGE_HOST as string) || 'http://localhost:8080/uploads',
    clientUrl:
      (process.env.DEV_CLIENT_URL as string) || 'http://localhost:5173',
    attendanceUrl:
      (process.env.DEV_ATTENDANCE_URL as string) ||
      'http://localhost:5173/attendance',
    SMTPUser: process.env.DEV_SMTP_USER as string,
    SMTPPassword: process.env.DEV_SMTP_PASSWORD as string,
  },
  production: {
    serverUrl: process.env.PRO_SERVER_URL as string,
    imageHost: process.env.PRO_IMAGE_HOST as string,
    clientUrl: process.env.PRO_CLIENT_URL as string,
    attendanceUrl: process.env.PRO_ATTENDANCE_URL as string,
    SMTPUser: process.env.PRO_SMTP_USER as string,
    SMTPPassword: process.env.PRO_SMTP_PASSWORD as string,
  },
};

export const serverConfig: IServerConfig =
  serverConfigEnv[process.env.NODE_ENV || 'development'] ||
  serverConfigEnv.development;
