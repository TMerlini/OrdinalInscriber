import fs from 'fs';
import path from 'path';
import os from 'os';

interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  endpoint?: string;
  requestData?: any;
  responseStatus?: number;
}

class ErrorLogger {
  private logDir: string;
  private logFile: string;
  private errorLogs: ErrorLog[] = [];
  private maxLogsInMemory: number = 100;

  constructor() {
    // Create logs directory in the user's temp directory
    this.logDir = path.join(os.tmpdir(), 'ordinal-inscriber-logs');
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create a log file with timestamp
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logDir, `server-errors-${date}.log`);
    
    console.log(`Error logs will be stored at: ${this.logFile}`);
  }
  
  private formatError(error: Error | string, type: string = 'server_error', additionalInfo: any = {}): ErrorLog {
    const errorObj: ErrorLog = {
      timestamp: new Date().toISOString(),
      type,
      message: error instanceof Error ? error.message : error,
      ...additionalInfo
    };
    
    if (error instanceof Error && error.stack) {
      errorObj.stack = error.stack;
    }
    
    return errorObj;
  }
  
  public log(error: Error | string, type: string = 'server_error', additionalInfo: any = {}) {
    const errorObj = this.formatError(error, type, additionalInfo);
    
    // Store in memory
    this.errorLogs.push(errorObj);
    
    // Trim if we have too many logs in memory
    if (this.errorLogs.length > this.maxLogsInMemory) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogsInMemory);
    }
    
    // Write to file
    try {
      fs.appendFileSync(
        this.logFile, 
        JSON.stringify(errorObj) + '\n',
        'utf8'
      );
    } catch (err) {
      console.error('Failed to write to error log file:', err);
    }
    
    // Also log to console
    console.error(`[${type.toUpperCase()}] ${errorObj.message}`);
    if (errorObj.stack) {
      console.error(errorObj.stack);
    }
    
    return errorObj;
  }
  
  public logApiError(error: Error | string, req: any, res: any) {
    return this.log(error, 'api_error', {
      endpoint: `${req.method} ${req.originalUrl || req.url}`,
      requestData: {
        params: req.params,
        query: req.query,
        body: this.sanitizeRequestBody(req.body)
      },
      responseStatus: res.statusCode
    });
  }
  
  private sanitizeRequestBody(body: any) {
    if (!body) return null;
    
    // Create a copy to avoid modifying the original
    const sanitized = { ...body };
    
    // Redact any sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'private'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  public getRecentLogs(limit: number = 20): ErrorLog[] {
    return this.errorLogs.slice(-limit);
  }
  
  public getLogFilePath(): string {
    return this.logFile;
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();
export default errorLogger; 