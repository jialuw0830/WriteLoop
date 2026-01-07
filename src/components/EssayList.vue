<template>
  <div class="essay-list-container">
    <div class="essay-list-shell">
      <div class="essay-list-header">
        <div class="header-left">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="title">IELTS Essays</span>
        </div>
        <div class="header-actions">
          <button 
            class="refresh-btn" 
            @click="loadEssays"
            :disabled="isLoading"
          >
            {{ isLoading ? 'Loading...' : '🔄 Refresh' }}
          </button>
          <router-link to="/" class="back-btn">← Back to Editor</router-link>
        </div>
      </div>

      <!-- All essays section -->
      <div class="essays-section">
        <div class="section-title">
          All IELTS Essays
          <span class="essay-count">({{ essays.length }})</span>
        </div>
        <div class="essay-grid">
          <div
            v-for="essay in paginatedEssays"
            :key="essay.essay_number"
            class="essay-card"
            :class="{ 'essay-card--read': hasRead(essay.essay_number) }"
            @click="goToEssay(essay.essay_number)"
          >
            <div class="essay-card-header">
              <span class="essay-number">#{{ essay.essay_number }}</span>
              <span class="essay-word-count">{{ essay.word_count_actual }} words</span>
            </div>
            <div class="essay-title">{{ essay.title }}</div>
            <div class="essay-question-preview">{{ truncateText(essay.question, 100) }}</div>
            <div class="essay-card-footer">
              <span class="read-badge" v-if="hasRead(essay.essay_number)">✓ Read</span>
            </div>
          </div>
        </div>
        
        <!-- Pagination -->
        <div class="pagination" v-if="totalPages > 1">
          <button 
            class="pagination-btn"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            ← Previous
          </button>
          <span class="pagination-info">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button 
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getApiUrl, config } from '../config';
import { useReadingHistory } from '../composables/useReadingHistory';

interface Essay {
  essay_number: number;
  title: string;
  question: string;
  word_count_actual: number;
  body_text: string;
}

const router = useRouter();
const { getReadingHistory, hasRead } = useReadingHistory();

const essays = ref<Essay[]>([]);
const isLoading = ref(false);
const readingHistory = ref<number[]>([]);
const currentPage = ref(1);
const itemsPerPage = 9;

// Computed properties for pagination
const totalPages = computed(() => {
  return Math.ceil(essays.value.length / itemsPerPage);
});

const paginatedEssays = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return essays.value.slice(start, end);
});

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const loadEssays = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(getApiUrl(config.api.endpoints.essays));
    if (!response.ok) throw new Error('Failed to load essays');
    const data = await response.json();
    essays.value = data.essays || [];
    currentPage.value = 1; // Reset to first page when loading
  } catch (error) {
    console.error('Error loading essays:', error);
    alert('Failed to load essays. Please try again.');
  } finally {
    isLoading.value = false;
  }
};

const goToEssay = (essayId: number) => {
  router.push(`/essays/${essayId}`);
};

onMounted(() => {
  readingHistory.value = getReadingHistory();
  loadEssays();
});
</script>

<style scoped>
.essay-list-container {
  min-height: 100vh;
  background: #ffffff;
  padding: 20px;
  overflow-y: auto;
}

.essay-list-shell {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.essay-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #dee2e6;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #212529;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn,
.back-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.refresh-btn {
  background: #6c757d;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background: #5a6268;
}

.back-btn {
  background: #007bff;
  color: white;
}

.back-btn:hover {
  background: #0056b3;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.essays-section {
  padding: 30px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.essay-count {
  font-size: 16px;
  font-weight: 400;
  color: #6c757d;
}

.essay-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .essay-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .essay-grid {
    grid-template-columns: 1fr;
  }
}

.essay-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.essay-card:hover {
  border-color: #007bff;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.essay-card--read {
  background: #f8f9fa;
  border-color: #28a745;
}

.essay-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.essay-number {
  font-weight: 600;
  color: #007bff;
  font-size: 14px;
}

.essay-word-count {
  font-size: 12px;
  color: #6c757d;
}

.essay-title {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 10px;
  line-height: 1.4;
}

.essay-question-preview {
  font-size: 14px;
  color: #6c757d;
  line-height: 1.5;
  margin-bottom: 12px;
}

.essay-card-footer {
  display: flex;
  justify-content: flex-end;
}

.read-badge {
  background: #28a745;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #e9ecef;
}

.pagination-btn {
  padding: 10px 20px;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #dee2e6;
  color: #6c757d;
}

.pagination-info {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}
</style>

