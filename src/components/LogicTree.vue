<template>
  <div class="logic-tree-container">
    <div v-if="!text || text.trim().length < 20" class="empty-state">
      Please enter at least 20 characters to generate logic tree
    </div>
    
    <div v-else-if="isLoading" class="loading-state">
      Generating logic tree...
    </div>
    
    <div v-else-if="logicTree" class="logic-tree-content">
      <!-- Thesis -->
      <div v-if="logicTree.thesis" class="tree-node thesis-node">
        <div class="node-label">Thesis</div>
        <div class="node-content">{{ logicTree.thesis }}</div>
      </div>

      <!-- Main Points -->
      <div v-if="logicTree.mainPoints && logicTree.mainPoints.length > 0" class="tree-section">
        <div class="section-title">Main Points</div>
        <div v-for="(point, index) in logicTree.mainPoints" :key="index" class="tree-node main-point">
          <div class="node-number">{{ index + 1 }}</div>
          <div class="node-content">
            <div class="point-text">{{ point.text }}</div>
            <div v-if="point.evidence && point.evidence.length > 0" class="evidence-list">
              <div v-for="(ev, evIndex) in point.evidence" :key="evIndex" class="evidence-item">
                <span class="evidence-marker">•</span>
                <span>{{ ev }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logical Relationships -->
      <div v-if="logicTree.relationships && logicTree.relationships.length > 0" class="tree-section">
        <div class="section-title">Logical Relationships</div>
        <div v-for="(rel, index) in logicTree.relationships" :key="index" class="tree-node relationship-node">
          <div class="relationship-type">{{ rel.type }}</div>
          <div class="relationship-content">
            <div class="rel-from">{{ rel.from }}</div>
            <div class="rel-arrow">→</div>
            <div class="rel-to">{{ rel.to }}</div>
          </div>
        </div>
      </div>

      <!-- Conclusion -->
      <div v-if="logicTree.conclusion" class="tree-node conclusion-node">
        <div class="node-label">Conclusion</div>
        <div class="node-content">{{ logicTree.conclusion }}</div>
      </div>
    </div>

    <div v-else class="error-state">
      Failed to generate logic tree. Please try again later.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { getApiUrl } from '../config';
import { useAuth } from '../composables/useAuth';

interface LogicTree {
  thesis?: string;
  mainPoints?: Array<{
    text: string;
    evidence?: string[];
  }>;
  relationships?: Array<{
    type: string;
    from: string;
    to: string;
  }>;
  conclusion?: string;
}

interface Props {
  text: string;
}

const props = defineProps<Props>();
const { getAuthHeaders } = useAuth();

const logicTree = ref<LogicTree | null>(null);
const isLoading = ref(false);

async function generateLogicTree(text: string) {
  if (!text || text.trim().length < 20) {
    logicTree.value = null;
    return;
  }

  isLoading.value = true;
  try {
    // 调用后端API生成逻辑树
    const response = await fetch(getApiUrl('/analyze-logic-tree'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      logicTree.value = data.tree || null;
    } else {
      logicTree.value = null;
    }
  } catch (error) {
    console.error('Failed to generate logic tree:', error);
    logicTree.value = null;
  } finally {
    isLoading.value = false;
  }
}

watch(() => props.text, (newText) => {
  generateLogicTree(newText);
}, { immediate: true });

onMounted(() => {
  if (props.text) {
    generateLogicTree(props.text);
  }
});
</script>

<style scoped>
.logic-tree-container {
  padding: 16px;
  max-height: 480px;
  overflow-y: auto;
}

.empty-state,
.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.tree-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.tree-node {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-left: 4px solid #e5e7eb;
  transition: all 0.2s;
}

.tree-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.thesis-node {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.conclusion-node {
  border-left-color: #10b981;
  background: #ecfdf5;
}

.main-point {
  border-left-color: #6366f1;
  display: flex;
  gap: 12px;
}

.node-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.node-content {
  font-size: 14px;
  color: #111827;
  line-height: 1.6;
}

.point-text {
  font-weight: 500;
  margin-bottom: 8px;
}

.evidence-list {
  margin-top: 8px;
  padding-left: 12px;
}

.evidence-item {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 4px;
}

.evidence-marker {
  color: #6366f1;
  font-weight: bold;
  margin-right: 6px;
}

.relationship-node {
  border-left-color: #f59e0b;
}

.relationship-type {
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.relationship-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.rel-from,
.rel-to {
  flex: 1;
  padding: 8px;
  background: #fef3c7;
  border-radius: 6px;
  color: #92400e;
}

.rel-arrow {
  font-size: 18px;
  color: #f59e0b;
  font-weight: bold;
}
</style>

