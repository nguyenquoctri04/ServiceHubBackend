import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: any, context?: string) {
    this.printLog('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printLog('ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printLog('WARN', message, context);
  }

  debug?(message: any, context?: string) {
    this.printLog('DEBUG', message, context);
  }

  verbose?(message: any, context?: string) {
    this.printLog('VERBOSE', message, context);
  }

  private printLog(level: string, message: any, context?: string, trace?: string) {
    // In a real app, this would be a JSON.stringify() to stdout for Datadog/ELK
    // And it would extract Correlation ID from AsyncLocalStorage
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [${context || 'Application'}] ${message}`);
    if (trace) {
      console.error(trace);
    }
  }
}
