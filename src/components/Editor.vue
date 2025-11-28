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

      <!-- 建议区域：只显示我们自己的英文补全 -->
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
        <div v-if="rewrittenSentence" class="rewrite-panel">
          <div class="rewrite-header">Rewritten Sentence</div>
          <div class="rewrite-text">{{ rewrittenSentence }}</div>
          <button @click="clearRewrittenSentence" class="clear-rewrite-btn">Clear</button>
        </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import { Editor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// --- WebSocket 部分（沿用你后端的接口） ---
interface BackendSuggestion {
  text: string;
  explain: string;
}

const ws = new WebSocket("ws://localhost:8000/ws/suggest");

ws.onopen = () => {
  console.log("[WS] Connected to backend.");
};
ws.onclose = () => {
  console.log("[WS] Disconnected from backend.");
};
ws.onerror = (err) => {
  console.error("[WS] Error:", err);
};

// --- TipTap Editor 实例 ---
const editor = ref<Editor | null>(null);

// 当前建议列表
const suggestions = ref<BackendSuggestion[]>([]);

// 判断编辑器是否为空，用来控制 placeholder 样式
const isEmpty = computed(() => {
  return !editor.value || editor.value.isEmpty;
});

// 当前重写后的句子
const rewrittenSentence = ref<string | null>(null);

// 发送内容到后端（防抖触发）
let typingTimer: number | undefined;

function handleEditorUpdate() {
  if (typingTimer) {
    window.clearTimeout(typingTimer);
  }

  typingTimer = window.setTimeout(() => {
    sendSuggestionRequest();
  }, 600); // 停顿 600ms 再发
}

// 初始化编辑器
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
    onUpdate: () => {
      // 每次内容变化走到这里
      handleEditorUpdate();
    },
  });

  // WebSocket 收到建议
  ws.onmessage = (event: MessageEvent) => {
    console.log("[WS] Got message:", event.data);
    try {
      const data: BackendSuggestion[] = JSON.parse(event.data);
      suggestions.value = data;
    } catch (e) {
      console.error("Failed to parse suggestions:", e);
    }
  };
});

// 把编辑器内容发给后端
function sendSuggestionRequest() {
  if (!editor.value) return;
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn("[WS] Not open, skip suggestion request.");
    return;
  }

  const text = editor.value.getText(); // 纯文本即可
  console.log("[WS] sending text length:", text.length);

  ws.send(
    JSON.stringify({
      text,
      cursor: null, // TipTap 先不传光标信息，后面需要再加
    })
  );
}

// 点击某个建议时，把这个短语插入光标处
function applySuggestion(text: string) {
  if (!editor.value) return;

  editor.value
    .chain()
    .focus()
    .insertContent(text + " ")
    .run();

  // 用完建议可以清空，或者保留，看你产品设计
  // suggestions.value = [];
}

// 监听文本选择（用户选中内容）
function onTextSelect() {
  const selectedText = window.getSelection()?.toString();
  if (selectedText) {
    rewriteSentence(selectedText);
  }
}

function rewriteSentence(selectedText: string) {
  fetch("http://localhost:8000/rewrite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sentence: selectedText,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // 查看返回的数据，确保数据正确
      rewrittenSentence.value = data.rewritten; // 确保这个字段是你想显示的
    })
    .catch((error) => {
      console.error("Error rewriting sentence:", error);
    });
}


// 清空重写句子
function clearRewrittenSentence() {
  rewrittenSentence.value = null;
}

// 销毁时释放资源
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
});
</script>

<style scoped>
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

/* 顶部小条，类似一个文稿窗口 */
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

/* 编辑内容区域 */
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

/* TipTap 基础样式 */
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

/* 建议面板 */
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
}

.suggestion-explain {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* 重写句子面板 */
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
}

.clear-rewrite-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  margin-top: 8px;
}

.clear-rewrite-btn:hover {
  background: #45a049;
}
</style>
