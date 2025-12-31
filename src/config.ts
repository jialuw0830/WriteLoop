/**
 * Application configuration
 * Reads from environment variables with fallback values
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const config = {
  api: {
    baseURL: API_BASE_URL,
    endpoints: {
      suggest: '/suggest',
      rewrite: '/rewrite',
      analyzeLogic: '/analyze-logic',
      generateTasks: '/generate-tasks',
      essays: '/essays',
      login: '/login',
      register: '/register',
      me: '/me',
    },
  },
} as const;

/**
 * Helper function to build full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${config.api.baseURL}${endpoint}`;
}

