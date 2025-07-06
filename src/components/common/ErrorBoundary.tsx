import { AlertTriangle } from 'lucide-react'
import React, { Component, ReactNode } from 'react'
import { t } from '../../lang/helpers'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// You can also log the error to an error reporting service
		console.error('ErrorBoundary caught an error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="infio-error-boundary">
					<div className="infio-error-boundary-content">
						<AlertTriangle size={24} color="var(--text-error)" />
						<h3>{t('errorBoundary.errorOccurred')}</h3>
						<p>{t('errorBoundary.renderError')}</p>
						{this.state.error && (
							<details className="infio-error-details">
								<summary>{t('errorBoundary.errorDetails')}</summary>
								<pre>{this.state.error.toString()}</pre>
							</details>
						)}
						<button
							onClick={() => this.setState({ hasError: false, error: undefined })}
							className="infio-retry-button"
						>
							{t('errorBoundary.retry')}
						</button>
					</div>

					<style>
						{`
							.infio-error-boundary {
								display: flex;
								align-items: center;
								justify-content: center;
								padding: var(--size-4-4);
								background: var(--background-secondary);
								border: 1px solid var(--background-modifier-border);
								border-radius: var(--radius-s);
								margin: var(--size-2-2);
							}

							.infio-error-boundary-content {
								text-align: center;
								max-width: 400px;
								display: flex;
								flex-direction: column;
								align-items: center;
								gap: var(--size-4-2);
							}

							.infio-error-boundary-content h3 {
								margin: 0;
								color: var(--text-error);
								font-size: var(--font-ui-large);
							}

							.infio-error-boundary-content p {
								margin: 0;
								color: var(--text-normal);
								line-height: var(--line-height-normal);
							}

							.infio-error-details {
								width: 100%;
								margin-top: var(--size-2-2);
							}

							.infio-error-details summary {
								cursor: pointer;
								color: var(--text-muted);
								font-size: var(--font-ui-small);
							}

							.infio-error-details pre {
								background: var(--background-primary-alt);
								padding: var(--size-2-2);
								border-radius: var(--radius-s);
								font-size: var(--font-text-small);
								color: var(--text-error);
								white-space: pre-wrap;
								word-wrap: break-word;
								margin-top: var(--size-2-1);
								max-height: 200px;
								overflow: auto;
							}

							.infio-retry-button {
								background: var(--interactive-accent);
								color: var(--text-on-accent);
								border: none;
								border-radius: var(--radius-s);
								padding: var(--size-2-2) var(--size-4-2);
								font-size: var(--font-ui-medium);
								cursor: pointer;
								transition: background-color 0.15s ease-in-out;
							}

							.infio-retry-button:hover {
								background: var(--interactive-accent-hover);
							}
						`}
					</style>
				</div>
			)
		}

		return this.props.children
	}
}

export default ErrorBoundary 
