import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  AvatarGroup,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
  Tooltip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import {
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  VideoLibrary as VideoLibraryIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as ExitToAppIcon
} from '@mui/icons-material';

const TeamActivityDashboard = ({ teamId, onInviteMember, onEditTeam, onLeaveTeam }) => {
  const { teams = [] } = useSelector((state) => state.team);
  const { topics = [] } = useSelector((state) => state.topic);
  const { presentations = [] } = useSelector((state) => state.topic);
  const { user } = useSelector((state) => state.auth);
  
  const [teamStats, setTeamStats] = useState({
    totalTopics: 0,
    totalPresentations: 0,
    memberActivity: []
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (teamId && teams.length > 0) {
      calculateTeamStats();
    }
  }, [teamId, teams, topics, presentations]);

  const calculateTeamStats = () => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    // 팀 토픽 수 계산
    const teamTopics = topics.filter(topic => topic.teamId === teamId);
    
    // 팀 프레젠테이션 수 계산
    const teamPresentations = presentations.filter(pres => 
      teamTopics.some(topic => topic.id === pres.topicId)
    );

    // 멤버별 활동
    const memberActivity = team.members?.map(member => ({
      name: member.userName,
      avatar: member.userAvatar,
      role: member.role,
      userId: member.userId,
      topics: teamTopics.filter(t => t.userId === member.userId).length,
      presentations: teamPresentations.filter(p => p.userId === member.userId).length
    })) || [];

    setTeamStats({
      totalTopics: teamTopics.length,
      totalPresentations: teamPresentations.length,
      memberActivity
    });
  };

  const handleMenuOpen = (event, member) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleInviteMember = () => {
    handleMenuClose();
    onInviteMember && onInviteMember();
  };

  const handleEditTeam = () => {
    handleMenuClose();
    onEditTeam && onEditTeam();
  };

  const handleLeaveTeam = () => {
    handleMenuClose();
    onLeaveTeam && onLeaveTeam();
  };

  const getCurrentUserRole = () => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.members) return null;
    
    const currentMember = team.members.find(m => m.userId === user?.userId);
    return currentMember?.role;
  };

  const currentUserRole = getCurrentUserRole();
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';

  if (!teamId) return null;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
        팀 활동 대시보드
      </Typography>

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
                    {teamStats.memberActivity.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    팀 멤버
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 멤버 관리 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  멤버 관리
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(isOwner || isAdmin) && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={handleInviteMember}
                    >
                      멤버 초대
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={handleEditTeam}
                    >
                      팀 편집
                    </Button>
                  )}
                  {!isOwner && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<ExitToAppIcon />}
                      onClick={handleLeaveTeam}
                    >
                      팀 떠나기
                    </Button>
                  )}
                </Box>
              </Box>
              
              {teamStats.memberActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  멤버 정보를 불러올 수 없습니다
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {teamStats.memberActivity.map((member, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar>
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {member.name}
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
                            <Box sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  토픽: {member.topics}개
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  프레젠테이션: {member.presentations}개
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.min((member.topics + member.presentations) * 10, 100)} 
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                          }
                        />
                        {(isOwner || isAdmin) && member.role !== 'OWNER' && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, member)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        )}
                      </ListItem>
                      {index < teamStats.memberActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
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
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>멤버 제거</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TeamActivityDashboard;
