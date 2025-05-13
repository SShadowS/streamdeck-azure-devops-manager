/**
 * API Error Handling
 * 
 * This file contains error types and classes for API request handling.
 */

/**
 * API error types
 */
export enum ApiErrorType {
  Network = 'network',
  Authentication = 'authentication',
  RateLimit = 'rateLimit',
  NotFound = 'notFound',
  ServerError = 'serverError',
  Unknown = 'unknown'
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  public type: ApiErrorType;
  public statusCode?: number;
  public retryable: boolean;

  public constructor(message: string, type: ApiErrorType, statusCode?: number, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}
