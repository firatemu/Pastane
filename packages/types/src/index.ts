export type ApiSuccessResponse<TData, TMeta = undefined> = {
  success: true;
  data: TData;
  meta?: TMeta;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  errors: string[];
};
