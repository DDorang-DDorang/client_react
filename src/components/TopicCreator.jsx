import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import topicService from '../api/topicService';
import api from '../api/axios';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserInfo } from '../store/slices/authSlice';
import { setTopics, addTopic } from '../store/slices/topicSlice';
import { store } from '../store/store';

const TopicCreator = ({ open, onClose, onTopicCreated, isTeamTopic = false, team = null }) => {
    const [title, setTitle] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const user = useSelector(state => state.auth.user);
    const teams = useSelector(state => state.team.teams) || [];
    const dispatch = useDispatch();

    // 컴포넌트가 열릴 때 사용자 정보 확인
    useEffect(() => {
        console.log('=== TopicCreator useEffect 실행 ===');
        console.log('open:', open);
        console.log('isTeamTopic:', isTeamTopic);
        console.log('team:', team);
        console.log('user:', user);
        console.log('teams:', teams);
        
        if (open && (!user || !user.userId)) {
            console.log('사용자 정보 없음, 다시 로드 시도:', user);
            dispatch(fetchUserInfo()).catch(error => {
                console.error('사용자 정보 로드 실패:', error);
                setError('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
            });
        }
        
        // 팀 토픽 생성 시 team 정보 확인
        if (open && isTeamTopic) {
            console.log('팀 토픽 생성 다이얼로그 열림 - team:', team);
            console.log('isTeamTopic:', isTeamTopic);
            
            // team이 전달되었으면 selectedTeamId 설정
            if (team && team.id) {
                console.log('팀 ID 설정:', team.id);
                setSelectedTeamId(team.id);
            } else if (teams.length > 0) {
                console.log('첫 번째 팀을 기본값으로 설정:', teams[0].id);
                // team이 없으면 첫 번째 팀을 기본값으로 설정
                setSelectedTeamId(teams[0].id);
            } else {
                console.warn('팀 정보가 없습니다!');
            }
        }
    }, [open, user, dispatch, isTeamTopic, team, teams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError('토픽 제목을 입력해주세요.');
            return;
        }

        console.log('현재 사용자 정보:', user);

        if (!user || !user.userId) {
            setError('사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // LOCAL 사용자의 경우 JWT 토큰 확인
        if (user.provider === 'LOCAL') {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('로그인이 필요합니다. 다시 로그인해주세요.');
                return;
            }
            
            // JWT 토큰 유효성 확인
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (!payload.exp || payload.exp <= currentTime) {
                        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
                        return;
                    }
                }
            } catch (tokenError) {
                setError('인증 정보가 올바르지 않습니다. 다시 로그인해주세요.');
                return;
            }
        }

        // userId가 없으면 email을 사용
        const userIdentifier = user.userId || user.id || user.email;
        
        if (!userIdentifier) {
            setError('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('토픽 생성 시도:', { 
                title: title.trim(), 
                userIdentifier: userIdentifier,
                userInfo: user,
                provider: user.provider
            });
            
            let result;
            
            if (isTeamTopic) {
                if (!selectedTeamId) {
                    setError('팀을 선택해주세요.');
                    return;
                }
                
                const selectedTeam = teams.find(t => t.id === selectedTeamId);
                if (!selectedTeam) {
                    setError('선택된 팀을 찾을 수 없습니다.');
                    return;
                }
                
                console.log('팀 토픽 생성 - 선택된 팀:', selectedTeam);
                console.log('팀 ID:', selectedTeam.id);
                
                // 팀 토픽 생성 - topicService 사용
                result = await topicService.createTopic(title.trim(), userIdentifier, true, selectedTeam.id);
                
                if (result.success) {
                    // 서버 생성 성공 시 로컬 스토리지에도 백업 저장
                    if (!result.isLocal) {
                        try {
                            const teamTopic = {
                                ...result.data,
                                isTeamTopic: true,
                                teamId: selectedTeam.id,
                                name: title.trim()
                            };
                            
                            const localTopics = JSON.parse(localStorage.getItem('ddorang_topics') || '[]');
                            const existingIndex = localTopics.findIndex(t => t.id === teamTopic.id);
                            if (existingIndex === -1) {
                                localTopics.push(teamTopic);
                                localStorage.setItem('ddorang_topics', JSON.stringify(localTopics));
                                console.log('팀 토픽이 로컬 스토리지에 백업 저장됨:', teamTopic);
                            }
                        } catch (storageError) {
                            console.error('로컬 스토리지 백업 저장 실패:', storageError);
                        }
                    }
                    
                    // Redux store에 추가
                    const teamTopic = {
                        ...result.data,
                        isTeamTopic: true,
                        teamId: selectedTeam.id,
                        name: title.trim()
                    };
                    
                    console.log('팀 토픽 Redux store에 추가:', teamTopic);
                    dispatch(addTopic(teamTopic));
                    
                    // Redux store 상태 확인
                    setTimeout(() => {
                        console.log('팀 토픽 추가 후 Redux store 상태 확인');
                        const currentState = store.getState();
                        console.log('현재 topics 상태:', currentState.topic.topics);
                    }, 100);
                }
            } else {
                // 일반 토픽 생성
                result = await topicService.createTopic(title.trim(), userIdentifier);
            }
            
            if (result.success) {
                // 로컬 생성인 경우 사용자에게 알림
                if (result.isLocal) {
                    console.log('로컬에 토픽 생성됨:', result.data);
                    // 토픽 목록은 로컬 데이터로 업데이트하지 않음 (이미 저장됨)
                } else {
                    // 서버 생성 성공 시에도 addTopic을 사용하여 올바른 위치에 추가
                    // (setTopics는 전체 목록을 새로고침하므로 순서가 변경될 수 있음)
                    console.log('서버에서 팀 토픽 생성 성공, addTopic으로 추가');
                }
                
                onTopicCreated && onTopicCreated(result.data);
                onClose();
                setTitle('');
            } else {
                // 로그인이 필요한 경우
                if (result.needLogin) {
                    setError('로그인이 필요합니다. 다시 로그인해주세요.');
                    // 토큰 제거
                    localStorage.removeItem('token');
                    // 로그인 페이지로 리다이렉트 이벤트 발생
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                } else {
                    setError(result.error || '토픽 생성에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('토픽 생성 중 오류:', error);
            setError('토픽 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setTitle('');
            setSelectedTeamId('');
            setError('');
            onClose();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    padding: 1
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon color="primary" />
                <Typography variant="h6" component="span">
                    {isTeamTopic ? '팀 토픽 만들기' : '새 토픽 만들기'}
                </Typography>
            </DialogTitle>
            
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    <Box sx={{ mb: 2 }}>
                         {isTeamTopic && (
                             <>
                                                                 <FormControl fullWidth sx={{ mb: 2 }}>
                                     <InputLabel>팀 선택</InputLabel>
                                    <Select
                                        value={selectedTeamId}
                                         onChange={(e) => setSelectedTeamId(e.target.value)}
                                         label="팀 선택"
                                        disabled={loading}
                                    >
                                        {teams.map((team) => (
                                            <MenuItem key={team.id} value={team.id}>
                                                {team.name} ({team.userRole === 'OWNER' ? '팀장' : team.userRole === 'ADMIN' ? '관리자' : '멤버'})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                
                                {selectedTeamId && (
                                    <Typography variant="body2" color="primary" sx={{ mb: 2, fontWeight: 'medium' }}>
                                         선택된 팀: {teams.find(t => t.id === selectedTeamId)?.name}
                                    </Typography>
                                )}
                             </>
                         )}
                         
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                             {isTeamTopic 
                                 ? '팀 프로젝트를 위한 토픽의 제목을 입력해주세요.'
                                 : '프레젠테이션을 그룹화할 토픽의 제목을 입력해주세요.'
                             }
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            label="토픽 제목"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                             placeholder={isTeamTopic 
                                 ? "예: 프로젝트 A, 팀 미팅, 협업 작업 등"
                                 : "예: 회사 발표, 학교 프로젝트, 개인 연습 등"
                             }
                            disabled={loading}
                            variant="outlined"
                            sx={{ mt: 1 }}
                            inputProps={{ maxLength: 100 }}
                        />
                    </Box>
                </DialogContent>
                
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        onClick={handleClose} 
                        disabled={loading}
                        variant="outlined"
                    >
                        취소
                    </Button>
                    <Button 
                        type="submit"
                        disabled={loading || !title.trim()}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
                        sx={{ ml: 1 }}
                    >
                        {loading ? '생성 중...' : '토픽 생성'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TopicCreator; 