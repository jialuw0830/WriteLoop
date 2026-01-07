<template>
  <div class="editor-container">
    <!-- Editor shell -->
    <div class="editor-shell">
      <!-- Header with title and Analyze button -->
      <div class="editor-header">
        <div class="header-left">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="title">WriteLoop Editor</span>
        </div>

        <button class="analyze-btn" :disabled="isEmpty || isAnalyzing" @click="analyzeLogic">
          <span v-if="!isAnalyzing">🔍 Analyze Logic</span>
          <span v-else>Analyzing...</span>
        </button>
      </div>

      <!-- SINGLE hidden video (IMPORTANT: keep only one ref="videoRef") -->
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        style="position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px;"
      ></video>

      <div class="focus-status-bar" :class="{ 'status-warning': focusStatus !== 'Focused' }">
        <div class="status-left">
          <span class="status-dot" :class="focusStatusColor"></span>
          <span class="status-text">Status: {{ focusStatus }}</span>
        </div>

        <div class="status-right">
          <button @click="toggleMonitoring" class="toggle-btn">
            {{ isCameraOpen ? "Stop Focus Cam" : "Start Focus Cam" }}
          </button>
          <span v-if="isCameraOpen" class="debug-info">
            EAR: {{ (ear ?? 0).toFixed(2) }} | MAR: {{ (mar ?? 0).toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- Main TipTap editor area -->
      <div class="editor-content" :class="{ 'editor-content--empty': isEmpty }" @mouseup="onTextSelect">
        <EditorContent v-if="editor" :editor="editor" />
      </div>

      <!-- Suggestion area: AI next-phrase suggestions -->
      <div v-if="suggestions.length && !logicAnalysis" class="suggestion-panel">
        <div class="suggestion-header">
          <span>AI suggestions</span>
          <button @click="clearSuggestions" class="close-suggestion-btn">×</button>
        </div>

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

      <!-- Sentence rewrite area -->
      <div v-if="rewrittenData && !logicAnalysis" class="rewrite-panel">
        <div class="rewrite-header">Rewritten Sentence</div>
        <div class="rewrite-text">{{ rewrittenData.rewritten }}</div>

        <div v-if="rewrittenData.technique" class="rewrite-technique">
          Technique: {{ rewrittenData.technique }}
        </div>

        <div v-if="rewrittenData.explanation" class="rewrite-explain">
          {{ rewrittenData.explanation }}
        </div>

        <div class="rewrite-actions">
          <button @click="applyRewrittenSentence" class="apply-rewrite-btn">Apply</button>
          <button @click="clearRewrittenSentence" class="clear-rewrite-btn">Clear</button>
        </div>
      </div>

      <!-- Logic analysis area -->
      <div v-if="logicAnalysis || showLogicTree" class="logic-panel">
        <div class="logic-tabs">
          <button
            class="logic-tab"
            :class="{ active: !showLogicTree }"
            @click="showLogicTree = false"
          >
            Logic Analysis
          </button>
          <button
            class="logic-tab"
            :class="{ active: showLogicTree }"
            @click="showLogicTree = true"
          >
            逻辑树
          </button>
        </div>

        <!-- Logic Analysis View -->
        <div v-if="!showLogicTree" class="logic-content">
          <div v-if="!logicAnalysis" class="empty-logic-state">
            点击 "Analyze Logic" 按钮来分析文本逻辑
          </div>
          <div v-else>

        <div v-if="logicAnalysis.overall_score !== undefined" class="logic-score-section">
          <div class="logic-score-label">Score</div>
          <div class="logic-score-value" :class="getScoreClass(logicAnalysis.overall_score)">
            {{ logicAnalysis.overall_score }}
          </div>
        </div>

        <div v-if="logicAnalysis.issues && logicAnalysis.issues.length > 0" class="logic-issues">
          <div v-for="(issue, idx) in logicAnalysis.issues" :key="idx" class="logic-issue-item">
            <div class="logic-issue-type">{{ issue.type }}</div>

            <div class="logic-issue-location" v-if="issue.location">
              <span class="location-label">位置：</span>{{ issue.location }}
            </div>

            <div class="logic-issue-desc">{{ issue.description }}</div>

            <div v-if="issue.example_from_ielts" class="logic-issue-example">
              <div class="example-label">📚 真题示例：</div>
              <div class="example-content">{{ issue.example_from_ielts }}</div>
            </div>

            <div class="logic-issue-severity" :class="`severity-${issue.severity}`">
              <span class="severity-label">严重程度：</span>
              {{
                issue.severity === "high" ? "高" : issue.severity === "medium" ? "中" : "低"
              }}
            </div>
          </div>
        </div>

        <div v-if="logicAnalysis.summary" class="logic-summary">
          {{ logicAnalysis.summary }}
        </div>

        <button class="generate-task-btn" @click="generatePracticeTasks">🎯 Generate Practice Tasks</button>

        <button @click="clearLogicAnalysis" class="clear-logic-btn">Clear</button>
          </div>
        </div>

        <!-- Logic Tree View -->
        <div v-if="showLogicTree" class="logic-content">
          <LogicTree :text="editor ? editor.getText() : ''" />
        </div>
      </div>
    </div>
  </div>

  <!-- Debug Panel (NO duplicate videoRef!) -->
  <div
    class="debug-panel"
    style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 8px; font-size: 12px; z-index: 9999;"
  >
    <div>System Status: {{ isLoadingModel ? "Loading Model..." : "Ready" }}</div>

    <button @click="toggleMonitoring">
      {{ isCameraOpen ? "Stop Focus Cam" : "Start Focus Cam" }}
    </button>

    <div style="margin-top: 5px;">
      <div>EAR (Eyes): {{ (ear ?? 0).toFixed(3) }}</div>
      <div>MAR (Mouth): {{ (mar ?? 0).toFixed(3) }}</div>
      <div v-if="isDrowsy" style="color: red; font-weight: bold;">⚠️ DROWSY! (Sleeping)</div>
      <div v-if="isYawning" style="color: yellow; font-weight: bold;">🥱 YAWNING!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, computed } from "vue";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useRouter } from "vue-router";

