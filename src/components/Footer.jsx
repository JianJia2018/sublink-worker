/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

export const Footer = (props) => {
    const currentYear = new Date().getFullYear();
    const { kvAvailable, kvType } = props;
    const kvLabel = kvType || (kvAvailable ? 'Memory' : 'None');
    const kvColor = !kvAvailable
        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800'
        : kvType === 'Memory'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
    const kvIcon = !kvAvailable
        ? 'fa-circle-xmark'
        : kvType === 'Memory'
            ? 'fa-triangle-exclamation'
            : 'fa-circle-check';

    return (
        <footer class="mt-12 py-8 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <div class="container mx-auto px-4">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-600 dark:text-gray-400 text-center md:text-left">
                        <span class="text-sm">© {currentYear} {APP_NAME}. All rights reserved.</span>
                        <span class="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
                        <a
                            href={`${GITHUB_REPO}/releases/tag/v${APP_VERSION}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-mono"
                            title={`View release notes for v${APP_VERSION}`}
                        >
                            v{APP_VERSION}
                        </a>
                        <span class="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
                        <span
                            class={`text-xs px-2 py-0.5 rounded-full border transition-colors font-medium ${kvColor}`}
                            title={kvAvailable
                                ? (kvType === 'Memory'
                                    ? 'KV storage is in-memory — short links will be lost on restart. Configure Upstash Redis or Redis for persistence.'
                                    : `KV storage: ${kvLabel} — persistent`)
                                : 'No KV storage configured — short links and config storage are unavailable.'}
                        >
                            <i class={`fas ${kvIcon} mr-1`}></i>
                            KV: {kvAvailable ? kvLabel : 'Not Configured'}
                        </span>
                    </div>

                    <div class="flex items-center gap-6">
                        <a
                            href={DOCS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                            aria-label="Documentation"
                        >
                            <i class="fas fa-book text-lg"></i>
                        </a>
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github text-lg"></i>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
