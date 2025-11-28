<template>
  <div class="app-root">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">WriteLoop</h1>
        <span class="tagline">AI Writing Assistant</span>
      </div>
    </header>

    <main class="app-main">
      <div class="editor-wrapper">
        <Editor />
      </div>
    </main>
    
  </div>
</template>

<script setup lang="ts">
import Editor from "./components/Editor.vue";
</script>

<style scoped>
/* 整体布局 */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f8fa; /* 柔和背景色 */
}

/* 顶部 Header */
.app-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.header-left {
  display: flex;
  flex-direction: column;
  
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.tagline {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

/* 主区域 - 居中布局 */
.app-main {
  flex: 1;
  display: flex;
  justify-content: center; /* 水平居中 */
  padding: 24px;
  overflow: hidden;
}

/* 编辑器外壳，美化 */
.editor-wrapper {
  width: 100%;
  max-width: 900px;    /* 让编辑器居中更美观 */
  height: calc(100vh - 120px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
</style>