import { useFaceLandmarks } from "../composables/useFaceLandmarks";
import { useActivityMonitor } from "../composables/useActivityMonitor";
import { getApiUrl, config } from "../config";
import { useReadingHistory } from "../composables/useReadingHistory";
import { useAuth } from "../composables/useAuth";
import {
  LogicBreaksExtension,
  buildLogicBreakDecorations,
  logicBreaksKey,
} from "../extensions/logicBreaks";
import LogicTree from "./LogicTree.vue";

// keep-alive name
defineOptions({ name: "Editor" });

// --- Face / camera ---
const { startCamera, stopCamera, ear, mar, isDrowsy, isYawning, isLoadingModel, isCameraOpen } =
  useFaceLandmarks();

const videoRef = ref<HTMLVideoElement | null>(null);
const router = useRouter();
const { getAuthHeaders } = useAuth();

// Activity / focus monitoring
const { isTabHidden, isIdle } = useActivityMonitor();

const focusStatus = computed(() => {
  if (isTabHidden.value) return "Distracted (Tab Hidden)";
  if (isIdle.value) return "Idle (No Activity)";

  if (isCameraOpen.value) {
    if (isDrowsy.value) return "Fatigued (Drowsy)";
    if (isYawning.value) return "Fatigued (Yawning)";
  }
  return "Focused";
});

const focusStatusColor = computed(() => {
  switch (focusStatus.value) {
    case "Focused":
      return "bg-green-500";
    case "Fatigued (Drowsy)":
    case "Fatigued (Yawning)":
      return "bg-red-500";
    default:
      return "bg-yellow-500";
  }
});

const toggleMonitoring = () => {
  if (isCameraOpen.value) {
    stopCamera();
    return;
  }
  const videoEl = videoRef.value;
  if (videoEl) startCamera(videoEl);
};

// --- Types ---
interface Suggestion {
  text: string;
  explain: string;
}

interface RewriteResponse {
  rewritten: string;
  technique?: string;
  explanation?: string;
}

