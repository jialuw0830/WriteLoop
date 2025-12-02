<template>
  <div class="editor-container">
    <!-- 编辑器外壳 -->
    <div class="editor-shell">
      <!-- 顶部小标签 -->
      <div class="editor-header">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="title">WriteLoop Editor</span>
      </div>

      <!-- 真正的 TipTap 编辑区域 -->
      <div
        class="editor-content"
        :class="{ 'editor-content--empty': isEmpty }"
        @mouseup="onTextSelect"
      >
        <EditorContent :editor="editor" />
      </div>

      <!-- 建议区域：显示 AI 下文预测 -->
      <div v-if="suggestions.length" class="suggestion-panel">
        <div class="suggestion-header">AI suggestions</div>
        <button
          v-for="(s, idx) in suggestions"
          :key="idx"
          class="suggestion-item"
          @click="applySuggestion(s.text)"
        >
          <div class="suggestion-text">{{ s.text }}</div>
          <div class="suggestion-explain">{{ s.explain }}</div>
        </button>
      </div>

      <!-- 句子重写区域 -->
      <div v-if="rewrittenData" class="rewrite-panel">
        <div class="rewrite-header">Rewritten Sentence</div>
        <div class="rewrite-text">{{ rewrittenData.rewritten }}</div>
        <div v-if="rewrittenData.technique" class="rewrite-technique">
          Technique: {{ rewrittenData.technique }}
        </div>
        <div v-if="rewrittenData.explanation" class="rewrite-explain">
          {{ rewrittenData.explanation }}
        </div>
        <button @click="clearRewrittenSentence" class="clear-rewrite-btn">Clear</button>
      </div>
    </div>
  </div>
  <div class="debug-panel" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 8px; font-size: 12px; z-index: 9999;">
    <video ref="videoRef" autoplay playsinline style="width: 1px; height: 1px; opacity: 0; position: absolute;"></video>
    
    <div>System Status: {{ isLoadingModel ? 'Loading Model...' : 'Ready' }}</div>
    <button @click="toggleMonitoring">Start Focus Cam</button>
    
    <div style="margin-top: 5px;">
        <div>EAR (Eyes): {{ ear.toFixed(3) }}</div>
        <div>MAR (Mouth): {{ mar.toFixed(3) }}</div>
        <div v-if="isDrowsy" style="color: red; font-weight: bold;">⚠️ DROWSY! (Sleeping)</div>
        <div v-if="isYawning" style="color: yellow; font-weight: bold;">🥱 YAWNING!</div>
    </div>
</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import { Editor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// --- 1. 引入专注度检测模块 (修复点：新增引入) ---
import { useFaceLandmarks } from '../composables/useFaceLandmarks';
// import { useActivityMonitor } from '../composables/useActivityMonitor'; // 暂时先注释掉，分步调试

// --- 2. 初始化视觉检测 Hook (修复点：新增解构) ---
const { 
  startCamera, 
  stopCamera, // 记得导出停止方法
  ear, 
  mar, 
  isDrowsy, 
  isYawning, 
  isLoadingModel,
  isCameraOpen 
} = useFaceLandmarks();

// 绑定模板中的 <video ref="videoRef">
const videoRef = ref<HTMLVideoElement | null>(null);

// 控制开关
const toggleMonitoring = () => {
    if (isCameraOpen.value) {
        stopCamera();
    } else {
        if (videoRef.value) {
            startCamera(videoRef.value);
        }
    }
};

// --- 下面是你原有的编辑器逻辑，保持不变 ---

// --- 接口定义 ---
interface Suggestion {
  text: string;
  explain: string;
}

interface RewriteResponse {
  rewritten: string;
  technique?: string;
  explanation?: string;
}

// --- 响应式状态 ---
const editor = ref<Editor | null>(null);
const suggestions = ref<Suggestion[]>([]);
const rewrittenData = ref<RewriteResponse | null>(null);
const isEmpty = computed(() => !editor.value || editor.value.isEmpty);

// --- 防抖请求控制 ---
let typingTimer: number | undefined;
let lastSentText = "";

// 发送建议请求（防抖 + 去重）
async function sendSuggestionRequest() {
  if (!editor.value) return;

  const text = editor.value.getText().trim();
  if (text.length < 5 || text === lastSentText) {
    suggestions.value = [];
    return;
  }

  lastSentText = text;

  try {
    const response = await fetch("http://localhost:8000/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, cursor: null }),
    });

    if (!response.ok) {
      suggestions.value = [];
      return;
    }

    const data = await response.json();
    suggestions.value = (data.suggestions || []).slice(0, 3);
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    suggestions.value = [];
  }
}

