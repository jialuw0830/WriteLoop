/**
 * Composable for managing practice task history
 */

export interface TaskHistoryItem {
  created_at: string;
  tasks: Array<{
    title: string;
    dimension: string;
    target_issue: string;
    exercise: string;
    example?: string;
  }>;
  source_text: string;
}

const TASK_HISTORY_KEY = 'writeloop_task_history';
const MAX_HISTORY = 5;

export function useTaskHistory() {
  const getTaskHistory = (): TaskHistoryItem[] => {
    try {
      const stored = localStorage.getItem(TASK_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const addTaskHistory = (item: TaskHistoryItem): void => {
    const history = getTaskHistory();
    history.unshift(item);
    const trimmed = history.slice(0, MAX_HISTORY);
    localStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(trimmed));
  };

  const clearTaskHistory = (): void => {
    localStorage.removeItem(TASK_HISTORY_KEY);
  };

  return {
    getTaskHistory,
    addTaskHistory,
    clearTaskHistory,
  };
}