interface LogicIssue {
  type: string;
  location: string;
  description: string;
  severity: "high" | "medium" | "low";
  example_from_ielts?: string;
}

interface WritingProfile {
  logic_level?: string;
  logic_weak_points?: string[];
  vocabulary_level?: string;
  vocabulary_weak_points?: string[];
  grammar_level?: string;
  grammar_weak_points?: string[];
  structure_level?: string;
  structure_weak_points?: string[];
}

interface LogicAnalysisResponse {
  overall_score?: number;
  issues?: LogicIssue[];
  summary?: string;
  error?: string;
  profile?: WritingProfile;
}

// --- Reading history for RAG enhancement ---
const { getReadingHistory } = useReadingHistory();

// --- Reactive state ---
const suggestions = ref<Suggestion[]>([]);
const rewrittenData = ref<RewriteResponse | null>(null);
const logicAnalysis = ref<LogicAnalysisResponse | null>(null);
const isAnalyzing = ref(false);
const showLogicTree = ref(false);

// --- Debounce control for suggestion requests ---
let typingTimer: number | undefined;
let lastSentText = "";
let logicBreakTimer: number | undefined;
let lastBreaksText = "";
let breaksController: AbortController | null = null;

// Handle editor update with debounce
function handleEditorUpdate() {
  if (typingTimer) window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(sendSuggestionRequest, 600);

  if (logicBreakTimer) window.clearTimeout(logicBreakTimer);
  logicBreakTimer = window.setTimeout(sendLogicBreakAnalysis, 2000);
}

// IMPORTANT: create editor at top-level (stable)
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing in English here...",
    }),
    LogicBreaksExtension,
  ],
  content: "",
  onUpdate: handleEditorUpdate,
});

const isEmpty = computed(() => !editor.value || editor.value.isEmpty);

// Send suggestion request (debounced + avoid duplicates)
async function sendSuggestionRequest() {
  if (!editor.value) return;

  const text = editor.value.getText().trim();
  if (text.length < 5 || text === lastSentText) {
    suggestions.value = [];
    return;
  }

  lastSentText = text;

  try {
    const readEssayIds = getReadingHistory();

    const response = await fetch(getApiUrl(config.api.endpoints.suggest), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        cursor: null,
        read_essay_ids: readEssayIds.length > 0 ? readEssayIds : null,
      }),
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

// Apply suggestion at cursor
function applySuggestion(text: string) {
  if (!editor.value) return;
  editor.value.chain().focus().insertContent(text + " ").run();
  suggestions.value = [];
}

function clearSuggestions() {
  suggestions.value = [];
}

function splitSentencesWithOffsets(text: string) {
  const results: Array<{ text: string; start: number; end: number }> = [];
  const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
  for (const match of text.matchAll(regex)) {
    const raw = match[0];
    if (!raw) continue;
    const leading = raw.search(/\S|$/);
    const trimmed = raw.trimEnd();
    const trailing = raw.length - trimmed.length;
    const start = (match.index ?? 0) + leading;
    const end = (match.index ?? 0) + raw.length - trailing;
    const sentence = raw.trim();
    if (sentence.length) {
      results.push({ text: sentence, start, end });
    }
  }
  return results;
}

function getSentenceRangesFromDoc() {
  if (!editor.value) return [];
  const ranges: Array<{ from: number; to: number; text: string }> = [];

  editor.value.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node.textContent || "";
    if (!text.trim()) return;

    const sentences = splitSentencesWithOffsets(text);
    sentences.forEach((sentence) => {
      const from = pos + 1 + sentence.start;
      const to = pos + 1 + sentence.end;
      if (from < to) {
        ranges.push({ from, to, text: sentence.text });
      }
    });
  });

  return ranges;
}

function updateLogicBreakDecorations(
  ranges: Array<{ from: number; to: number; reason?: string }>
) {
  if (!editor.value) return;
  const decorations = buildLogicBreakDecorations(editor.value.state.doc, ranges);
  const tr = editor.value.state.tr.setMeta(logicBreaksKey, decorations);
  editor.value.view.dispatch(tr);
}

