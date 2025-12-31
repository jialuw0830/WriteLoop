/**
 * Composable for managing reading history
 */

const READING_HISTORY_KEY = 'ielts_reading_history';

export function useReadingHistory() {
  const getReadingHistory = (): number[] => {
    try {
      const stored = localStorage.getItem(READING_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const addToHistory = (essayId: number): void => {
    const history = getReadingHistory();
    if (!history.includes(essayId)) {
      history.push(essayId);
      localStorage.setItem(READING_HISTORY_KEY, JSON.stringify(history));
    }
  };

  const clearHistory = (): void => {
    localStorage.removeItem(READING_HISTORY_KEY);
  };

  const hasRead = (essayId: number): boolean => {
    return getReadingHistory().includes(essayId);
  };

  return {
    getReadingHistory,
    addToHistory,
    clearHistory,
    hasRead,
  };
}

