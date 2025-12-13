<template>
  <div class="generate-tasks-container">
    <div class="generate-tasks-shell">
      <div class="generate-tasks-header">
        <div class="header-left">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="title">Generate Practice Tasks</span>
        </div>
        <div class="header-actions">
          <button 
            class="generate-btn" 
            :disabled="isEmpty || isGenerating"
            @click="generatePracticeTasks"
          >
            <span v-if="!isGenerating">🎯 Generate Tasks</span>
            <span v-else>Generating...</span>
          </button>
          <router-link to="/" class="back-btn">← Back to Editor</router-link>
        </div>
      </div>

      <!-- Text input area -->
      <div class="text-input-area">
        <div class="input-label">Your Text</div>
        <textarea
          v-model="inputText"
          class="text-input"
          placeholder="Enter your text here to generate personalized practice tasks..."
          @input="handleTextInput"
        ></textarea>
      </div>

      <!-- Practice tasks results -->
      <div v-if="practiceTasks.length" class="tasks-panel">
        <div class="tasks-header">Personalized Practice Tasks</div>

        <!-- Task list selector -->
        <div class="task-list">
          <button
            v-for="(task, idx) in practiceTasks"
            :key="'task-tab-' + idx"
            class="task-tab"
            :class="{ 'task-tab--active': idx === activeTaskIndex }"
            @click="activeTaskIndex = idx"
          >
            {{ idx + 1 }}. {{ task.title }}
          </button>
        </div>

        <!-- Active task detail and inline practice area -->
        <div v-if="activeTask" class="task-item">
          <div class="task-title">
            {{ activeTask.title }}
            <span class="task-tag">{{ activeTask.dimension }}</span>
          </div>
          <div class="task-target">
            <strong>Target:</strong> {{ activeTask.target_issue }}
          </div>
          <div class="task-exercise">
            <strong>Exercise:</strong> {{ activeTask.exercise }}
          </div>
          <div v-if="activeTask.example" class="task-example">
            <strong>Example:</strong> {{ activeTask.example }}
          </div>

          <div class="task-workspace">
            <div class="task-workspace-label">Your practice for this task</div>
            <textarea
              v-model="taskDraft"
              class="task-textarea"
              placeholder="Write 3–5 sentences here to complete this task..."
            ></textarea>
          </div>
        </div>

        <button @click="clearTasks" class="clear-tasks-btn">Clear</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

interface PracticeTask {
  title: string;
  dimension: "logic" | "vocabulary" | "grammar" | "structure" | string;
  target_issue: string;
  exercise: string;
  example: string;
}

const route = useRoute();
const router = useRouter();

const inputText = ref("");
const practiceTasks = ref<PracticeTask[]>([]);
const activeTaskIndex = ref(0);
const taskDraft = ref("");
const isGenerating = ref(false);

const isEmpty = computed(() => !inputText.value || inputText.value.trim().length === 0);

const activeTask = computed(() => {
  if (!practiceTasks.value.length) return null;
  const idx = Math.min(
    Math.max(activeTaskIndex.value, 0),
    practiceTasks.value.length - 1
  );
  return practiceTasks.value[idx];
});

onMounted(() => {
  // 从路由参数中获取文本
  if (route.query.text && typeof route.query.text === 'string') {
    inputText.value = route.query.text;
    // 如果有文本，自动生成任务
    if (inputText.value.trim().length > 0) {
      generatePracticeTasks();
    }
  }
});

function handleTextInput() {
  // Clear tasks when text changes
  if (practiceTasks.value.length > 0) {
    practiceTasks.value = [];
    activeTaskIndex.value = 0;
    taskDraft.value = "";
  }
}

async function generatePracticeTasks() {
  const text = inputText.value.trim();
  if (!text) {
    alert("Please enter some text before generating tasks.");
    return;
  }

  isGenerating.value = true;
  practiceTasks.value = [];

  try {
    const response = await fetch("http://localhost:8001/generate-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Task generation request failed");
    }

    const data = await response.json();
    practiceTasks.value = (data.tasks || []).slice(0, 3);
    // Select first task by default for inline practice
    if (practiceTasks.value.length > 0) {
      activeTaskIndex.value = 0;
      taskDraft.value = "";
    }
  } catch (error) {
    console.error("Error generating practice tasks:", error);
    practiceTasks.value = [];
    activeTaskIndex.value = 0;
    taskDraft.value = "";
  } finally {
    isGenerating.value = false;
  }
}

function clearTasks() {
  practiceTasks.value = [];
  activeTaskIndex.value = 0;
  taskDraft.value = "";
}
</script>

<style scoped>
.generate-tasks-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.generate-tasks-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.generate-tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
}

.title {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-input-area {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.text-input {
  flex: 1;
  width: 100%;
  min-height: 200px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  color: #111827;
  padding: 12px;
}

.text-input::placeholder {
  color: #9ca3af;
}

.text-input:focus {
  border-color: #1e40af;
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
}

.generate-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #0f766e;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.12s ease;
}

.generate-btn:hover:not(:disabled) {
  background: #115e59;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.12s ease;
}

.back-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.tasks-panel {
  border-top: 1px solid #e5e7eb;
  padding: 20px;
  background: #f9fafb;
  max-height: 50vh;
  overflow-y: auto;
}

.tasks-header {
  font-size: 16px;
  font-weight: 600;
  color: #0f766e;
  margin-bottom: 16px;
}

.task-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.task-tab {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.task-tab:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.task-tab--active {
  background: #0f766e;
  color: #ffffff;
  border-color: #0f766e;
}

.task-item {
  padding: 20px;
  background: #ecfeff;
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #0f766e;
}

.task-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1e40af;
  font-weight: 500;
}

.task-target {
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 8px;
  line-height: 1.6;
}

.task-exercise {
  font-size: 14px;
  color: #111827;
  margin-bottom: 8px;
  line-height: 1.6;
}

.task-example {
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 16px;
  line-height: 1.6;
}

.task-workspace {
  margin-top: 16px;
}

.task-workspace-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.task-textarea {
  width: 100%;
  min-height: 150px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
}

.task-textarea:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
  outline: none;
}

.clear-tasks-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
}

.clear-tasks-btn:hover {
  background: #45a049;
}
</style>

