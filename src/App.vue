<template>
  <div class="app-root">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">WriteLoop</h1>
        <span class="tagline">From first draft to best draft</span>
      </div>
      <nav class="header-nav">
        <router-link to="/" class="nav-link">Editor</router-link>
        <router-link to="/essays" class="nav-link">📚 Model Essays</router-link>
        <div v-if="user" class="user-info">
          <router-link to="/profile" class="nav-link username-link">
            {{ user.username }}
          </router-link>
          <button @click="handleLogout" class="logout-button">登出</button>
        </div>
        <router-link v-else to="/login" class="nav-link">登录</router-link>
      </nav>
    </header>

    <main class="app-main">
      <div 
        class="editor-wrapper"
        :class="{ 'full-width': route.name === 'EssayList' || route.name === 'EssayDetail' }"
      >
        <router-view v-slot="{ Component, route }">
          <keep-alive v-if="route.name === 'Editor'">
            <component :is="Component" />
          </keep-alive>
          <component v-else :is="Component" />
        </router-view>
      </div>
    </main>
    
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from './composables/useAuth';
import { onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
const { user, logout, fetchCurrentUser } = useAuth();

onMounted(async () => {
  // 如果localStorage中有token，尝试获取用户信息
  await fetchCurrentUser();
});

async function handleLogout() {
  await logout();
  router.push('/login');
}
</script>

<style scoped>
/* 整体布局 */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  background: #f7f8fa; /* 柔和背景色 */
  overflow: hidden;
}

/* 顶部 Header */
.app-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.header-left {
  display: flex;
  flex-direction: column;
}

.header-nav {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-link {
  padding: 8px 16px;
  text-decoration: none;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #111827;
  background: #f3f4f6;
}

.nav-link.router-link-active {
  color: #007bff;
  background: #eff6ff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
}

.username-link {
  padding: 6px 10px;
  border-radius: 6px;
}

.logout-button {
  padding: 6px 12px;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-button:hover {
  background: #e5e7eb;
  color: #111827;
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
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
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

.editor-wrapper.full-width {
  max-width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  height: auto;
  min-height: calc(100vh - 64px);
  overflow: visible;
}
</style>
