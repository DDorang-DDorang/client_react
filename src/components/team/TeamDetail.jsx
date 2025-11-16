import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeamById, leaveTeam, removeMember, deleteTeam } from '../../store/slices/teamSlice';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  AvatarGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as ExitToAppIcon,
  PersonRemove as PersonRemoveIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  VideoLibrary as VideoLibraryIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
};

const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const TeamDetail = ({ teamId, onBack, onEdit, onInviteMember }) => {
  const dispatch = useDispatch();
  const { currentTeam, loading, error } = useSelector((state) => state.team);
  const { user } = useSelector((state) => state.auth);
  const { topics = [] } = useSelector((state) => state.topic);
  const { presentations = [] } = useSelector((state) => state.topic);
  
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (teamId) {
      dispatch(fetchTeamById(teamId));
    }
  }, [dispatch, teamId]);

  const handleLeaveTeam = async () => {
    try {
      await dispatch(leaveTeam(teamId)).unwrap();
      setLeaveDialogOpen(false);
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('팀 떠나기 실패:', error);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      await dispatch(removeMember({ teamId, memberId: memberToRemove.id })).unwrap();
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
      // 팀 정보 새로고침
      dispatch(fetchTeamById(teamId));
    } catch (error) {
      console.error('멤버 제거 실패:', error);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      setDeleteError('');

      // 사전 검증: 소유자 본인 외 멤버가 남아있으면 삭제 불가 가이드
      const otherMembers = (currentTeam?.members || []).filter(m => m.userId !== user?.userId);
      if (otherMembers.length > 0) {
        setDeleteError('다른 멤버가 남아 있어 팀을 삭제할 수 없습니다. 멤버를 모두 제거한 후 다시 시도하세요.');
        return;
      }

      // 사전 검증: 팀 관련 토픽/프레젠테이션이 있으면 안내
      const teamTopics = (topics || []).filter(t => t.teamId === teamId);
      const teamPresentations = (presentations || []).filter(p => teamTopics.some(t => t.id === p.topicId));
      if (teamTopics.length > 0 || teamPresentations.length > 0) {
        setDeleteError('팀에 연결된 토픽/프레젠테이션이 있어 삭제할 수 없습니다. 관련 리소스를 정리한 후 다시 시도하세요.');
        return;
      }

      await dispatch(deleteTeam(teamId)).unwrap();
      setDeleteTeamDialogOpen(false);
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('팀 삭제 실패:', error);
      setDeleteError(typeof error === 'string' ? error : (error?.message || '팀 삭제에 실패했습니다.'));
    }
  };

  const handleMenuOpen = (event, member) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  // 팀 통계 계산
  const calculateTeamStats = () => {
    if (!currentTeam) return { totalTopics: 0, totalPresentations: 0 };

    // 팀 토픽 수 계산
    const teamTopics = topics.filter(topic => topic.teamId === teamId);
    
    // 팀 프레젠테이션 수 계산
    const teamPresentations = presentations.filter(pres => 
      teamTopics.some(topic => topic.id === pres.topicId)
    );

    return {
      totalTopics: teamTopics.length,
      totalPresentations: teamPresentations.length
    };
  };

  const teamStats = calculateTeamStats();

  // 권한 확인
  const getCurrentUserRole = () => {
    if (!currentTeam || !currentTeam.members) return null;
    const currentMember = currentTeam.members.find(m => m.userId === user?.userId);
    return currentMember?.role;
  };

  const currentUserRole = getCurrentUserRole();
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';
  const canManageTeam = isOwner || isAdmin;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentTeam) {
    return (
      <Box>
        <Typography>팀을 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ 
              backgroundColor: '#ffffff',
              borderColor: '#6c757d',
              color: '#6c757d',
              '&:hover': {
                backgroundColor: '#6c757d',
                color: '#ffffff',
                borderColor: '#6c757d'
              },
              transition: 'all 0.2s ease'
            }}
          >
            뒤로가기
          </Button>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            {currentTeam.name}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManageTeam && (
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={onInviteMember}
              sx={{ 
                backgroundColor: '#ffffff',
                borderColor: '#28a745',
                color: '#28a745',
                '&:hover': {
                  backgroundColor: '#28a745',
                  color: '#ffffff',
                  borderColor: '#28a745'
                },
                transition: 'all 0.2s ease'
              }}
            >
              멤버 초대
            </Button>
          )}
          {isOwner && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit(currentTeam)}
                sx={{ 
                  backgroundColor: '#ffffff',
                  borderColor: '#007bff',
                  color: '#007bff',
                  '&:hover': {
                    backgroundColor: '#007bff',
                    color: '#ffffff',
                    borderColor: '#007bff'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                팀 편집
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteTeamDialogOpen(true)}
                sx={{ 
                  backgroundColor: '#ffffff',
                  borderColor: '#dc3545',
                  color: '#dc3545',
                  '&:hover': {
                    backgroundColor: '#dc3545',
                    color: '#ffffff',
                    borderColor: '#dc3545'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                팀 삭제
              </Button>
            </>
          )}
          {!isOwner && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ExitToAppIcon />}
              onClick={() => setLeaveDialogOpen(true)}
              sx={{ 
                backgroundColor: '#ffffff',
                borderColor: '#ffc107',
                color: '#856404',
                '&:hover': {
                  backgroundColor: '#ffc107',
                  color: '#ffffff',
                  borderColor: '#ffc107'
                },
                transition: 'all 0.2s ease'
              }}
            >
              팀 떠나기
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 통계 카드 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {teamStats.totalTopics}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    팀 토픽
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VideoLibraryIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {teamStats.totalPresentations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    프레젠테이션
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {currentTeam.members?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    팀 멤버
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 팀 정보 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                팀 정보
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  팀 이름
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {currentTeam.name}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  생성일
                </Typography>
                <Typography variant="body1">
                  {formatDate(currentTeam.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  멤버 수
                </Typography>
                <Typography variant="body1">
                  {currentTeam.members?.length || 0}명
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 멤버 관리 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                멤버 관리
              </Typography>
              {currentTeam.members && currentTeam.members.length > 0 ? (
                <List>
                  {currentTeam.members.map((member, index) => {
                    // 멤버별 활동 통계 계산
                    const memberTopics = topics.filter(topic => 
                      topic.teamId === teamId && topic.userId === member.userId
                    );
                    const memberPresentations = presentations.filter(pres => 
                      memberTopics.some(topic => topic.id === pres.topicId)
                    );

                    return (
                      <React.Fragment key={member.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar
                              src={member.userProfileImage || member.userAvatar || member.profileImage}
                              sx={{ width: 40, height: 40 }}
                            >
                              {member.userName?.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                  {member.userName}
                                </Typography>
                                <Chip 
                                  label={member.role === 'OWNER' ? '소유자' : member.role === 'ADMIN' ? '관리자' : '멤버'} 
                                  size="small" 
                                  color={member.role === 'OWNER' ? 'primary' : member.role === 'ADMIN' ? 'secondary' : 'default'}
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {member.userEmail}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  참가일: {formatShortDate(member.joinedAt)}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      토픽: {memberTopics.length}개
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      프레젠테이션: {memberPresentations.length}개
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min((memberTopics.length + memberPresentations.length) * 10, 100)} 
                                    sx={{ height: 4, borderRadius: 2 }}
                                  />
                                </Box>
                              </Box>
                            }
                          />
                          {canManageTeam && member.role !== 'OWNER' && (
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, member)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                        {index < currentTeam.members.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  멤버가 없습니다
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 멤버 관리 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>권한 변경</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setMemberToRemove(selectedMember);
          setRemoveMemberDialogOpen(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>멤버 제거</ListItemText>
        </MenuItem>
      </Menu>

      {/* 다이얼로그들 */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>팀 떠나기</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 "{currentTeam.name}" 팀을 떠나시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>취소</Button>
          <Button onClick={handleLeaveTeam} color="warning" variant="contained">
            팀 떠나기
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={removeMemberDialogOpen} onClose={() => setRemoveMemberDialogOpen(false)}>
        <DialogTitle>멤버 제거</DialogTitle>
        <DialogContent>
          <Typography>
            "{memberToRemove?.userName}"님을 팀에서 제거하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMemberDialogOpen(false)}>취소</Button>
          <Button onClick={handleRemoveMember} color="error" variant="contained">
            제거
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteTeamDialogOpen} onClose={() => setDeleteTeamDialogOpen(false)}>
        <DialogTitle>팀 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 "{currentTeam.name}" 팀을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Typography>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTeamDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteTeam} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDetail;
