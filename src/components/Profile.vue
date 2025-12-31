<template>
  <div class="profile-page">
    <div class="profile-card">
      <div class="profile-header">
        <div class="avatar">{{ initials }}</div>
        <div class="profile-meta">
          <h2 class="profile-name">{{ user?.username }}</h2>
          <p class="profile-sub">用户 ID：{{ user?.id }}</p>
          <p v-if="user?.created_at" class="profile-sub">
            注册时间：{{ formatDate(user.created_at) }}
          </p>
        </div>
      </div>

      <div class="profile-actions">
        <router-link to="/" class="action-button">回到编辑器</router-link>
        <router-link to="/essays" class="action-button ghost">Model Essays</router-link>
        <router-link to="/generate-tasks" class="action-button ghost">练习任务</router-link>
      </div>

      <div class="profile-sections">
        <section class="profile-section">
          <div class="section-header">
            <h3>最近任务</h3>
            <button
              v-if="taskHistory.length"
              class="link-button"
              @click="clearTaskHistory"
            >
              清空
            </button>
          </div>
          <div v-if="taskHistory.length" class="task-history">
            <div v-for="(item, index) in taskHistory" :key="item.created_at + index" class="task-history-item">
              <div class="task-history-meta">
                <span>生成时间：{{ formatDate(item.created_at) }}</span>
                <span v-if="item.source_text">摘要：{{ item.source_text }}...</span>
              </div>
              <ul class="task-history-list">
                <li v-for="task in item.tasks" :key="task.title" class="task-history-task">
                  <strong>{{ task.title }}</strong> · {{ task.dimension }} · {{ task.target_issue }}
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="empty-text">暂无任务记录</p>
        </section>

        <section class="profile-section">
          <div class="section-header">
            <h3>阅读记录</h3>
            <button
              v-if="readingHistoryIds.length"
              class="link-button"
              @click="clearReadingHistory"
            >
              清空
            </button>
          </div>
          <div v-if="readingHistoryIds.length" class="reading-list">
            <router-link
              v-for="item in readingHistory"
              :key="item.id"
              :to="`/essays/${item.id}`"
              class="reading-item"
            >
              <span class="reading-title">{{ item.title || `Essay #${item.id}` }}</span>
              <span class="reading-id">#{{ item.id }}</span>
            </router-link>
          </div>
          <p v-else class="empty-text">暂无阅读记录</p>
        </section>
      </div>

      <div class="profile-status">
        <div class="status-item">
          <span class="status-label">状态</span>
          <span class="status-value">已登录</span>
        </div>
        <div class="status-item">
          <span class="status-label">会话</span>
          <span class="status-value">有效</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useReadingHistory } from '../composables/useReadingHistory';
import { useTaskHistory, TaskHistoryItem } from '../composables/useTaskHistory';
import { getApiUrl, config } from '../config';

const { user, fetchCurrentUser } = useAuth();
const { getReadingHistory, clearHistory } = useReadingHistory();
const { getTaskHistory, clearTaskHistory: clearTaskHistoryStorage } = useTaskHistory();

const taskHistory = ref<TaskHistoryItem[]>([]);
const readingHistoryIds = ref<number[]>([]);
const readingHistory = ref<Array<{ id: number; title?: string }>>([]);

onMounted(async () => {
  await fetchCurrentUser();
  taskHistory.value = getTaskHistory();
  readingHistoryIds.value = getReadingHistory();
  await loadReadingHistory();
});

const initials = computed(() => {
  const name = user.value?.username?.trim();
  return name ? name.slice(0, 1).toUpperCase() : '?';
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

async function loadReadingHistory() {
  if (!readingHistoryIds.value.length) {
    readingHistory.value = [];
    return;
  }
  try {
    const response = await fetch(
      getApiUrl(`${config.api.endpoints.essays}?brief=true&preview_len=0`)
    );
    if (!response.ok) {
      throw new Error('Failed to load essays');
    }
    const data = await response.json();
    const essayMap = new Map(
      (data.essays || []).map((essay: any) => [essay.essay_number, essay.title])
    );
    readingHistory.value = readingHistoryIds.value.map((id) => ({
      id,
      title: essayMap.get(id),
    }));
  } catch (error) {
    console.error('Failed to load reading history', error);
    readingHistory.value = readingHistoryIds.value.map((id) => ({ id }));
  }
}

function clearReadingHistory() {
  clearHistory();
  readingHistoryIds.value = [];
  readingHistory.value = [];
}

function clearTaskHistory() {
  clearTaskHistoryStorage();
  taskHistory.value = [];
}
</script>

<style scoped>
.profile-page {
  height: 100%;
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: linear-gradient(180deg, #f7f8fa 0%, #eef2f7 100%);
}

.profile-card {
  width: 100%;
  max-width: 720px;
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  border: 1px solid #e5e7eb;
}

.profile-header {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name {
  margin: 0;
  font-size: 24px;
  color: #111827;
}

.profile-sub {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.profile-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: #111827;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.2);
}

.action-button.ghost {
  background: #f3f4f6;
  color: #111827;
}

.profile-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.status-item {
  padding: 16px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.status-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.profile-sections {
  display: grid;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-section {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.link-button {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}

.link-button:hover {
  color: #111827;
}

.task-history {
  display: grid;
  gap: 12px;
}

.task-history-item {
  padding: 12px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.task-history-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.task-history-list {
  margin: 0;
  padding-left: 18px;
  color: #111827;
  font-size: 13px;
}

.task-history-task {
  margin-bottom: 6px;
}

.reading-list {
  display: grid;
  gap: 10px;
}

.reading-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  text-decoration: none;
  background: #ffffff;
  color: #111827;
}

.reading-item:hover {
  border-color: #cbd5f5;
  background: #f5f7ff;
}

.reading-title {
  font-size: 14px;
  font-weight: 500;
}

.reading-id {
  font-size: 12px;
  color: #6b7280;
}

.empty-text {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 16px;
  }

  .profile-card {
    padding: 24px;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
