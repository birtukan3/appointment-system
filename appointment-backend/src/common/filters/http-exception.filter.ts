import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle TypeORM QueryFailedError (duplicate key, etc.)
    if (exception instanceof QueryFailedError) {
      status = HttpStatus.CONFLICT;
      message = this.getQueryFailedErrorMessage(exception);
      this.logger.warn(`QueryFailedError: ${message}`);
    }
    // Handle HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || message;
    }
    // Handle generic Error
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error (don't log 404 errors as they're common)
    if (status !== HttpStatus.NOT_FOUND && status !== HttpStatus.CONFLICT) {
      this.logger.error(`${request.method} ${request.url} - ${status}: ${message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getQueryFailedErrorMessage(error: QueryFailedError): string {
    // PostgreSQL duplicate key violation
    if (error.message?.includes('duplicate key value violates unique constraint')) {
      if (error.message?.includes('UQ_97672ac88f789774dd47f7c8be3')) {
        return 'Email already registered. Please use a different email or login.';
      }
      return 'A record with this value already exists.';
    }

    // PostgreSQL foreign key violation
    if (error.message?.includes('violates foreign key constraint')) {
      return 'Referenced record does not exist.';
    }

    // PostgreSQL not null violation
    if (error.message?.includes('violates not-null constraint')) {
      return 'Required field is missing.';
    }

    return 'Database error occurred. Please try again.';
  }
}