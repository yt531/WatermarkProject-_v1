/**
 * 常用的 HTTP 狀態碼列舉
 */
export enum HttpStatusCode {
  // 成功狀態 (2xx)
  OK = 200,
  Created = 201,
  NoContent = 204,

  // 重新導向 (3xx)
  MovedPermanently = 301,
  NotModified = 304,

  // 用戶端錯誤 (4xx)
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,

  // 伺服器錯誤 (5xx)
  InternalServerError = 500
}

/**
 * HTTP 狀態碼對應的描述訊息
 */
export const HttpStatusCodeMessage: Record<HttpStatusCode, string> = {
  [HttpStatusCode.OK]: 'OK (請求成功)',
  [HttpStatusCode.Created]: 'Created (已建立)',
  [HttpStatusCode.NoContent]: 'No Content (無內容)',
  [HttpStatusCode.MovedPermanently]: 'Moved Permanently (永久移動)',
  [HttpStatusCode.NotModified]: 'Not Modified (未修改)',
  [HttpStatusCode.BadRequest]: 'Bad Request (錯誤的請求)',
  [HttpStatusCode.Unauthorized]: 'Unauthorized (未授權)',
  [HttpStatusCode.Forbidden]: 'Forbidden (拒絕存取)',
  [HttpStatusCode.NotFound]: 'Not Found (找不到資源)',
  [HttpStatusCode.InternalServerError]: 'Internal Server Error (伺服器內部錯誤)'
};
