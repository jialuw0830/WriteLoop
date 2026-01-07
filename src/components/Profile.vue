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
        <router-link to="/essays" class="action-button ghost">Essays</router-link>
        <router-link to="/generate-tasks" class="action-button ghost">练习任务</router-link>
      </div>

      <div class="profile-sections">
        <section class="profile-section">
          <div class="section-header">
            <h3>用户画像与练习趋势</h3>
          </div>
          <div class="profile-charts">
            <div class="chart-card">
              <div class="chart-title">用户画像雷达图</div>
              <div v-if="profileData.has_data" class="radar-section">
                <RadarChart
                  :ttr="profileData.ttr"
                  :mlu="profileData.mlu"
                  :logic-score="profileData.logic_score"
                  :size="280"
                />
                <div class="radar-legend">
                  <div class="legend-item">
                    <span class="legend-label">TTR (词汇丰富度):</span>
                    <span class="legend-value">{{ Math.round(profileData.ttr) }}分</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-label">MLU (句法复杂度):</span>
                    <span class="legend-value">{{ Math.round(profileData.mlu) }}分</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-label">Logic Score (逻辑连贯性):</span>
                    <span class="legend-value">{{ Math.round(profileData.logic_score) }}分</span>
                  </div>
                </div>
              </div>
              <p v-else class="empty-text">暂无画像数据，完成一次逻辑分析后即可查看</p>
            </div>

            <div class="chart-card">
              <div class="chart-title">用户练习趋势</div>
              <PracticeTrendChart
                :labels="practiceTrend.labels"
                :values="practiceTrend.values"
                :width="320"
                :height="240"
              />
            </div>
          </div>
        </section>

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
import { useTaskHistory, type TaskHistoryItem } from '../composables/useTaskHistory';
import { getApiUrl, config } from '../config';
import RadarChart from './RadarChart.vue';
import PracticeTrendChart from './PracticeTrendChart.vue';

const { user, fetchCurrentUser, getAuthHeaders } = useAuth();
const { getReadingHistory, clearHistory } = useReadingHistory();
const { getTaskHistory, clearTaskHistory: clearTaskHistoryStorage } = useTaskHistory();

const taskHistory = ref<TaskHistoryItem[]>([]);
const readingHistoryIds = ref<number[]>([]);
const readingHistory = ref<Array<{ id: number; title?: string }>>([]);
const profileData = ref<{
  ttr: number;
  mlu: number;
  logic_score: number;
  profile_data: any;
  has_data: boolean;
  updated_at?: string;
}>({
  ttr: 0,
  mlu: 0,
  logic_score: 0,
  profile_data: {},
  has_data: false
});
const practiceHistory = ref<Array<{
  id: number;
  logic_score: number;
  ttr: number;
  mlu: number;
  created_at: string;
  overall_score: number;
}>>([]);

onMounted(async () => {
  await fetchCurrentUser();
  taskHistory.value = getTaskHistory();
  readingHistoryIds.value = getReadingHistory();
  await loadReadingHistory();
  await loadUserProfile();
  await loadPracticeHistory();
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

function formatDateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

const practiceTrend = computed(() => {
  // 使用真实的练习历史数据，按时间排序
  const history = [...practiceHistory.value].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  // 生成标签（显示日期或序号）
  const labels = history.map((item, index) => {
    // 如果记录较多，显示序号；否则显示日期
    if (history.length > 10) {
      return `#${index + 1}`;
    }
    return formatDateShort(item.created_at);
  });
  
  // 使用综合分数作为折线图的值（也可以改为 logic_score, ttr, mlu）
  const values = history.map((item) => Math.round(item.overall_score || item.logic_score));
  
  return { labels, values };
});

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
      title: essayMap.get(id) as string | undefined,
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

async function loadUserProfile() {
  try {
    const response = await fetch(getApiUrl('/profile'), {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      profileData.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to load user profile', error);
  }
}

async function loadPracticeHistory() {
  try {
    const response = await fetch(getApiUrl('/practice-history'), {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      practiceHistory.value = data.history || [];
    }
  } catch (error) {
    console.error('Failed to load practice history', error);
    practiceHistory.value = [];
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
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
  max-height: calc(100vh - 64px);
  overflow-y: auto;
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

.radar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.radar-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 400px;
}

.profile-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.chart-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.legend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.legend-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.legend-value {
  font-size: 16px;
  color: #6366f1;
  font-weight: 600;
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
