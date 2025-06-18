export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (error: any, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 10000,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      // Calculate delay with exponential backoff
      const baseDelay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      const actualDelay = Math.min(baseDelay, maxDelayMs);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * actualDelay;
      const finalDelay = actualDelay + jitter;

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
}

// Specific retry function for AI generation with validation
export async function retryAIGeneration<T>(
  generateFn: () => Promise<T>,
  validateFn: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    const result = await generateFn();
    
    if (!validateFn(result)) {
      throw new Error('AI generation validation failed');
    }
    
    return result;
  }, options);
}