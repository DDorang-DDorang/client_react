export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    SEND_SIGNUP_CODE: '/api/auth/email/code/signup',
    VERIFY_SIGNUP_CODE: '/api/auth/email/code/signup/verify',
    SEND_RESET_CODE: '/api/auth/email/code/reset',
    VERIFY_RESET_CODE: '/api/auth/email/code/reset/verify',
    RESET_PASSWORD: '/api/auth/password/reset',
    TOKEN_REFRESH: '/api/auth/token/refresh',
    TOKEN_LOGOUT: '/api/auth/token/logout',
    WITHDRAW: '/api/auth/withdraw',
  },
  OAUTH: {
    GOOGLE_LOGIN: '/oauth2/authorization/google',
    LOGIN_SUCCESS: '/api/oauth2/login/success',
    TOKEN_REFRESH: '/api/oauth2/token/refresh',
    TOKEN_LOGOUT: '/api/oauth2/token/logout',
    VALIDATE: '/api/oauth2/validate',
    WITHDRAW: '/api/oauth2/withdraw',
  },
  // TODO: 서버에 구현 필요
  TEAM: {
    CREATE: '/api/teams',
    LIST: '/api/teams',
    GET: '/api/teams/:id',
    UPDATE: '/api/teams/:id',
    DELETE: '/api/teams/:id',
    ADD_MEMBER: '/api/teams/:id/members',
    REMOVE_MEMBER: '/api/teams/:id/members/:userId',
    GET_MEMBERS: '/api/teams/:id/members',
  },
  // TODO: 서버에 구현 필요
  PRESENTATION: {
    CREATE: '/api/presentations',
    LIST: '/api/presentations',
    GET: '/api/presentations/:id',
    UPDATE: '/api/presentations/:id',
    DELETE: '/api/presentations/:id',
    UPLOAD_VIDEO: '/api/presentations/:id/video',
    GET_ANALYSIS: '/api/presentations/:id/analysis',
  },
  // TODO: 서버에 구현 필요
  TOPIC: {
    CREATE: '/api/topics',
    LIST: '/api/topics',
    GET: '/api/topics/:id',
    UPDATE: '/api/topics/:id',
    DELETE: '/api/topics/:id',
  },
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE: '/api/user/update',
  },
};

export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
}; 