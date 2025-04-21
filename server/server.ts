import errorLogger from './errorLogger';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorLogger.log(error, 'uncaught_exception');
  console.error('UNCAUGHT EXCEPTION! 💥');
  console.error(error);
  
  // Don't immediately exit in production, but do in development
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  errorLogger.log(reason, 'unhandled_rejection', { promise: String(promise) });
  console.error('UNHANDLED REJECTION! 💥');
  console.error(reason);
  
  // Don't immediately exit in production, but do in development
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
}); 