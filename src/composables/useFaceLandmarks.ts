// src/composables/useFaceLandmarks.ts
import { ref, onUnmounted } from "vue";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
  type NormalizedLandmark, // 引入关键类型
} from "@mediapipe/tasks-vision";

// --- 常量定义 ---

// MediaPipe FaceMesh 关键点索引 (468点模型标准)
// 左眼: [左角, 上左, 上右, 右角, 下右, 下左]
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
// 右眼: [左角, 上左, 上右, 右角, 下右, 下左]
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
// 嘴巴: [左角, 右角, 上唇中, 下唇中]
const MOUTH_INDICES = [61, 291, 13, 14];

// 阈值设定 (可根据实际体验微调)
const EAR_THRESHOLD = 0.25; // 低于此值认为闭眼
const MAR_THRESHOLD = 0.5;  // 高于此值认为张大嘴(打哈欠)
const FATIGUE_FRAMES = 30;  // 连续闭眼多少帧判定为疲劳 (约1秒)

export function useFaceLandmarks() {
  // --- 响应式状态 ---
  const isCameraOpen = ref(false);
  const isLoadingModel = ref(true);
  const error = ref<string | null>(null);

  // 实时监测数据
  const ear = ref(0); // 眼睛纵横比
  const mar = ref(0); // 嘴部纵横比
  const isDrowsy = ref(false); // 是否疲劳
  const isYawning = ref(false); // 是否打哈欠

  // --- 私有变量 ---
  let faceLandmarker: FaceLandmarker | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let requestRef: number | null = null;
  let closedEyeFrameCount = 0; // 闭眼帧计数器

  // --- 1. 初始化模型 ---
  const initModel = async () => {
    try {
      isLoadingModel.value = true;
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      });
      isLoadingModel.value = false;
      console.log("MediaPipe FaceLandmarker loaded successfully.");
    } catch (e) {
      error.value = `Failed to load model: ${e}`;
      console.error(e);
      isLoadingModel.value = false;
    }
  };

  // --- 2. 几何计算辅助函数 ---

  // 计算两点间欧几里得距离
  const getDistance = (p1: NormalizedLandmark, p2: NormalizedLandmark) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // 计算 EAR (Eye Aspect Ratio)
  // 公式: EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
  const calculateEAR = (landmarks: NormalizedLandmark[], indices: number[]) => {
    // 注意：在 indices[x] 后面加了 !
    const p1 = landmarks[indices[0]!]; // 左角
    const p2 = landmarks[indices[1]!]; // 上左
    const p3 = landmarks[indices[2]!]; // 上右
    const p4 = landmarks[indices[3]!]; // 右角
    const p5 = landmarks[indices[4]!]; // 下右
    const p6 = landmarks[indices[5]!]; // 下左

    // 安全检查，防止关键点缺失
    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

    const v1 = getDistance(p2, p6);
    const v2 = getDistance(p3, p5);
    const h = getDistance(p1, p4);

    if (h === 0) return 0;
    return (v1 + v2) / (2.0 * h);
  };

// 计算 MAR (Mouth Aspect Ratio)
  // 公式: MAR = |p_top - p_bottom| / |p_left - p_right|
  const calculateMAR = (landmarks: NormalizedLandmark[], indices: number[]) => {
    // 注意：在 indices[x] 后面加了 !
    const pLeft = landmarks[indices[0]!];
    const pRight = landmarks[indices[1]!];
    const pTop = landmarks[indices[2]!];
    const pBottom = landmarks[indices[3]!];

    if (!pLeft || !pRight || !pTop || !pBottom) return 0;

    const v = getDistance(pTop, pBottom);
    const h = getDistance(pLeft, pRight);

    if (h === 0) return 0;
    return v / h;
  };

  // --- 3. 开启摄像头 ---
  const startCamera = async (videoEl: HTMLVideoElement) => {
    if (!faceLandmarker) {
      await initModel();
    }
    // 再次检查，如果模型加载失败则中止
    if (!faceLandmarker) return;

    videoElement = videoEl;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user", // 优先使用前置摄像头
        },
        audio: false,
      });
      videoElement.srcObject = stream;
      
      // 必须等待数据加载完成才能开始预测
      videoElement.addEventListener("loadeddata", predictWebcam);
      isCameraOpen.value = true;
    } catch (e) {
      error.value = "无法访问摄像头，请确保已授予权限或在 HTTPS 环境下运行。";
      console.error(e);
      isCameraOpen.value = false;
    }
  };

  // --- 4. 实时预测循环 ---
  const predictWebcam = async () => {
    if (!faceLandmarker || !videoElement) return;

    // 只有当视频实际在播放且有数据时才处理
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
        const startTimeMs = performance.now();
        let results: FaceLandmarkerResult | null = null;
    
        try {
          results = faceLandmarker.detectForVideo(videoElement, startTimeMs);
        } catch (e) {
          console.warn("MediaPipe detection error:", e);
        }
    
        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          // 获取第一个人脸的关键点
          const landmarks: NormalizedLandmark[] = results.faceLandmarks[0]!;
    
          // 1. 计算左眼和右眼 EAR
          const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
    
          // 平均 EAR
          ear.value = (leftEAR + rightEAR) / 2;
    
          // 2. 计算 MAR
          mar.value = calculateMAR(landmarks, MOUTH_INDICES);
    
          // --- 逻辑判断 ---
          
          // 疲劳检测 (闭眼检测)
          if (ear.value < EAR_THRESHOLD) {
            closedEyeFrameCount++;
          } else {
            closedEyeFrameCount = 0;
            isDrowsy.value = false;
          }
    
          // 如果闭眼超过一定帧数，标记为疲劳
          if (closedEyeFrameCount > FATIGUE_FRAMES) {
            isDrowsy.value = true;
          }
    
          // 哈欠检测
          isYawning.value = mar.value > MAR_THRESHOLD;
        }
    }

    // 循环调用下一帧
    if (isCameraOpen.value) {
      requestRef = requestAnimationFrame(predictWebcam);
    }
  };

  // --- 5. 停止摄像头 ---
  const stopCamera = () => {
    isCameraOpen.value = false;
    if (requestRef) {
      cancelAnimationFrame(requestRef);
      requestRef = null;
    }
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    stopCamera();
  });

  return {
    // 状态
    isLoadingModel,
    isCameraOpen,
    error,
    // 数据
    ear,
    mar,
    isDrowsy,
    isYawning,
    // 方法
    startCamera,
    stopCamera,
  };
}