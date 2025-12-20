/**
 * API Client with Monitoring
 * Tracks all API requests for debugging and performance monitoring
 */

interface RequestLog {
    method: string;
    url: string;
    timestamp: string;
    duration?: number;
    status?: number;
    error?: string;
    requestId?: string;
}

class APIMonitor {
    private logs: RequestLog[] = [];
    private maxLogs = 100;
    private errorCount = 0;
    private successCount = 0;

    logRequest(log: RequestLog) {
        this.logs.push(log);

        // Track success/error counts
        if (log.error || (log.status && log.status >= 400)) {
            this.errorCount++;
        } else if (log.status && log.status < 400) {
            this.successCount++;
        }

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const emoji = log.error ? '❌' : log.status && log.status >= 400 ? '⚠️' : '✅';
            console.log(
                `[API ${emoji}]`,
                log.method,
                log.url,
                log.duration ? `${log.duration.toFixed(0)}ms` : '',
                log.status ? `HTTP ${log.status}` : '',
                log.error || ''
            );
        }
    }

    getLogs(): RequestLog[] {
        return [...this.logs];
    }

    getRecentErrors(count: number = 10): RequestLog[] {
        return this.logs
            .filter(log => log.error || (log.status && log.status >= 400))
            .slice(-count);
    }

    getErrorRate(): number {
        const total = this.errorCount + this.successCount;
        if (total === 0) return 0;
        return this.errorCount / total;
    }

    getStats() {
        const recentLogs = this.logs.slice(-20);
        const avgDuration = recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / recentLogs.length;

        return {
            totalRequests: this.logs.length,
            successCount: this.successCount,
            errorCount: this.errorCount,
            errorRate: this.getErrorRate(),
            avgDuration: Math.round(avgDuration),
            recentErrors: this.getRecentErrors(5)
        };
    }

    clear() {
        this.logs = [];
        this.errorCount = 0;
        this.successCount = 0;
    }
}

export const apiMonitor = new APIMonitor();

/**
 * Monitored fetch wrapper
 * Automatically logs all requests with timing and status
 */
export async function monitoredFetch(url: string, options?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const log: RequestLog = {
        method: options?.method || 'GET',
        url,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(url, options);
        log.duration = performance.now() - startTime;
        log.status = response.status;
        log.requestId = response.headers.get('X-Request-ID') || undefined;

        if (!response.ok) {
            log.error = `HTTP ${response.status}: ${response.statusText}`;
        }

        apiMonitor.logRequest(log);
        return response;

    } catch (error) {
        log.duration = performance.now() - startTime;
        log.error = error instanceof Error ? error.message : 'Unknown error';
        apiMonitor.logRequest(log);
        throw error;
    }
}

/**
 * Get API monitoring stats
 * Useful for debugging and performance analysis
 */
export function getAPIStats() {
    return apiMonitor.getStats();
}

/**
 * Clear API monitoring logs
 */
export function clearAPILogs() {
    apiMonitor.clear();
}
