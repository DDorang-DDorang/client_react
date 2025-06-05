import React, { useState, useRef } from 'react';
import { validateVideoFile } from '../utils/cameraUtils';
import videoAnalysisService from '../api/videoAnalysisService';
import axios from 'axios';

const VideoUploader = ({ 
  onFileUpload, 
  onClose, 
  presentationId = null, 
  enableAnalysis = false, 
  onAnalysisComplete = null 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    try {
      // 비디오 파일 유효성 검사
      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/ogg'];
      const maxSize = enableAnalysis ? 100 * 1024 * 1024 : 500 * 1024 * 1024; // 분석용은 100MB, 일반은 500MB

      if (!validTypes.includes(file.type)) {
        throw new Error('지원하는 비디오 형식: MP4, AVI, MOV, WMV, WebM, OGG');
      }

      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        throw new Error(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
      }

      setSelectedFile(file);
      setError(null);
      setSuccess('');
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!videoBlob) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      const fileExtension = videoBlob.type.includes('webm') ? '.webm' : '.mp4';
      const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}${fileExtension}`;
      formData.append('file', videoBlob, fileName);
      
      const response = await axios.post('/api/presentations/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // 파일 업로드
      const uploadResult = await onFileUpload(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // 분석 기능이 활성화되고 업로드 결과가 있으면 자동으로 분석 시작
      if (enableAnalysis && uploadResult && uploadResult.id) {
        setIsAnalyzing(true);
        
        try {
          const analysisResult = await videoAnalysisService.analyzeVideo(uploadResult.id, selectedFile);
          
          console.log('VideoUploader - 분석 결과 구조:', analysisResult);
          
          if (analysisResult.success) {
            setSuccess('비디오 업로드 및 분석이 완료되었습니다!');
            
            if (onAnalysisComplete) {
              // 분석 완료 후 필요한 모든 데이터 전달
              // 서버 응답 구조에 따라 분석 데이터 추출
              const actualAnalysisData = analysisResult.data?.analysisResult || 
                                        analysisResult.data || 
                                        analysisResult.analysisResult ||
                                        analysisResult;
              
              console.log('=== VideoUploader: 분석 성공 ===');
              console.log('uploadResult:', uploadResult);
              console.log('analysisResult:', analysisResult);
              console.log('actualAnalysisData:', actualAnalysisData);
              console.log('onAnalysisComplete 함수 존재:', typeof onAnalysisComplete);
              
              // 모달 닫기 (페이지 이동 전에)
              console.log('VideoUploader: 모달 닫기 호출 중...');
              console.log('VideoUploader: 현재 URL:', window.location.href);
              onClose();
              
              // 약간의 지연 후 콜백 호출 (모달 닫힘 애니메이션 고려)
              setTimeout(() => {
                console.log('=== VideoUploader: onAnalysisComplete 콜백 호출 시작 ===');
                console.log('VideoUploader: 콜백 호출 직전 URL:', window.location.href);
                const callbackData = {
                  presentationId: uploadResult.id,
                  presentationData: uploadResult,
                  analysisData: actualAnalysisData
                };
                console.log('VideoUploader: 콜백에 전달할 데이터:', callbackData);
                console.log('VideoUploader: onAnalysisComplete 함수 호출 중...');
                onAnalysisComplete(callbackData);
                console.log('=== VideoUploader: onAnalysisComplete 콜백 호출 완료 ===');
                console.log('VideoUploader: 콜백 호출 후 URL:', window.location.href);
              }, 100);
            }
          } else {
            setError(`분석 실패: ${analysisResult.error}`);
            
            // 분석 실패 시에도 콜백 호출 (에러 정보와 함께)
            if (onAnalysisComplete) {
              console.log('=== VideoUploader: 분석 실패 ===');
              console.log('analysisResult:', analysisResult);
              
              // 모달 닫기
              onClose();
              
              setTimeout(() => {
                console.log('=== onAnalysisComplete 실패 콜백 호출 ===');
                const callbackData = {
                  presentationId: uploadResult.id,
                  presentationData: uploadResult,
                  analysisError: analysisResult.error
                };
                console.log('실패 콜백에 전달할 데이터:', callbackData);
                onAnalysisComplete(callbackData);
              }, 100);
            }
          }
        } catch (analysisError) {
          console.error('분석 오류:', analysisError);
          setError('분석 중 오류가 발생했습니다.');
          
          // 분석 오류 시에도 콜백 호출
          if (onAnalysisComplete) {
            console.log('=== VideoUploader: 분석 catch 오류 ===');
            console.log('analysisError:', analysisError);
            console.log('uploadResult:', uploadResult);
            
            // 모달 닫기
            onClose();
            
            setTimeout(() => {
              console.log('=== onAnalysisComplete catch 오류 콜백 호출 ===');
              const callbackData = {
                presentationId: uploadResult.id,
                presentationData: uploadResult,
                analysisError: '분석 중 오류가 발생했습니다.'
              };
              console.log('catch 오류 콜백에 전달할 데이터:', callbackData);
              onAnalysisComplete(callbackData);
            }, 100);
          }
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setSuccess('비디오 업로드가 완료되었습니다!');
      }
      
      // 성공 후 파일 선택 초기화
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err) {
      setError(err.message || '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('mp4')) return '🎬';
    if (fileType.includes('webm')) return '📹';
    if (fileType.includes('ogg')) return '🎞️';
    if (fileType.includes('avi')) return '📽️';
    if (fileType.includes('mov')) return '🎥';
    return '📺';
  };

  const isProcessing = isUploading || isAnalyzing;
  const currentStatus = isAnalyzing ? '분석 중...' : isUploading ? '업로드 중...' : '';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: 320,
          height: 240,
          frameRate: 15
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });
      setMediaStream(stream);
      
      // 지원되는 MIME 타입 확인
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';
      
      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 250000,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const blob = new Blob([event.data], { type: mimeType });
          setVideoBlob(blob);
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      };
      
      setMediaRecorder(mediaRecorder);
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('카메라와 마이크 접근 권한이 필요합니다.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        minWidth: '500px',
        maxWidth: '600px',
        boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#000000'
          }}>
            {enableAnalysis ? '비디오 분석' : '비디오 파일 업로드'}
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#666666',
              opacity: isProcessing ? 0.5 : 1
            }}
          >
            ×
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div style={{
            backgroundColor: '#efe',
            color: '#2a5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#000000' : '#cccccc'}`,
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            backgroundColor: isDragOver ? '#f8f9fa' : '#ffffff',
            transition: 'all 0.2s ease',
            marginBottom: '24px',
            opacity: isProcessing ? 0.6 : 1
          }}
        >
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            {enableAnalysis ? '🎤' : '🎬'}
          </div>
          
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '8px'
          }}>
            파일을 여기에 드래그하거나 클릭하여 선택
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '16px'
          }}>
            {enableAnalysis 
              ? 'MP4, AVI, MOV, WMV 파일 지원 (최대 100MB)' 
              : 'MP4, WebM, OGG, AVI, MOV, WMV 파일 지원 (최대 500MB)'
            }
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            disabled={isProcessing}
            style={{ display: 'none' }}
          />
        </div>

        {/* 업로드/분석 진행 상태 */}
        {isProcessing && (
          <div style={{
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#1976d2',
              marginBottom: '8px'
            }}>
              {currentStatus} {uploadProgress}%
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#bbdefb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#1976d2',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* 선택된 파일 정보 */}
        {selectedFile && (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '24px'
              }}>
                {getFileIcon(selectedFile.type)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: '4px'
                }}>
                  {selectedFile.name}
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: '#666666'
                }}>
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </div>
              </div>
              
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setError(null);
                    setSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#666666',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* 비디오 미리보기 */}
            <div style={{
              marginTop: '12px'
            }}>
              <video
                src={URL.createObjectURL(selectedFile)}
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  backgroundColor: '#000000'
                }}
                controls
              />
            </div>
          </div>
        )}

        {/* 버튼들 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '12px 24px',
              backgroundColor: '#666666',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            취소
          </button>
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedFile && !isProcessing ? '#28a745' : '#cccccc',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: selectedFile && !isProcessing ? 'pointer' : 'not-allowed'
            }}
          >
            {isProcessing ? currentStatus : (enableAnalysis ? '분석 시작' : '업로드')}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default VideoUploader; 