async function sendLogicBreakAnalysis() {
  if (!editor.value) return;
  const text = editor.value.getText().trim();
  if (text.length < 30 || text === lastBreaksText) {
    updateLogicBreakDecorations([]);
    return;
  }

  const sentenceRanges = getSentenceRangesFromDoc();
  if (sentenceRanges.length < 2) {
    updateLogicBreakDecorations([]);
    return;
  }

  lastBreaksText = text;

  if (breaksController) {
    breaksController.abort();
  }
  breaksController = new AbortController();

  try {
    const response = await fetch(getApiUrl(config.api.endpoints.analyzeBreaks), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ sentences: sentenceRanges.map((s) => s.text) }),
      signal: breaksController.signal,
    });

    if (!response.ok) {
      updateLogicBreakDecorations([]);
      return;
    }

    const data = await response.json();
    const breaks = Array.isArray(data.breaks) ? data.breaks : [];
    const ranges = breaks
      .map((item: { index?: number; reason?: string }) => {
        const idx = item.index ?? -1;
        if (idx < 0 || idx >= sentenceRanges.length) return null;
        const range = sentenceRanges[idx];
        if (!range) return null;
        return {
          from: range.from,
          to: range.to,
          reason: item.reason,
        };
      })
      .filter(Boolean) as Array<{ from: number; to: number; reason?: string }>;

    updateLogicBreakDecorations(ranges);
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.error("Failed to analyze logic breaks:", error);
    }
  }
}

// Sentence rewrite feature
function onTextSelect() {
  if (!editor.value) return;

  const { from, to } = editor.value.state.selection;
  if (from === to) return;

  const selectedText = editor.value.state.doc.textBetween(from, to, " ").trim();
  if (selectedText.length > 3) {
    rewriteSentence(selectedText);
  }
}

