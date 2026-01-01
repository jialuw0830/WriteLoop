<template>
  <div class="radar-chart-container">
    <canvas ref="canvasRef" :width="size" :height="size"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

interface Props {
  ttr: number;        // 词汇丰富度 (0-100)
  mlu: number;        // 句法复杂度 (0-100)
  logicScore: number; // 逻辑连贯性 (0-100)
  size?: number;      // 图表大小（默认 300）
}

const props = withDefaults(defineProps<Props>(), {
  size: 300
});

const canvasRef = ref<HTMLCanvasElement | null>(null);

function drawRadarChart() {
  if (!canvasRef.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const centerX = props.size / 2;
  const centerY = props.size / 2;
  const radius = props.size * 0.35;
  const angleStep = (Math.PI * 2) / 3; // 3个维度

  // 清除画布
  ctx.clearRect(0, 0, props.size, props.size);

  // 绘制背景网格
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let level = 1; level <= 5; level++) {
    ctx.beginPath();
    const r = (radius * level) / 5;
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 绘制轴线
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  const labels = ['TTR', 'MLU', 'Logic Score'];
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle)
    );
    ctx.stroke();

    // 绘制标签
    ctx.fillStyle = '#374151';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelX = centerX + (radius + 30) * Math.cos(angle);
    const labelY = centerY + (radius + 30) * Math.sin(angle);
    const label = labels[i] ?? '';
    ctx.fillText(label, labelX, labelY);
  }

  // 绘制数据区域
  const values = [props.ttr, props.mlu, props.logicScore];
  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const rawValue = values[i] ?? 0;
    const value = Math.max(0, Math.min(100, rawValue));
    const r = (radius * value) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 绘制数据点
  ctx.fillStyle = '#6366f1';
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const rawValue = values[i] ?? 0;
    const value = Math.max(0, Math.min(100, rawValue));
    const r = (radius * value) / 100;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // 显示数值
    ctx.fillStyle = '#111827';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value).toString(), x, y - 18);
    ctx.fillStyle = '#6366f1';
  }
}

onMounted(() => {
  drawRadarChart();
});

watch(() => [props.ttr, props.mlu, props.logicScore], () => {
  drawRadarChart();
});
</script>

<style scoped>
.radar-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

canvas {
  display: block;
}
</style>

