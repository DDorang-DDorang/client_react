import React, { useEffect, useRef, useState } from 'react';

const PentagonChart = ({ data = {}, analysisDetails, size = 350, showLabels = true, showGrid = true, isPreview = false }) => {
    const canvasRef = useRef(null);
    
    const labels = {
        voice: '음성',
        speed: '속도',
        expression: '표정',
        pitch: '피치',
        clarity: '명확성'
    };

    // 기본 데이터 설정
    const defaultData = {
        voice: 0,
        speed: 0,
        expression: 0,
        pitch: 0,
        clarity: 0
    };

    // data가 없거나 null일 경우 기본값 사용
    const safeData = data || defaultData;

    const colors = {
        background: '#f8f9fa',
        grid: '#e9ecef',
        data: '#1976d2',
        dataFill: 'rgba(25, 118, 210, 0.2)',
        text: '#000000',
        accent: '#4CAF50',
        warning: '#FF9800',
        danger: '#F44336'
    };

    // 애니메이션을 위한 상태
    const [animationProgress, setAnimationProgress] = useState(0);

    // 애니메이션 효과 (미리보기에서는 비활성화)
    useEffect(() => {
        if (isPreview) {
            setAnimationProgress(1);
            return;
        }
        
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
    }, [safeData, isPreview]);

    // 점수에 따른 색상 반환
    const getScoreColor = (score) => {
        if (score >= 80) return colors.accent;
        if (score >= 60) return colors.warning;
        return colors.danger;
    };

    // 등급에 따른 색상 반환
    const getGradeColor = (grade) => {
        switch (grade) {
            case 'A': return colors.accent;
            case 'B': return colors.accent;
            case 'C': return colors.warning;
            case 'D': return colors.danger;
            case 'E': return colors.danger;
            default: return colors.warning;
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        // 사이드바용 미니 차트인지 확인 (size가 작고 showLabels가 false인 경우)
        const isSidebarChart = !showLabels && size <= 180;
        const radius = isSidebarChart 
            ? Math.min(centerX, centerY)  // 사이드바: 최대한 크게
            : Math.min(centerX, centerY) - 60; // 상세 분석: 적절한 여백
        const sides = 5;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background (미리보기 모드에서는 투명하게)
        if (!isPreview) {
            ctx.fillStyle = colors.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Helper function to get point on pentagon
        const getPentPoint = (index, radiusMultiplier = 1) => {
            const angle = (index * 2 * Math.PI) / sides - Math.PI / 2;
            return {
                x: centerX + Math.cos(angle) * radius * radiusMultiplier,
                y: centerY + Math.sin(angle) * radius * radiusMultiplier
            };
        };

        // Draw grid
        if (showGrid) {
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            
            // Draw pentagon grid lines
            for (let i = 0; i < sides; i++) {
                const point1 = getPentPoint(i, 0.2);
                const point2 = getPentPoint(i, 0.4);
                const point3 = getPentPoint(i, 0.6);
                const point4 = getPentPoint(i, 0.8);
                const point5 = getPentPoint(i, 1.0);
                
                ctx.beginPath();
                ctx.moveTo(point1.x, point1.y);
                ctx.lineTo(point2.x, point2.y);
                ctx.lineTo(point3.x, point3.y);
                ctx.lineTo(point4.x, point4.y);
                ctx.lineTo(point5.x, point5.y);
                ctx.stroke();
            }

            // Draw connecting lines
            for (let i = 0; i < sides; i++) {
                const point1 = getPentPoint(i, 0.2);
                const point2 = getPentPoint((i + 1) % sides, 0.2);
                ctx.beginPath();
                ctx.moveTo(point1.x, point1.y);
                ctx.lineTo(point2.x, point2.y);
                ctx.stroke();
                
                const point3 = getPentPoint(i, 0.4);
                const point4 = getPentPoint((i + 1) % sides, 0.4);
                ctx.beginPath();
                ctx.moveTo(point3.x, point3.y);
                ctx.lineTo(point4.x, point4.y);
                ctx.stroke();
                
                const point5 = getPentPoint(i, 0.6);
                const point6 = getPentPoint((i + 1) % sides, 0.6);
                ctx.beginPath();
                ctx.moveTo(point5.x, point5.y);
                ctx.lineTo(point6.x, point6.y);
                ctx.stroke();
                
                const point7 = getPentPoint(i, 0.8);
                const point8 = getPentPoint((i + 1) % sides, 0.8);
                ctx.beginPath();
                ctx.moveTo(point7.x, point7.y);
                ctx.lineTo(point8.x, point8.y);
                ctx.stroke();
                
                const point9 = getPentPoint(i, 1.0);
                const point10 = getPentPoint((i + 1) % sides, 1.0);
                ctx.beginPath();
                ctx.moveTo(point9.x, point9.y);
                ctx.lineTo(point10.x, point10.y);
                ctx.stroke();
            }
        }

        // Draw data polygon
        const dataPoints = [];
        const axisOrder = ['voice', 'speed', 'expression', 'pitch', 'clarity'];
        
        axisOrder.forEach((key, index) => {
            const value = safeData[key];
            let normalizedValue;
            
            if (typeof value === 'string') {
                // 등급 기반 값 (A=1.0, B=0.8, C=0.6, D=0.4, E=0.2, F=0.0)
                const gradeValues = { 'A': 1.0, 'B': 0.8, 'C': 0.6, 'D': 0.4, 'E': 0.2, 'F': 0.0 };
                normalizedValue = gradeValues[value] || 0.6;
            } else {
                // 숫자 기반 값 (0-100을 0-1로 정규화)
                normalizedValue = (value || 0) / 100;
            }
            
            const point = getPentPoint(index, normalizedValue * animationProgress);
            dataPoints.push(point);
        });

        // Fill data polygon
        if (dataPoints.length > 0) {
            ctx.fillStyle = colors.dataFill;
            ctx.beginPath();
            ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
            dataPoints.forEach(point => {
                ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
        }

        // Draw data polygon border
        if (dataPoints.length > 0) {
            ctx.strokeStyle = colors.data;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
            dataPoints.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
        ctx.stroke();
        }

        // Draw data points
        dataPoints.forEach((point, index) => {
        ctx.fillStyle = colors.data;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw labels (미리보기 모드에서는 개별 라벨 숨김)
            if (showLabels && !isPreview) {
                ctx.fillStyle = colors.text;
                ctx.font = '12px Inter, sans-serif';
                ctx.textAlign = 'center';
                
                const key = axisOrder[index];
                const label = labels[key];
                const grade = safeData[key];
                
                // 차트 외각에 라벨 배치 (각 축의 끝점에서 약간 바깥쪽)
                const outerRadius = radius * 1.2; // 차트보다 20% 더 바깥쪽
                const outerPoint = getPentPoint(index, outerRadius / radius);
                
                // 일반 모드에서는 능력치 이름과 등급을 함께 표시
                ctx.fillText(`${label}`, outerPoint.x, outerPoint.y - 8);
                if (typeof grade === 'string') {
                    ctx.fillText(`${grade}등급`, outerPoint.x, outerPoint.y + 8);
                } else {
                    ctx.fillText(`${grade}점`, outerPoint.x, outerPoint.y + 8);
                }
            }
        });

        // Draw center average score (미리보기 모드에서도 표시)
        if (showLabels || isPreview) {
            ctx.fillStyle = colors.text;
            ctx.font = isPreview ? '16px Inter, sans-serif' : '20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fontWeight = 'bold';
            
            // 평균 등급 계산 (VideoAnalysis와 동일한 방식)
            const gradeValues = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
            
            let totalGradeValue = 0;
            let gradeCount = 0;
            
            axisOrder.forEach(key => {
                const value = safeData[key];
                if (typeof value === 'string' && gradeValues[value] !== undefined) {
                    totalGradeValue += gradeValues[value];
                    gradeCount++;
                }
            });
            
            // 등급 평균 계산
            const averageGradeValue = gradeCount > 0 ? totalGradeValue / gradeCount : 3;
            const averageGradeText = Object.keys(gradeValues).find(key => 
                gradeValues[key] === Math.round(averageGradeValue)
            ) || 'C';
            
            ctx.fillText(`${averageGradeText}`, centerX, centerY + (isPreview ? 10 : -5));
        }

    }, [safeData, animationProgress, size, showLabels, showGrid, isPreview]);

    // 카테고리별 아이콘
    const categoryIcons = {
        voice: '🎤',
        speed: '⚡',
        expression: '😊',
        pitch: '🎵',
        clarity: '💬'
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header - 미리보기 모드에서는 숨김 */}
            {!isPreview && (
                <div style={{
                    padding: '20px 20px 0 20px'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#000000',
                        margin: '0 0 20px 0',
                        fontFamily: 'Inter, sans-serif',
                        textAlign: 'center'
                    }}>
                        📊 능력치 분석
                    </h3>
                </div>
            )}

                        {/* Content Area */}
            <div style={{
                padding: isPreview ? '10px' : '20px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}>
                                        {/* Pentagon Chart - 고정 */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: isPreview ? '180px' : '220px',
                            marginBottom: isPreview ? '10px' : '20px',
                            flexShrink: 0
                        }}>
                    <canvas
                        ref={canvasRef}
                        width={size}
                        height={isPreview ? size * 0.65 : size * 0.85}
                        style={{
                            width: isPreview ? `${size}px` : '100%',
                            height: isPreview ? `${size * 0.85}px` : 'auto',
                            maxWidth: '100%'
                        }}
                    />
                </div>

                {/* Detailed Analysis - 스크롤 가능 (미리보기 모드에서는 숨김) */}
                {analysisDetails && !isPreview && (
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '8px',
                        marginTop: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>
                            {Object.entries(analysisDetails).map(([key, item], index, array) => {
                                // DB에서 가져온 데이터를 그대로 사용 (등급 변환 제거)
                                const analysisItem = {
                                    title: key,
                                    score: item.score || 0,
                                    grade: item.grade || 'C', // DB에서 가져온 등급 그대로 사용
                                    description: item.text || '분석 결과가 없습니다.'
                                };
                                
                                return (
                                    <div key={key} style={{
                                        padding: '0',
                                        borderBottom: index === array.length - 1 ? 'none' : '1px solid #f0f0f0',
                                        paddingBottom: '20px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ fontSize: '18px' }}>
                                                    {categoryIcons[key] || '📊'}
                                                </span>
                                                <h5 style={{
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    color: '#000000',
                                                    margin: 0,
                                                    fontFamily: 'Inter, sans-serif',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {analysisItem.title}
                                                </h5>
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{
                                                    fontSize: '16px',
                                                    fontWeight: '700',
                                                    color: getGradeColor(analysisItem.grade),
                                                    padding: '4px 12px',
                                                    backgroundColor: getGradeColor(analysisItem.grade) + '15',
                                                    borderRadius: '20px'
                                                }}>
                                                    {analysisItem.grade}등급
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#555555',
                                            margin: '0',
                                            lineHeight: '1.6'
                                        }}>
                                            {analysisItem.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PentagonChart;
