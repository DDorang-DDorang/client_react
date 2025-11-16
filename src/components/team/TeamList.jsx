import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserTeams } from '../../store/slices/teamSlice';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  AvatarGroup,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as ExitToAppIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const TeamList = ({ onTeamSelect, onCreateTeam, onInviteMember }) => {
  const dispatch = useDispatch();
  const { teams, loading, error } = useSelector((state) => state.team);
  const { user } = useSelector((state) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const teamsLoadedRef = useRef(false);
  
  useEffect(() => {
    // 팀 목록이 이미 로드되었으면 재로드하지 않음
    if (!teamsLoadedRef.current && teams.length === 0) {
      teamsLoadedRef.current = true;
      dispatch(fetchUserTeams());
    }
  }, [dispatch, teams.length]);

  const handleMenuOpen = (event, team) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  const handleTeamSelect = (team) => {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
  };

  const handleInviteMember = () => {
    if (onInviteMember && selectedTeam) {
      onInviteMember(selectedTeam);
    }
    handleMenuClose();
  };

  const handleEditTeam = () => {
    if (onTeamSelect) {
      onTeamSelect(selectedTeam);
    }
    handleMenuClose();
  };

  const handleDeleteTeam = () => {
    // 팀 삭제는 TeamDetail에서 처리
    handleMenuClose();
  };

  const handleLeaveTeam = () => {
    // 팀 떠나기는 TeamDetail에서 처리
    handleMenuClose();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'error';
      case 'ADMIN':
        return 'warning';
      case 'MEMBER':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'OWNER':
        return '소유자';
      case 'ADMIN':
        return '관리자';
      case 'MEMBER':
        return '멤버';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>팀 목록을 불러오는 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => dispatch(fetchUserTeams())}
          sx={{ mt: 2 }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  if (teams.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          아직 참여한 팀이 없습니다
        </Typography>
        <Typography color="textSecondary" gutterBottom>
          새 팀을 만들거나 초대를 받아 팀에 참여해보세요
        </Typography>
        <Button
          variant="contained"
          startIcon={<GroupIcon />}
          onClick={onCreateTeam}
          sx={{ mt: 2 }}
        >
          팀 만들기
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">내 팀</Typography>
        <Button
          variant="contained"
          startIcon={<GroupIcon />}
          onClick={onCreateTeam}
        >
          팀 만들기
        </Button>
      </Box>

      <Grid container spacing={3}>
        {teams.map((team) => (
          <Grid item xs={12} sm={6} md={4} key={team.id}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 }
              }}
              onClick={() => handleTeamSelect(team)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {team.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, team);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getRoleLabel(team.userRole)}
                    color={getRoleColor(team.userRole)}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {team.memberCount}명
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  생성일: {format(new Date(team.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}
                </Typography>

                {team.members && team.members.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      멤버:
                    </Typography>
                    <AvatarGroup max={4} sx={{ justifyContent: 'flex-start' }}>
                      {team.members.slice(0, 4).map((member) => (
                        <Tooltip key={member.id} title={member.userName}>
                          <Avatar
                            src={member.userProfileImage || member.userAvatar || member.profileImage}
                            sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                          >
                            {member.userName?.charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ))}
                      {team.members.length > 4 && (
                        <Tooltip title={`+${team.members.length - 4}명 더`}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                            +{team.members.length - 4}
                          </Avatar>
                        </Tooltip>
                      )}
                    </AvatarGroup>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleTeamSelect}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>팀 보기</ListItemText>
        </MenuItem>
        
        {(selectedTeam?.userRole === 'OWNER' || selectedTeam?.userRole === 'ADMIN') && (
          <MenuItem onClick={handleInviteMember}>
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>멤버 초대</ListItemText>
          </MenuItem>
        )}
        
        {selectedTeam?.userRole === 'OWNER' && (
          <>
            <MenuItem onClick={handleEditTeam}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>팀 편집</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDeleteTeam}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>팀 삭제</ListItemText>
            </MenuItem>
          </>
        )}
        
        {selectedTeam?.userRole !== 'OWNER' && (
          <MenuItem onClick={handleLeaveTeam}>
            <ListItemIcon>
              <ExitToAppIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>팀 떠나기</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default TeamList;
