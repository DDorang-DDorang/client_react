import React, { useState, useRef, useEffect } from 'react';
import { validateVideoFile } from '../utils/cameraUtils';
import videoAnalysisService from '../api/videoAnalysisService';
import axios from 'axios';

const VideoUploader = ({ 
  onFileUpload, 
  onClose, 
  presentationId = null, 
  enableAnalysis = false, 
  onAnalysisComplete = null,
  initialVideoBlob = null, // 대시보드에서 녹화된 비디오를 받기 위한 prop 추가
  currentTopic = null, // 현재 선택된 토픽
  topics = [], // 토픽 목록
  onTopicSelect = null // 토픽 선택 콜백
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [success, setSuccess] = useState('');
  const [videoBlob, setVideoBlob] = useState(initialVideoBlob); // 초기값으로 받은 비디오 설정
  const [videoUrl, setVideoUrl] = useState(initialVideoBlob ? URL.createObjectURL(initialVideoBlob) : null);
  
  // 프레젠테이션 정보 상태 추가
  const [presentationInfo, setPresentationInfo] = useState({
    title: '',
    goalTime: '',
    selectedTopicId: currentTopic?.id || '' // 토픽 선택 상태 추가
  });
  
  const fileInputRef = useRef(null);

  // 초기 비디오가 있으면 기본 제목 설정
  useEffect(() => {
    if (initialVideoBlob && !presentationInfo.title) {
      setPresentationInfo(prev => ({
        ...prev,
        title: `녹화된 프레젠테이션_${new Date().toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/[:\s]/g, '')}`
      }));
    }
  }, [initialVideoBlob, presentationInfo.title]);

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
      const maxSize = 4 * 1024 * 1024 * 1024; // 4GB

      if (!validTypes.includes(file.type)) {
        throw new Error('지원하는 비디오 형식: MP4, AVI, MOV, WMV, WebM, OGG');
      }

      if (file.size > maxSize) {
        const maxSizeGB = maxSize / (1024 * 1024 * 1024);
        throw new Error(`파일 크기는 ${maxSizeGB}GB 이하여야 합니다.`);
      }

      setSelectedFile(file);
      setError(null);
      setSuccess('');
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
    }
  };

  const handlePresentationInfoChange = (field) => (event) => {
    setPresentationInfo(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile && !videoBlob) {
      setError('파일을 선택하거나 녹화를 완료해주세요.');
      return;
    }

    // 목표시간 유효성 검사
    if (presentationInfo.goalTime) {
      const goalTime = parseInt(presentationInfo.goalTime);
      if (isNaN(goalTime) || goalTime < 1 || goalTime > 240) {
        setError('목표시간은 1분 이상 240분 이하여야 합니다.');
        return;
      }
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
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

      // 파일 업로드 시 프레젠테이션 정보도 함께 전달
        const uploadData = {
        file: selectedFile || videoBlob,
          presentationInfo: {
            title: presentationInfo.title || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : '녹화된 프레젠테이션'),
          goalTime: presentationInfo.goalTime ? parseInt(presentationInfo.goalTime) : null
          }
        };

      const uploadResult = await onFileUpload(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // 백엔드에서 자동으로 분석을 시작하므로, 프론트엔드는 분석 완료를 기다리지 않음
      setSuccess('비디오 업로드가 완료되었습니다! 백그라운드에서 분석이 진행됩니다.');
      
      // 성공 후 초기화
      setSelectedFile(null);
      setVideoBlob(null);
      setVideoUrl(null);
      setPresentationInfo({
        title: '',
        goalTime: ''
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 모달 닫기
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 2000); // 2초 후 자동 닫기
      }
      
    } catch (err) {
      console.error('업로드 오류:', err);
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
  
  // 분석 진행 상태에 따른 메시지
  const getAnalysisStatusMessage = () => {
    if (isAnalyzing) {
      if (success.includes('분석 중')) {
        return success;
      }
      return '분석 중... 잠시만 기다려주세요';
    }
    return '';
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#333333'
          }}>
            {enableAnalysis ? '비디오 업로드 및 분석' : '비디오 업로드'}
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
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* 프레젠테이션 정보 입력 폼 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#333333'
          }}>
            프레젠테이션 정보
          </h3>
          
          {/* 토픽 선택 (topics가 있을 때만 표시) */}
          {topics && topics.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#555555'
              }}>
                토픽 선택 *
              </label>
              <select
                value={presentationInfo.selectedTopicId}
                onChange={(e) => {
                  const topicId = e.target.value;
                  setPresentationInfo(prev => ({
                    ...prev,
                    selectedTopicId: topicId
                  }));
                  if (onTopicSelect && topicId) {
                    onTopicSelect(topicId);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="">토픽을 선택하세요</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title || topic.name} {topic.isTeamTopic ? '(팀)' : '(개인)'}
                  </option>
                ))}
              </select>
              <small style={{
                display: 'block',
                marginTop: '4px',
                color: '#666666',
                fontSize: '12px'
              }}>
                발표를 저장할 토픽을 선택하세요
              </small>
            </div>
          )}
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555555'
            }}>
              제목 *
            </label>
            <input
              type="text"
              value={presentationInfo.title}
              onChange={handlePresentationInfoChange('title')}
              placeholder="프레젠테이션 제목을 입력하세요"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#555555'
            }}>
              목표 시간 (분)
            </label>
            <input
              type="number"
              value={presentationInfo.goalTime}
              onChange={handlePresentationInfoChange('goalTime')}
              placeholder="예: 5 (5분)"
              min="1"
              max="240"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            <small style={{
              color: '#666666',
              fontSize: '12px'
            }}>
              1분 ~ 240분 사이로 입력하세요
            </small>
          </div>

        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
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
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {/* 파일 업로드 영역 */}
        <div style={{
          border: '2px dashed #cccccc',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          backgroundColor: isDragOver ? '#f0f8ff' : '#ffffff',
          transition: 'all 0.3s ease',
          marginBottom: '20px'
        }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            📁
          </div>
          
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#333333',
            marginBottom: '8px'
          }}>
            비디오 파일을 드래그하거나 클릭하여 선택하세요
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '20px'
          }}>
            지원 형식: MP4, AVI, MOV, WMV, WebM, OGG
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              파일 선택
            </button>
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
            backgroundColor: isAnalyzing ? '#fff3e0' : '#e3f2fd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '16px',
              color: isAnalyzing ? '#f57c00' : '#1976d2',
              marginBottom: '12px',
              fontWeight: '500'
            }}>
              {isAnalyzing ? '🔍 ' : '📤 '}{currentStatus}
            </div>
            
            {isAnalyzing && (
              <div style={{
                fontSize: '14px',
                color: '#e65100',
                marginBottom: '12px',
                fontStyle: 'italic'
              }}>
                {getAnalysisStatusMessage()}
              </div>
            )}
            
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: isAnalyzing ? '#ffe0b2' : '#bbdefb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: isAnalyzing ? '#ff9800' : '#1976d2',
                transition: 'width 0.3s ease',
                animation: isAnalyzing ? 'pulse 2s infinite' : 'none'
              }} />
            </div>
            
            {/* 청크 업로드 진행률 표시 */}
            {chunkProgress.total > 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#666666'
              }}>
                청크 업로드: {chunkProgress.current} / {chunkProgress.total}
                {chunkProgress.total > 0 && (
                  <span style={{ marginLeft: '8px' }}>
                    ({Math.round((chunkProgress.current / chunkProgress.total) * 100)}%)
                  </span>
                )}
              </div>
            )}
            
            {isAnalyzing && (
              <div style={{
                fontSize: '12px',
                color: '#bf360c',
                marginTop: '8px'
              }}>
                ⏱️ 분석에는 몇 분이 소요될 수 있습니다
              </div>
            )}
          </div>
        )}

        {/* 선택된 파일 정보 */}
        {(selectedFile || videoBlob) && (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>
                {getFileIcon(selectedFile?.type || 'video/webm')}
              </span>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#333333'
                }}>
                  {selectedFile?.name || (videoBlob ? `녹화된 비디오_${new Date().toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(/[:\s]/g, '')}.webm` : '녹화된 비디오')}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666666'
                }}>
                  {formatFileSize(selectedFile?.size || videoBlob?.size || 0)}
                </div>
              </div>
            </div>

            {/* 비디오 미리보기 */}
            <div style={{
              marginTop: '12px'
            }}>
              <video
                src={URL.createObjectURL(selectedFile || videoBlob)}
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
            disabled={!selectedFile && !videoBlob || isProcessing}
            style={{
              padding: '12px 24px',
              backgroundColor: (selectedFile || videoBlob) && !isProcessing ? '#28a745' : '#cccccc',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: (selectedFile || videoBlob) && !isProcessing ? 'pointer' : 'not-allowed'
            }}
          >
            {isProcessing ? currentStatus : (
              enableAnalysis ? '분석 시작' : (
                videoBlob ? '녹화 업로드' : '업로드'
              )
            )}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes loading {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default VideoUploader; 