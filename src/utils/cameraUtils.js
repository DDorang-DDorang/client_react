// 카메라 녹화 및 비디오 처리 유틸리티

export class CameraRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.videoChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.recordingMimeType = null;
  }

  async startRecording() {
    try {
      // 카메라 및 마이크 접근 요청 - 성능 최적화
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 }, // 프레임레이트 낮춤
          facingMode: 'user' // 전면 카메라 우선
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      console.log('미디어 스트림 획득 성공');
      
      // MediaRecorder 설정 - MP4 우선으로 변경
      let options = {};
      let mimeType = 'video/webm'; // 기본값
      
      // MP4 코덱 우선 선택
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
        options.mimeType = 'video/mp4;codecs=h264,aac';
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
        options.mimeType = 'video/webm;codecs=h264,opus';
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options.mimeType = 'video/webm;codecs=vp9,opus';
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options.mimeType = 'video/webm';
        mimeType = 'video/webm';
      }
      
      // 비트레이트 최적화
      options.audioBitsPerSecond = 128000; // 128kbps
      options.videoBitsPerSecond = 2500000; // 2.5Mbps
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.videoChunks = [];
      this.recordingMimeType = mimeType; // MIME 타입 저장
      
      // 오디오 트랙 확인
      const audioTracks = this.stream.getAudioTracks();
      const videoTracks = this.stream.getVideoTracks();
      
      console.log('오디오 트랙:', audioTracks.length > 0 ? '활성화됨' : '비활성화됨');
      console.log('비디오 트랙:', videoTracks.length > 0 ? '활성화됨' : '비활성화됨');
      console.log('사용된 MIME 타입:', options.mimeType);
      console.log('출력 형식:', mimeType);
      
      if (audioTracks.length === 0) {
        console.warn('오디오 트랙이 없습니다. 마이크 권한을 확인해주세요.');
      }
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.videoChunks.push(event.data);
        }
      };
      
      // 사용자가 카메라를 중단했을 때 처리
      this.stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopRecording();
      });
      
      this.mediaRecorder.start(2000); // 2초마다 데이터 수집 (부드러운 녹화)
      this.isRecording = true;
      
      return { stream: this.stream, success: true };
    } catch (error) {
      console.error('카메라 녹화 시작 실패:', error);
      
      // 스트림이 있다면 정리
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (error.name === 'NotAllowedError') {
        throw new Error('카메라 및 마이크 접근 권한이 거부되었습니다.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('카메라 또는 마이크를 찾을 수 없습니다.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('이 브라우저는 카메라 녹화를 지원하지 않습니다.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('카메라 또는 마이크가 다른 애플리케이션에서 사용 중입니다.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('요청한 카메라 설정을 지원하지 않습니다.');
      } else if (error.name === 'SecurityError') {
        throw new Error('보안상의 이유로 카메라에 접근할 수 없습니다.');
      } else {
        throw new Error(`카메라 녹화를 시작할 수 없습니다: ${error.message}`);
      }
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.videoChunks, { type: this.recordingMimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // 스트림 정리
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.isRecording = false;
        resolve({ blob: videoBlob, url: videoUrl });
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      this.isRecording = false;
      this.videoChunks = [];
    }
  }

  getStream() {
    return this.stream;
  }
}

// 파일 검증 함수
export const validateVideoFile = (file) => {
  const allowedTypes = [
    'video/mp4', 
    'video/webm', 
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv'
  ];
  
  const maxSize = 500 * 1024 * 1024; // 500MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('지원되지 않는 파일 형식입니다. (MP4, WebM, OGG, AVI, MOV, WMV만 지원)');
  }
  
  if (file.size > maxSize) {
    throw new Error('파일 크기가 너무 큽니다. (최대 500MB)');
  }
  
  return true;
};

// 비디오 파일을 FormData로 변환
export const createVideoFormData = (videoBlob, filename = 'camera_recording.webm') => {
  const formData = new FormData();
  formData.append('video', videoBlob, filename);
  return formData;
};

// 시간 포맷팅 함수
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}; 