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
        <!-- Root: Thesis (Level 0) -->
        <div v-if="logicTree.thesis" class="tree-level level-0">
          <div class="tree-node thesis-node">
            <div class="node-label">Thesis</div>
            <div class="node-content">{{ thesisText }}</div>
          </div>
        </div>

        <!-- Connector from Thesis to Main Points -->
        <div v-if="logicTree.thesis && limitedMainPoints.length > 0" class="tree-connector vertical thesis-to-main"></div>

        <!-- Level 1: Main Points (max 3) -->
        <div v-if="limitedMainPoints.length > 0" class="tree-level level-1" :class="`points-${limitedMainPoints.length}`">
          <!-- Horizontal connector line for multiple points -->
          <div v-if="limitedMainPoints.length > 1" class="horizontal-connector"></div>
          
          <div
            v-for="(point, index) in limitedMainPoints"
            :key="index"
            class="tree-branch"
            :class="`branch-${index + 1}`"
          >
            <!-- Vertical connector from horizontal line -->
            <div v-if="limitedMainPoints.length > 1" class="vertical-connector branch-connector"></div>
            
            <!-- Main Point Node -->
            <div class="tree-node main-point-node">
              <div class="node-number">{{ index + 1 }}</div>
              <div class="node-content">
                <div class="point-text">{{ point.text }}</div>
              </div>
            </div>

            <!-- Connector from Main Point to Evidence -->
            <div v-if="getLimitedEvidence(point).length > 0" class="tree-connector vertical main-to-evidence"></div>

            <!-- Level 2: Evidence (max 3 per main point) -->
            <div v-if="getLimitedEvidence(point).length > 0" class="evidence-level" :class="`evidence-${getLimitedEvidence(point).length}`">
              <!-- Horizontal connector for multiple evidence -->
              <div v-if="getLimitedEvidence(point).length > 1" class="horizontal-connector evidence-horizontal"></div>
              
              <div
                v-for="(ev, evIndex) in getLimitedEvidence(point)"
                :key="evIndex"
                class="evidence-branch"
              >
                <div v-if="getLimitedEvidence(point).length > 1" class="vertical-connector evidence-connector"></div>
                <div class="tree-node evidence-node">
                  <div class="evidence-marker">•</div>
                  <div class="evidence-text">{{ ev }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Connector from Main Points to Conclusion -->
        <div v-if="limitedMainPoints.length > 0 && logicTree.conclusion" class="tree-connector vertical main-to-conclusion"></div>

        <!-- Conclusion (Bottom) -->
        <div v-if="logicTree.conclusion" class="tree-level level-conclusion">
          <div class="tree-node conclusion-node">
            <div class="node-label">Conclusion</div>
            <div class="node-content">{{ conclusionText }}</div>
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
import { ref, computed, watch, onMounted } from 'vue';
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

// Limit main points to max 3
const limitedMainPoints = computed(() => {
  if (!logicTree.value?.mainPoints) return [];
  return logicTree.value.mainPoints.slice(0, 3);
});

// Limit evidence to max 3 per main point
function getLimitedEvidence(point: { text: string; evidence?: string[] }) {
  if (!point.evidence) return [];
  return point.evidence.slice(0, 3);
}

// Truncate long texts for display
const thesisText = computed(() => {
  const text = logicTree.value?.thesis || '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
});

const conclusionText = computed(() => {
  const text = logicTree.value?.conclusion || '';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
});

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
  min-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

/* Tree Levels */
.tree-level {
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  margin-bottom: 30px;
}

.level-0 {
  margin-bottom: 10px;
}

.level-1 {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  position: relative;
  width: 100%;
}

.level-1.points-1 {
  justify-content: center;
}

.level-1.points-2 {
  justify-content: space-around;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.level-1.points-3 {
  justify-content: space-between;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.level-conclusion {
  margin-top: 30px;
  margin-bottom: 0;
}

/* Tree Connectors */
.tree-connector {
  position: relative;
  width: 2px;
  background: #9ca3af;
  margin: 0 auto;
}

.tree-connector.vertical {
  height: 30px;
}

.tree-connector.vertical.thesis-to-main {
  height: 20px;
  margin-bottom: 0;
}

.tree-connector.vertical.main-to-evidence {
  height: 15px;
  margin-bottom: 0;
}

.tree-connector.vertical.main-to-conclusion {
  height: 25px;
  margin-bottom: 0;
}

/* Horizontal connector for multiple branches */
.horizontal-connector {
  position: absolute;
  top: -15px;
  left: 0;
  right: 0;
  height: 2px;
  background: #9ca3af;
  z-index: 0;
}

.evidence-horizontal {
  top: -15px;
  background: #c4b5fd;
}

.vertical-connector {
  width: 2px;
  height: 20px;
  background: #9ca3af;
  margin: 0;
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  transform-origin: top center;
}

.evidence-connector {
  background: #c4b5fd;
  height: 16px;
}

/* Tree Branch */
.tree-branch {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  padding-top: 18px;
}

.level-1.points-2 .branch-1 .branch-connector {
  transform: translateX(-50%) rotate(-25deg);
}

.level-1.points-2 .branch-2 .branch-connector {
  transform: translateX(-50%) rotate(25deg);
}

.level-1.points-3 .branch-1 .branch-connector {
  transform: translateX(-50%) rotate(-30deg);
}

.level-1.points-3 .branch-2 .branch-connector {
  transform: translateX(-50%) rotate(0deg);
}

.level-1.points-3 .branch-3 .branch-connector {
  transform: translateX(-50%) rotate(30deg);
}

/* Tree Nodes */
.tree-node {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  z-index: 2;
}

.tree-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.thesis-node {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  max-width: 500px;
  width: 100%;
}

.conclusion-node {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  max-width: 500px;
  width: 100%;
}

.main-point-node {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.evidence-level {
  position: relative;
  width: 100%;
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 12px;
  min-height: 80px;
}

.evidence-level.evidence-1 {
  justify-content: center;
}

.evidence-level.evidence-2 {
  justify-content: space-around;
}

.evidence-level.evidence-3 {
  justify-content: space-between;
}

.evidence-branch {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding-top: 16px;
}

.evidence-level.evidence-2 .evidence-branch:nth-child(1) .evidence-connector {
  transform: translateX(-50%) rotate(-22deg);
}

.evidence-level.evidence-2 .evidence-branch:nth-child(2) .evidence-connector {
  transform: translateX(-50%) rotate(22deg);
}

.evidence-level.evidence-3 .evidence-branch:nth-child(1) .evidence-connector {
  transform: translateX(-50%) rotate(-26deg);
}

.evidence-level.evidence-3 .evidence-branch:nth-child(2) .evidence-connector {
  transform: translateX(-50%) rotate(0deg);
}

.evidence-level.evidence-3 .evidence-branch:nth-child(3) .evidence-connector {
  transform: translateX(-50%) rotate(26deg);
}

.evidence-node {
  border-color: #a78bfa;
  background: #faf5ff;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  width: 100%;
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
  line-height: 1.5;
  word-wrap: break-word;
  flex: 1;
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
  margin-top: 2px;
}

.point-text {
  font-weight: 500;
  color: #1e1b4b;
  font-size: 13px;
}

.evidence-marker {
  color: #a78bfa;
  font-weight: bold;
  font-size: 14px;
  line-height: 1;
  margin-top: 2px;
  flex-shrink: 0;
}

.evidence-text {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
  flex: 1;
}

/* Relationships Section */
.relationships-section {
  margin-top: 40px;
  padding-top: 24px;
  width: 100%;
  border-top: 2px solid #e5e7eb;
}

.section-divider {
  display: none;
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
  font-size: 12px;
}

.rel-arrow {
  color: #f59e0b;
  font-weight: bold;
  font-size: 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .tree-wrapper {
    min-width: 100%;
  }
  
  .level-1 {
    flex-direction: column !important;
    align-items: center !important;
  }
  
  .evidence-level {
    flex-direction: column !important;
    align-items: center !important;
  }
  
  .tree-node {
    max-width: 100%;
  }
  
  .horizontal-connector {
    display: none;
  }
}
</style>
