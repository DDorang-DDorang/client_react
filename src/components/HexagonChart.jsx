import React, { useEffect, useRef, useState } from 'react';

const HexagonChart = ({ data = {}, transcriptData, analysisDetails }) => {
    const canvasRef = useRef(null);
    const [activeView, setActiveView] = useState('chart'); // 'chart' 또는 'transcript'
    
    const labels = {
        voice: '음성',
        speed: '속도',
        gesture: '제스처',
        eyeContact: '시선',
        confidence: '자신감',
        clarity: '명확성'
    };

    // 기본 데이터 설정
    const defaultData = {
        voice: 0,
        speed: 0,
        gesture: 0,
        eyeContact: 0,
        confidence: 0,
        clarity: 0
    };

    // data가 없거나 null일 경우 기본값 사용
    const safeData = data || defaultData;

    const colors = {
        background: '#f8f9fa',
        grid: '#e9ecef',
        data: '#2C2C2C',
        dataFill: 'rgba(44, 44, 44, 0.2)',
        text: '#000000',
        accent: '#4CAF50',
        warning: '#FF9800',
        danger: '#F44336'
    };

    // 애니메이션을 위한 상태
    const [animationProgress, setAnimationProgress] = useState(0);

    // 애니메이션 효과
    useEffect(() => {
        const duration = 1000; // 1초
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            setAnimationProgress(progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }, [safeData]);

    // 점수에 따른 색상 반환
    const getScoreColor = (score) => {
        if (score >= 80) return colors.accent;
        if (score >= 60) return colors.warning;
        return colors.danger;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 60;
        const sides = 6;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Helper function to get point on hexagon
        const getHexPoint = (index, radiusMultiplier = 1) => {
            const angle = (index * 2 * Math.PI) / sides - Math.PI / 2;
            return {
                x: centerX + Math.cos(angle) * radius * radiusMultiplier,
                y: centerY + Math.sin(angle) * radius * radiusMultiplier
            };
        };

        // Draw grid lines (concentric hexagons)
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        
        for (let level = 0.2; level <= 1; level += 0.2) {
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const point = getHexPoint(i, level);
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            ctx.stroke();
        }

        // Draw axis lines
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i < sides; i++) {
            const point = getHexPoint(i);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }

        // Draw data polygon
        const dataKeys = Object.keys(safeData);
        ctx.strokeStyle = colors.data;
        ctx.fillStyle = colors.dataFill;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        dataKeys.forEach((key, index) => {
            const value = (safeData[key] / 100) * animationProgress; // 애니메이션 적용
            const point = getHexPoint(index, value);
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw data points
        ctx.fillStyle = colors.data;
        dataKeys.forEach((key, index) => {
            const value = (safeData[key] / 100) * animationProgress; // 애니메이션 적용
            const point = getHexPoint(index, value);
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw labels and scores
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        dataKeys.forEach((key, index) => {
            const point = getHexPoint(index, 1.2);
            const label = labels[key] || key;
            const score = Math.round(safeData[key] * animationProgress); // 애니메이션된 점수
            
            // Draw label
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(label, point.x, point.y - 8);
            
            // Draw score with color
            ctx.font = '12px Inter, sans-serif';
            ctx.fillStyle = getScoreColor(safeData[key]); // 실제 점수 기준으로 색상
            ctx.fillText(`${score}점`, point.x, point.y + 8);
        });

        // Draw center score (animated)
        const averageScore = Math.round((Object.values(safeData).reduce((a, b) => a + b, 0) / dataKeys.length) * animationProgress);
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${averageScore}`, centerX, centerY - 5);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText('평균', centerX, centerY + 10);

    }, [safeData, activeView, animationProgress]);

    return (
        <div style={{
            width: '100%',
            backgroundColor: colors.background,
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            overflow: 'hidden'
        }}>
            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#ffffff',
                borderRadius: '12px 12px 0 0'
            }}>
                <button
                    onClick={() => setActiveView('chart')}
                    style={{
                        flex: 1,
                        padding: '16px 20px',
                        backgroundColor: activeView === 'chart' ? '#f8f9fa' : 'transparent',
                        border: 'none',
                        borderBottom: activeView === 'chart' ? '3px solid #2C2C2C' : '3px solid transparent',
                        fontSize: '15px',
                        fontWeight: activeView === 'chart' ? '700' : '500',
                        color: activeView === 'chart' ? '#2C2C2C' : '#666666',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.3s ease',
                        borderRadius: activeView === 'chart' ? '12px 0 0 0' : '0'
                    }}
                    onMouseEnter={(e) => {
                        if (activeView !== 'chart') {
                            e.target.style.color = '#2C2C2C';
                            e.target.style.backgroundColor = '#f8f9fa';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeView !== 'chart') {
                            e.target.style.color = '#666666';
                            e.target.style.backgroundColor = 'transparent';
                        }
                    }}
                >
                    📊 능력치 분석
                </button>
                <button
                    onClick={() => setActiveView('transcript')}
                    style={{
                        flex: 1,
                        padding: '16px 20px',
                        backgroundColor: activeView === 'transcript' ? '#f8f9fa' : 'transparent',
                        border: 'none',
                        borderBottom: activeView === 'transcript' ? '3px solid #2C2C2C' : '3px solid transparent',
                        fontSize: '15px',
                        fontWeight: activeView === 'transcript' ? '700' : '500',
                        color: activeView === 'transcript' ? '#2C2C2C' : '#666666',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.3s ease',
                        borderRadius: activeView === 'transcript' ? '0 12px 0 0' : '0'
                    }}
                    onMouseEnter={(e) => {
                        if (activeView !== 'transcript') {
                            e.target.style.color = '#2C2C2C';
                            e.target.style.backgroundColor = '#f8f9fa';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeView !== 'transcript') {
                            e.target.style.color = '#666666';
                            e.target.style.backgroundColor = 'transparent';
                        }
                    }}
                >
                    📝 발표 대본
                </button>
            </div>

            {/* Content Area */}
            <div style={{
                padding: '20px',
                height: 'calc(100vh - 200px)', // 전체 높이에서 네비게이션과 패딩을 뺀 높이
                overflowY: 'auto'
            }}>
                {activeView === 'chart' ? (
                    // Hexagon Chart and Analysis View
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Hexagon Chart */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '280px',
                            marginBottom: '20px',
                            flexShrink: 0
                        }}>
                            <canvas
                                ref={canvasRef}
                                width={350}
                                height={300}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto'
                                }}
                            />
                        </div>

                        {/* Detailed Analysis */}
                        {analysisDetails && (
                            <>
                                <h4 style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#000000',
                                    margin: '0 0 16px 0',
                                    fontFamily: 'Inter, sans-serif'
                                }}>
                                    📈 세부 분석
                                </h4>
                                
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto'
                                }}>
                                    {analysisDetails.map((item, index) => {
                                        const categoryIcons = {
                                            '음성 강도': '🎤',
                                            '말하기 속도': '⚡',
                                            '피치 변화': '🎵',
                                            '발음 정확도': '🗣️',
                                            '제스처 (예상)': '👋',
                                            '제스처': '👋',
                                            '시선 처리 (예상)': '👀',
                                            '시선 처리': '👀'
                                        };
                                        
                                        return (
                                            <div key={index} style={{
                                                backgroundColor: '#ffffff',
                                                borderRadius: '12px',
                                                padding: '18px',
                                                marginBottom: '14px',
                                                border: '1px solid #e9ecef',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                                transition: 'all 0.2s ease',
                                                cursor: 'default'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                                            }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '10px'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}>
                                                        <span style={{ fontSize: '16px' }}>
                                                            {categoryIcons[item.title] || '📊'}
                                                        </span>
                                                        <h5 style={{
                                                            fontSize: '15px',
                                                            fontWeight: '600',
                                                            color: '#000000',
                                                            margin: 0,
                                                            fontFamily: 'Inter, sans-serif'
                                                        }}>
                                                            {item.title}
                                                        </h5>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <div style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            backgroundColor: getScoreColor(item.score)
                                                        }}></div>
                                                        <span style={{
                                                            fontSize: '15px',
                                                            fontWeight: '700',
                                                            color: getScoreColor(item.score)
                                                        }}>
                                                            {item.score}점
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <p style={{
                                                    fontSize: '13px',
                                                    color: '#666666',
                                                    margin: '0 0 14px 0',
                                                    lineHeight: '1.5'
                                                }}>
                                                    {item.description}
                                                </p>
                                                
                                                <div style={{
                                                    backgroundColor: '#f8f9fa',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    fontSize: '12px',
                                                    color: '#555555'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        marginBottom: '8px'
                                                    }}>
                                                        <span>💡</span>
                                                        <strong>개선 제안:</strong>
                                                    </div>
                                                    <ul style={{
                                                        margin: '0',
                                                        paddingLeft: '18px',
                                                        listStyle: 'none'
                                                    }}>
                                                        {item.suggestions.map((suggestion, idx) => (
                                                            <li key={idx} style={{ 
                                                                marginBottom: '3px',
                                                                position: 'relative'
                                                            }}>
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    left: '-14px',
                                                                    color: '#4CAF50',
                                                                    fontWeight: 'bold'
                                                                }}>•</span>
                                                                {suggestion}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // Transcript View
                    <>
                        {transcriptData ? (
                            <div style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                padding: '20px',
                                border: '1px solid #e9ecef',
                                height: '100%',
                                overflowY: 'auto'
                            }}>
                                <p style={{
                                    fontSize: '16px',
                                    color: '#333333',
                                    lineHeight: '1.8',
                                    margin: 0,
                                    fontFamily: 'Inter, sans-serif',
                                    textAlign: 'justify'
                                }}>
                                    {transcriptData.fullText}
                                </p>
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                color: '#666666',
                                fontSize: '16px',
                                padding: '40px 20px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    fontSize: '48px',
                                    marginBottom: '16px'
                                }}>
                                    📝
                                </div>
                                <div>대본 데이터가 없습니다</div>
                                <div style={{
                                    fontSize: '14px',
                                    marginTop: '8px'
                                }}>
                                    음성이 포함된 영상을 업로드하면 STT 분석 결과를 확인할 수 있습니다.
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default HexagonChart; 