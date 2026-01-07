<template>
  <div class="logic-tree-container">
    <div v-if="!text || text.trim().length < 20" class="empty-state">
      Please enter at least 20 characters to generate logic tree
    </div>
    
    <div v-else-if="isLoading" class="loading-state">
      Generating logic tree...
    </div>
    
    <div v-else-if="logicTree" class="logic-tree-content">
      <div class="tree-wrapper">
        <!-- Root: Thesis -->
        <div v-if="logicTree.thesis" class="tree-level">
          <div class="tree-node thesis-node">
            <div class="node-label">Thesis</div>
            <div class="node-content">{{ logicTree.thesis }}</div>
          </div>
        </div>

        <!-- Branch connector from thesis -->
        <div v-if="logicTree.thesis && logicTree.mainPoints && logicTree.mainPoints.length > 0" class="tree-connector thesis-connector"></div>

        <!-- Level 1: Main Points -->
        <div v-if="logicTree.mainPoints && logicTree.mainPoints.length > 0" class="tree-level main-points-level">
          <div class="tree-branches">
            <div v-for="(point, index) in logicTree.mainPoints" :key="index" class="tree-branch">
              <!-- Branch connector -->
              <div v-if="logicTree.thesis || index > 0" class="branch-connector"></div>
              
              <!-- Main Point Node -->
              <div class="tree-node main-point-node">
                <div class="node-number">{{ index + 1 }}</div>
                <div class="node-content">
                  <div class="point-text">{{ point.text }}</div>
                </div>
              </div>

              <!-- Evidence (Level 2) -->
              <div v-if="point.evidence && point.evidence.length > 0" class="evidence-level">
                <div class="evidence-connector"></div>
                <div class="evidence-nodes">
                  <div v-for="(ev, evIndex) in point.evidence" :key="evIndex" class="tree-node evidence-node">
                    <div class="evidence-marker">•</div>
                    <div class="evidence-text">{{ ev }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Branch connector to conclusion -->
        <div v-if="logicTree.mainPoints && logicTree.mainPoints.length > 0 && logicTree.conclusion" class="tree-connector conclusion-connector"></div>

        <!-- Conclusion -->
        <div v-if="logicTree.conclusion" class="tree-level">
          <div class="tree-node conclusion-node">
            <div class="node-label">Conclusion</div>
            <div class="node-content">{{ logicTree.conclusion }}</div>
          </div>
        </div>

        <!-- Relationships (displayed separately) -->
        <div v-if="logicTree.relationships && logicTree.relationships.length > 0" class="relationships-section">
          <div class="section-divider"></div>
          <div class="section-title">Logical Relationships</div>
          <div class="relationships-list">
            <div v-for="(rel, index) in logicTree.relationships" :key="index" class="relationship-item">
              <div class="relationship-type">{{ rel.type }}</div>
              <div class="relationship-flow">
                <span class="rel-from">{{ rel.from }}</span>
                <span class="rel-arrow">→</span>
                <span class="rel-to">{{ rel.to }}</span>
              </div>
            </div>
          </div>
        </div>
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
  padding: 20px;
  max-height: 480px;
  overflow-y: auto;
  overflow-x: auto;
}

.empty-state,
.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.tree-wrapper {
  position: relative;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Tree Levels */
.tree-level {
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  margin-bottom: 24px;
}

.main-points-level {
  margin-bottom: 32px;
}

/* Tree Branches Container */
.tree-branches {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  width: 100%;
  position: relative;
}

.tree-branch {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Connectors */
.tree-connector {
  width: 2px;
  height: 24px;
  background: #d1d5db;
  margin: 0 auto 8px;
  position: relative;
}

.tree-connector.thesis-connector::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #d1d5db;
}

.branch-connector {
  width: 2px;
  height: 20px;
  background: #d1d5db;
  margin-bottom: 8px;
}

.evidence-connector {
  width: 2px;
  height: 16px;
  background: #e5e7eb;
  margin: 12px 0 8px;
}

/* Tree Nodes */
.tree-node {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.tree-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.thesis-node {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  max-width: 600px;
}

.conclusion-node {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  max-width: 600px;
}

.main-point-node {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.evidence-node {
  border-color: #a78bfa;
  background: #faf5ff;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  padding: 10px 12px;
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.node-content {
  font-size: 13px;
  color: #111827;
  line-height: 1.6;
  word-wrap: break-word;
}

.node-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}

.point-text {
  font-weight: 500;
  color: #1e1b4b;
}

.evidence-level {
  width: 100%;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.evidence-nodes {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.evidence-marker {
  color: #a78bfa;
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
  margin-top: 2px;
}

.evidence-text {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  flex: 1;
}

/* Relationships Section */
.relationships-section {
  margin-top: 32px;
  padding-top: 24px;
  width: 100%;
}

.section-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  text-align: center;
}

.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-item {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px 16px;
}

.relationship-type {
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.relationship-flow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.rel-from,
.rel-to {
  flex: 1;
  padding: 6px 10px;
  background: #fef3c7;
  border-radius: 6px;
  color: #92400e;
}

.rel-arrow {
  color: #f59e0b;
  font-weight: bold;
  font-size: 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .tree-branches {
    flex-direction: column;
  }
  
  .tree-branch {
    max-width: 100%;
  }
  
  .tree-node {
    font-size: 12px;
  }
}
</style>
