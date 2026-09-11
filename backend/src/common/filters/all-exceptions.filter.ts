import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Manejo centralizado de errores: toda excepcion (HTTP o no) sale con el mismo shape JSON,
 * para que el frontend siempre pueda parsear { statusCode, message, error, path, timestamp }.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message =
      isHttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? ((exceptionResponse as any).message ?? exception.message)
        : isHttpException
          ? exception.message
          : 'Error interno del servidor';

    if (!isHttpException) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: isHttpException ? exception.constructor.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
