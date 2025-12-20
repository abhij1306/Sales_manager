'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Logs errors for debugging
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console
        console.error('Error caught by boundary:', error, errorInfo);

        // Store error info in state
        this.setState({ errorInfo });

        // TODO: Send to error tracking service (e.g., Sentry)
        // sendErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                        </div>

                        <p className="text-gray-600 mb-4">
                            We encountered an unexpected error. Please try again.
                        </p>

                        {this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                                <p className="text-sm font-mono text-red-800">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mb-4">
                                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                            >
                                Try again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                            >
                                Go home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