async function rewriteSentence(selectedText: string) {
  try {
    const response = await fetch(getApiUrl(config.api.endpoints.rewrite), {
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

function applyRewrittenSentence() {
  if (!editor.value || !rewrittenData.value) return;

  const { from, to } = editor.value.state.selection;
  const hasSelection = from !== to;

  if (hasSelection) {
    editor.value.chain().focus().deleteSelection().insertContent(rewrittenData.value.rewritten).run();
  } else {
    editor.value.chain().focus().insertContent(rewrittenData.value.rewritten + " ").run();
  }

  rewrittenData.value = null;
}

function clearRewrittenSentence() {
  rewrittenData.value = null;
}

// Logic analysis feature
async function analyzeLogic() {
  if (!editor.value || isEmpty.value) return;

  const text = editor.value.getText().trim();
  if (text.length < 20) {
    alert("Please enter at least 20 characters before analysis.");
    return;
  }

  isAnalyzing.value = true;
  logicAnalysis.value = null;

  try {
    const response = await fetch(getApiUrl(config.api.endpoints.analyzeLogic), {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("Analysis request failed");

      const data = await response.json();
      logicAnalysis.value = data;
      // 自动切换到 Logic Analysis 视图
      showLogicTree.value = false;
  } catch (error) {
    console.error("Error analyzing logic:", error);
    logicAnalysis.value = {
      error: "Analysis failed, please try again.",
      issues: [],
    };
  } finally {
    isAnalyzing.value = false;
  }
}

// Manually generate practice tasks
async function generatePracticeTasks() {
  if (!editor.value) return;
  const text = editor.value.getText().trim();

  router.push({
    path: "/generate-tasks",
    query: { text },
  });
}

function clearLogicAnalysis() {
  logicAnalysis.value = null;
  showLogicTree.value = false;
}

function getScoreClass(score: number): string {
  if (score >= 80) return "score-high";
  if (score >= 60) return "score-medium";
  return "score-low";
}

onBeforeUnmount(() => {
  editor.value?.destroy();
  if (typingTimer) window.clearTimeout(typingTimer);
  if (logicBreakTimer) window.clearTimeout(logicBreakTimer);
  if (breaksController) breaksController.abort();
  stopCamera();
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

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
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

.editor-content :deep(.logic-break) {
  text-decoration: underline wavy #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 3px;
}

.editor-content :deep(.logic-break-dot) {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: #ef4444;
  vertical-align: middle;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.close-suggestion-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.close-suggestion-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
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

.rewrite-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.apply-rewrite-btn {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.apply-rewrite-btn:hover {
  background: #45a049;
}

.clear-rewrite-btn {
  padding: 8px 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.clear-rewrite-btn:hover {
  background: #4b5563;
}

.analyze-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #1e40af;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.12s ease;
}

.analyze-btn:hover:not(:disabled) {
  background: #1e3a8a;
}

.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logic-panel {
  border-top: 1px solid #e5e7eb;
  padding: 8px 10px;
  background: #f9fafb;
  max-height: 480px;
  overflow-y: auto;
}

.logic-header {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.logic-score-section {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  background: #ffffff;
  border-radius: 8px;
  border-left: 4px solid #e5e7eb;
}

.logic-score-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logic-score-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.score-high {
  color: #059669;
}
.score-medium {
  color: #d97706;
}
.score-low {
  color: #dc2626;
}

.logic-issues {
  margin-bottom: 8px;
}

.logic-issue-item {
  padding: 12px 14px;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #e5e7eb;
  transition: box-shadow 0.2s;
}

.logic-issue-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.logic-issue-type {
  font-size: 13px;
  color: #1e40af;
  font-weight: 600;
  margin-bottom: 6px;
}

.logic-issue-location {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
  font-style: italic;
}

.location-label {
  font-weight: 500;
  color: #9ca3af;
}

.logic-issue-desc {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  margin-bottom: 8px;
}

.logic-issue-example {
  margin-top: 10px;
  padding: 10px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.example-label {
  font-size: 11px;
  color: #1e40af;
  font-weight: 600;
  margin-bottom: 6px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-content {
  font-size: 12px;
  color: #1e3a8a;
  line-height: 1.6;
  font-style: italic;
  padding-left: 4px;
}

.logic-issue-severity {
  margin-top: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.severity-label {
  font-weight: 500;
  margin-right: 4px;
}

.severity-high {
  background: #fee2e2;
  color: #991b1b;
}

.severity-medium {
  background: #fef3c7;
  color: #92400e;
}

.severity-low {
  background: #d1fae5;
  color: #065f46;
}

.logic-summary {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  margin-bottom: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 8px;
}

.generate-task-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #0f766e;
  color: white;
  cursor: pointer;
  font-size: 12px;
  margin-bottom: 6px;
}

.generate-task-btn:hover {
  background: #115e59;
}

.clear-logic-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: #4caf50;
  color: white;
  cursor: pointer;
  margin-top: 8px;
  font-size: 12px;
}

.clear-logic-btn:hover {
  background: #45a049;
}

.logic-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 8px;
}

.logic-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
  transition: all 0.2s;
  position: relative;
}

.logic-tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.logic-tab.active {
  color: #1e40af;
  background: transparent;
}

.logic-tab.active::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 0;
  right: 0;
  height: 2px;
  background: #1e40af;
}

.logic-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logic-tab:disabled:hover {
  background: transparent;
  color: #6b7280;
}

.logic-content {
  /* 内容区域样式 */
}

.empty-logic-state {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
  font-size: 13px;
}

.focus-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f0fdf4;
  border-bottom: 1px solid #dcfce7;
  font-size: 13px;
  color: #166534;
  transition: background 0.3s;
}

.focus-status-bar.status-warning {
  background: #fef2f2;
  color: #991b1b;
  border-bottom-color: #fee2e2;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
}

/* dynamic colors */
.bg-green-500 {
  background-color: #22c55e;
}
.bg-yellow-500 {
  background-color: #eab308;
}
.bg-red-500 {
  background-color: #ef4444;
}

.toggle-btn {
  background: white;
  border: 1px solid #d1d5db;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.debug-info {
  margin-left: 10px;
  font-family: monospace;
  opacity: 0.7;
  font-size: 11px;
}
</style>
