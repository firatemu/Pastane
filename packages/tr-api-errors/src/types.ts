export type ApiErrorShape = {
  code?: string;
  message?: string;
  details?: unknown;
};

export type ApiAudience = 'customer' | 'admin' | 'courier';

export type ParsedApiPayload = {
  success?: boolean;
  data?: unknown;
  message?: string;
  error?: ApiErrorShape;
};
