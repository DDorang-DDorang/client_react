import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CollapsibleSidebar from '../components/CollapsibleSidebar';
import Navbar from '../components/Navbar';
import VideoUploader from '../components/VideoUploader';
import { CameraRecorder as CameraRecorderUtil, formatTime } from '../utils/cameraUtils';
import topicService from '../api/topicService';
import videoAnalysisService from '../api/videoAnalysisService';
import { useSelector, useDispatch } from 'react-redux';
import { setTopics, setCurrentTopic, addPresentation } from '../store/slices/topicSlice';
import { fetchUserInfo, setUser, logout } from '../store/slices/authSlice';
import useError from '../hooks/useError';
import useLoading from '../hooks/useLoading';
import theme from '../theme';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector(state => state.auth.user);
    const topics = useSelector(state => state.topic.topics);
    const currentTopic = useSelector(state => state.topic.currentTopic);
    const dispatch = useDispatch();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const [videoFiles, setVideoFiles] = useState([]);
    const [currentStream, setCurrentStream] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const { error, setError, resetError } = useError(null);
    const [success, setSuccess] = useState('');
    
    // 토픽 선택 관련 상태
    const [showTopicSelector, setShowTopicSelector] = useState(false);
    const [selectedTopicForUpload, setSelectedTopicForUpload] = useState(null);
    
    const videoRef = useRef(null);
    const recorderRef = useRef(null);
    const timerRef = useRef(null);
    const [refreshSidebarKey, setRefreshSidebarKey] = useState(0);

    // URL state에서 토픽 정보 가져오기
    useEffect(() => {
        if (location.state?.selectedTopic) {
            dispatch(setCurrentTopic(location.state.selectedTopic));
        }
    }, [location.state, dispatch]);

    // 성공 메시지 자동 제거
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess('');
            }, 5000); // 5초 후 자동 제거
            
            return () => clearTimeout(timer);
        }
    }, [success]);

    const handleNavigation = (path) => {
        navigate(path);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // 카메라 녹화 관련 함수들
    useEffect(() => {
        recorderRef.current = new CameraRecorderUtil();
        
        return () => {
            if (recorderRef.current) {
                recorderRef.current.cancelRecording();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            setError(null);
            
            const result = await recorderRef.current.startRecording();
            
            if (result.success) {
                setIsRecording(true);
                setRecordingTime(0);
                setCurrentStream(result.stream);
                
                // 오디오 트랙 확인
                const audioTracks = result.stream.getAudioTracks();
                if (audioTracks.length === 0) {
                    setError('마이크가 감지되지 않았습니다. 오디오 없이 녹화됩니다.');
                } else {
                    console.log('오디오 녹화 준비 완료');
                }
                
                // 성능 최적화된 타이머 (부드러운 업데이트)
                timerRef.current = setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);
                
                // 메모리 정리를 위한 가비지 컬렉션 힌트
                if (window.gc) {
                    setTimeout(() => window.gc(), 1000);
                }
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const stopRecording = async () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        const result = await recorderRef.current.stopRecording();
        setIsRecording(false);
        setCurrentStream(null);
        
        if (result) {
            // 녹화된 비디오를 VideoUploader로 전달하여 제목과 목표시간 설정 가능하도록 함
            // blob을 파일 객체 형태로 변환하여 저장
            const videoFile = {
                id: Date.now(), // 고유 ID 생성
                name: `녹화된 비디오_${new Date().toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }).replace(/[:\s]/g, '')}.webm`,
                type: 'recording',
                blob: result.blob,
                url: URL.createObjectURL(result.blob),
                createdAt: new Date()
            };
            
            setVideoFiles([videoFile]);
            
            // 토픽이 선택되지 않았으면 토픽 선택기 표시
            if (!currentTopic) {
                setShowTopicSelector(true);
                setSelectedTopicForUpload('recording'); // 녹화 요청 표시
                setSuccess('녹화가 완료되었습니다! 토픽을 선택한 후 제목과 목표시간을 설정해주세요.');
            } else {
                setShowUploader(true);
                setSuccess('녹화가 완료되었습니다! 제목과 목표시간을 설정해주세요.');
            }
        }
    };

    const cancelRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        recorderRef.current.cancelRecording();
        setIsRecording(false);
        setRecordingTime(0);
        setCurrentStream(null);
        setError(null);
    };

    const handleFileUpload = async (uploadData) => {
        try {
            // 토픽이 선택되어 있는지 확인
            if (!currentTopic) {
                setError('토픽을 선택해주세요.');
                setShowTopicSelector(true);
                setSelectedTopicForUpload(uploadData);
                return;
            }

            console.log('파일 업로드:', uploadData);
            
            // uploadData가 객체인지 파일인지 확인
            let file, presentationInfo;
            
            if (uploadData && typeof uploadData === 'object' && uploadData.file) {
                // 새로운 형식: { file, presentationInfo }
                file = uploadData.file;
                presentationInfo = uploadData.presentationInfo || {};
            } else {
                // 기존 형식: 파일만 전달
                file = uploadData;
                presentationInfo = {};
            }
            
            const presentationData = {
                title: presentationInfo.title || file.name.replace(/\.[^/.]+$/, ""), // 확장자 제거
                script: presentationInfo.script || '',
                goalTime: presentationInfo.goalTime || null,
                type: 'upload',
                originalFileName: file.name
            };

            const uploadResult = await topicService.createPresentation(
                currentTopic.id,
                presentationData,
                file
            );

            if (uploadResult.success) {
                dispatch(addPresentation(uploadResult.data));
                setShowUploader(false);
                setRefreshSidebarKey(prev => prev + 1); // 사이드바 새로고침 트리거
                
                // 업로드 성공 시 presentationId 반환 (VideoUploader에서 분석 처리)
                return uploadResult.data;
            } else {
                throw new Error(uploadResult.error);
            }
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            throw new Error('파일 업로드 중 오류가 발생했습니다.');
        }
    };

    // 비디오 분석 완료 핸들러
    const handleAnalysisComplete = (data) => {
        console.log('=== Dashboard: handleAnalysisComplete 호출됨 ===');
        console.log('Dashboard: 분석 완료 데이터:', data);
        
        const { presentationId, presentationData, analysisData, analysisError } = data;
        
        if (!presentationId) {
            console.error('Dashboard: presentationId가 없습니다');
            setError('분석 결과를 불러올 수 없습니다. 다시 시도해주세요.');
            return;
        }

        // 상태 정보를 localStorage에 저장
        const stateData = {
            presentationData: presentationData,
            topicData: currentTopic,
            analysisData: analysisData,
            analysisError: analysisError,
            timestamp: Date.now(),
            presentationId: presentationId
        };
        
        try {
            localStorage.setItem('videoAnalysisState', JSON.stringify(stateData));
            console.log('Dashboard: 상태 데이터를 localStorage에 저장:', stateData);
            
            // URL에 presentationId를 포함하여 이동
            navigate(`/video-analysis/${presentationId}`, {
                state: stateData,
                replace: false
            });
        } catch (error) {
            console.error('Dashboard: 네비게이션 오류:', error);
            setError('페이지 이동 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        setRefreshSidebarKey(prev => prev + 1); // 분석 완료 후에도 새로고침
    };

    const handleTopicSelect = async (topicId) => {
        const topic = topics.find(t => t.id === topicId);
        dispatch(setCurrentTopic(topic));
        setShowTopicSelector(false);

        // 선택한 토픽으로 대기 중인 파일 업로드 처리
        if (selectedTopicForUpload) {
            if (selectedTopicForUpload === 'upload' || selectedTopicForUpload === 'recording') {
                // 업로드 또는 녹화 요청인 경우 VideoUploader 열기
                setShowUploader(true);
                setSelectedTopicForUpload(null);
            } else {
                // 파일 업로드 데이터인 경우 처리
                try {
                    await handleFileUpload(selectedTopicForUpload);
                    setSelectedTopicForUpload(null);
                } catch (error) {
                    setError(error.message);
                }
            }
        }
    };

    useEffect(() => {
        if (currentStream && videoRef.current) {
            videoRef.current.srcObject = currentStream;
        }
    }, [currentStream]);

    return (
        <div style={{
            width: '100%', 
            minHeight: '100vh', 
            position: 'relative', 
            background: 'white', 
            overflowY: 'auto'
        }}>
            {/* New Navbar with sidebar toggle */}
            <Navbar 
                isCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                showSidebarToggle={true}
            />

            {/* Collapsible Sidebar */}
            <CollapsibleSidebar 
                isCollapsed={isSidebarCollapsed}
                refreshKey={refreshSidebarKey}
            />

            {/* 현재 선택된 토픽 표시 */}
            {currentTopic && (
                <div style={{
                    position: 'absolute',
                    left: isSidebarCollapsed ? 362 : 565,
                    top: 80,
                    backgroundColor: '#e3f2fd',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1976d2',
                    transition: 'left 0.3s ease-in-out'
                }}>
                    📁 {currentTopic.title}
                </div>
            )}

            {/* Main Video Area - 카메라 녹화 표시 영역 */}
            <div style={{
                width: 800, 
                height: 600, 
                left: isSidebarCollapsed ? 362 : 565, 
                top: 120, // Adjusted for smaller navbar height (70px + margin)
                position: 'absolute', 
                background: '#000000', 
                borderRadius: 20,
                transition: 'left 0.3s ease-in-out',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {currentStream ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 20,
                                transform: 'scaleX(-1)', // 거울 효과 (전면 카메라처럼)
                                willChange: 'transform', // GPU 가속 최적화
                                backfaceVisibility: 'hidden' // 렌더링 최적화
                            }}
                        />
                        
                        {/* 녹화 상태 오버레이 */}
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#ffffff',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {isRecording && (
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: '#ff4444',
                                    borderRadius: '50%',
                                    animation: 'pulse 1s infinite'
                                }} />
                            )}
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {isRecording ? `REC ${formatTime(recordingTime)}` : 'READY'}
                            </span>
                        </div>
                    </>
                ) : videoFiles.length > 0 ? (
                    // 녹화된 비디오가 있으면 표시
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                    }}>
                        <video
                            src={videoFiles[0].url}
                            controls
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                borderRadius: 20
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#ffffff',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            📹 녹화된 비디오
                        </div>
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        color: '#ffffff',
                        fontSize: '18px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '16px'
                        }}>
                            📹
                        </div>
                        <div>카메라 녹화를 시작하면 여기에 표시됩니다</div>
                        
                        {error && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 68, 68, 0.2)',
                                borderRadius: '8px',
                                color: '#ff4444',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                borderRadius: '8px',
                                color: '#4caf50',
                                fontSize: '14px'
                            }}>
                                {success}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Button - enhanced with click handler */}
            <div 
                onClick={() => {
                    if (!currentTopic) {
                        setShowTopicSelector(true);
                        setSelectedTopicForUpload('upload'); // 업로드 요청 표시
                    } else {
                        setShowUploader(true);
                    }
                }}
                style={{
                    width: 91, 
                    height: 45, 
                    padding: 12, 
                    left: isSidebarCollapsed ? (362 + 800 - 91 - 85 - 20) : (565 + 800 - 91 - 85 - 20), 
                    top: 740,
                    position: 'absolute', 
                    background: '#2C2C2C', 
                    overflow: 'hidden', 
                    borderRadius: 15, 
                    outline: '1px #2C2C2C solid', 
                    outlineOffset: '-1px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: 8, 
                    display: 'inline-flex',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = '#404040';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0px 4px 12px rgba(44, 44, 44, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = '#2C2C2C';
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                <div style={{
                    color: '#F5F5F5', 
                    fontSize: 16, 
                    fontFamily: 'Inter', 
                    fontWeight: '400', 
                    lineHeight: 16, 
                    wordWrap: 'break-word'
                }}>
                    Upload
                </div>
            </div>

            {/* Record Button - enhanced with click handler */}
            <div 
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                    width: 85, 
                    height: 45, 
                    padding: 12, 
                    left: isSidebarCollapsed ? (362 + 800 - 85 - 10) : (565 + 800 - 85 - 10), 
                    top: 740,
                    position: 'absolute', 
                    background: isRecording ? '#000000' : '#EC221F', 
                    overflow: 'hidden', 
                    borderRadius: 15, 
                    outline: `1px ${isRecording ? '#000000' : '#EC221F'} solid`, 
                    outlineOffset: '-1px', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: 8, 
                    display: 'inline-flex',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                    if (isRecording) {
                        e.target.style.background = '#333333';
                    } else {
                        e.target.style.background = '#ff3333';
                    }
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0px 4px 12px rgba(${isRecording ? '0, 0, 0' : '236, 34, 31'}, 0.3)`;
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = isRecording ? '#000000' : '#EC221F';
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = 'none';
                }}
            >
                <div style={{
                    color: '#F5F5F5', 
                    fontSize: 16, 
                    fontFamily: 'Inter', 
                    fontWeight: '400', 
                    lineHeight: 16, 
                    wordWrap: 'break-word'
                }}>
                    {isRecording ? 'Stop' : 'Record'}
                </div>
            </div>

            {/* Cancel Button - 녹화 중일 때만 표시 */}
            {isRecording && (
                <div 
                    onClick={cancelRecording}
                    style={{
                        width: 85, 
                        height: 45, 
                        padding: 12, 
                        left: isSidebarCollapsed ? (362 + 800 - 91 - 85 - 20 - 85 - 20) : (565 + 800 - 91 - 85 - 20 - 85 - 20), 
                        top: 740,
                        position: 'absolute', 
                        background: '#666666', 
                        overflow: 'hidden', 
                        borderRadius: 15, 
                        outline: '1px #666666 solid', 
                        outlineOffset: '-1px', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: 8, 
                        display: 'inline-flex',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = '#888888';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0px 4px 12px rgba(102, 102, 102, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = '#666666';
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    <div style={{
                        color: '#F5F5F5', 
                        fontSize: 16, 
                        fontFamily: 'Inter', 
                        fontWeight: '400', 
                        lineHeight: 16, 
                        wordWrap: 'break-word'
                    }}>
                        Cancel
                    </div>
                </div>
            )}

            {/* 토픽 선택 모달 */}
            {showTopicSelector && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '400px',
                        maxWidth: '90vw',
                        boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h2 style={{
                            margin: '0 0 24px 0',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#000000',
                            fontFamily: 'Inter, sans-serif'
                        }}>
                            토픽 선택
                        </h2>
                        
                        <div style={{
                            marginBottom: '16px',
                            fontSize: '14px',
                            color: '#666666'
                        }}>
                            {selectedTopicForUpload === 'upload' ? 
                                '업로드할 영상을 저장할 토픽을 선택하세요:' :
                                selectedTopicForUpload === 'recording' ?
                                '녹화된 영상을 저장할 토픽을 선택하세요:' :
                                '영상을 저장할 토픽을 선택하세요:'
                            }
                        </div>

                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            marginBottom: '24px'
                        }}>
                            {topics.length > 0 ? (
                                topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        onClick={() => handleTopicSelect(topic.id)}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s ease',
                                            border: '1px solid #e9ecef',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#f8f9fa';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '16px'
                                        }}>
                                            {topic.isTeamTopic ? '👥' : '📁'}
                                        </div>
                                        <div>
                                            <div style={{
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                color: '#000000'
                                            }}>
                                                {topic.title}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '32px 16px',
                                    color: '#666666'
                                }}>
                                    <div style={{
                                        fontSize: '48px',
                                        marginBottom: '16px'
                                    }}>
                                        📁
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#000000'
                                    }}>
                                        토픽이 없습니다
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        lineHeight: '1.5'
                                    }}>
                                        사이드바의 "Private Topics" 옆 + 버튼을 클릭하여<br />
                                        새 토픽을 만들어보세요!
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setShowTopicSelector(false);
                                setSelectedTopicForUpload(null);
                            }}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#6c757d',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif'
                            }}
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* Video Uploader Modal */}
            {showUploader && (
                <VideoUploader
                    onFileUpload={handleFileUpload}
                    onClose={() => {
                        setShowUploader(false);
                        // VideoUploader가 닫혀도 녹화된 비디오는 유지
                    }}
                    enableAnalysis={true}
                    presentationId={null}
                    onAnalysisComplete={handleAnalysisComplete}
                    initialVideoBlob={videoFiles.length > 0 ? videoFiles[0].blob : null}
                />
            )}
            
            {/* CSS 애니메이션 */}
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};

export default Dashboard; 