// 处理编辑器更新（带防抖）
function handleEditorUpdate() {
  if (typingTimer) {
    window.clearTimeout(typingTimer);
  }
  typingTimer = window.setTimeout(sendSuggestionRequest, 600);
}

// 应用建议到光标处
function applySuggestion(text: string) {
  if (!editor.value) return;
  editor.value
    .chain()
    .focus()
    .insertContent(text + " ")
    .run();
  suggestions.value = [];
}

// 句子重写功能
function onTextSelect() {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 3) {
    rewriteSentence(selectedText);
  }
}

async function rewriteSentence(selectedText: string) {
  try {
    const response = await fetch("http://localhost:8000/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: selectedText }),
    });

    if (!response.ok) {
      rewrittenData.value = { rewritten: selectedText };
      return;
    }

    const data = await response.json();
    rewrittenData.value = {
      rewritten: data.rewritten || selectedText,
      technique: data.technique,
      explanation: data.explanation,
    };
  } catch (error) {
    console.error("Error rewriting sentence:", error);
    rewrittenData.value = { rewritten: selectedText };
  }
}

function clearRewrittenSentence() {
  rewrittenData.value = null;
}

// --- 生命周期 ---
onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing in English here...",
      }),
    ],
    content: "",
    onUpdate: handleEditorUpdate,
  });
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
  if (typingTimer) {
    window.clearTimeout(typingTimer);
  }
  // 停止摄像头，防止内存泄漏
  stopCamera();
});
</script>

<style scoped>
/* 保留你原有的所有样式，仅增加 rewrite-technique 和 rewrite-explain */
.editor-container {
  height: 100%;
  width: 100%;
}

.editor-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
}

.title {
  margin-left: 4px;
  font-size: 12px;
  color: #6b7280;
}

.editor-content {
  flex: 1;
  padding: 16px 20px 8px 20px;
  overflow-y: auto;
}

.editor-content--empty :deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: #9ca3af;
}

.editor-content :deep(p) {
  margin: 0 0 8px;
  line-height: 1.6;
  font-size: 16px;
}

.editor-content :deep(strong) {
  font-weight: 600;
}

.editor-content :deep(em) {
  font-style: italic;
}

.suggestion-panel {
  border-top: 1px solid #e5e7eb;
  padding: 8px 10px;
  background: #f9fafb;
}

.suggestion-header {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.suggestion-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
  background: #ffffff;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background 0.12s ease, transform 0.05s ease;
}

.suggestion-item:hover {
  background: #eef2ff;
  transform: translateY(-1px);
}

.suggestion-text {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.suggestion-explain {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.rewrite-panel {
  border-top: 1px solid #e5e7eb;
  padding: 8px 10px;
  background: #f9fafb;
}

.rewrite-header {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.rewrite-text {
  font-size: 14px;
  color: #111827;
  margin-bottom: 6px;
}

.rewrite-technique {
  font-size: 12px;
  color: #4f46e5;
  font-weight: 600;
  margin-bottom: 4px;
}

.rewrite-explain {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.clear-rewrite-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  margin-top: 8px;
  font-size: 12px;
}

.clear-rewrite-btn:hover {
  background: #45a049;
}
</style>