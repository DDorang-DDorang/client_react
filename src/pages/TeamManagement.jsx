import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserTeams } from '../store/slices/teamSlice';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  GroupAdd as GroupAddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExitToApp as ExitToAppIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import TeamCreator from '../components/team/TeamCreator';
import TeamDetail from '../components/team/TeamDetail';
import TeamInvite from '../components/team/TeamInvite';
import TeamJoin from '../components/team/TeamJoin';
import TeamEditor from '../components/team/TeamEditor';
import { useParams, useNavigate } from 'react-router-dom';

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

const TeamManagement = () => {
  const dispatch = useDispatch();
  const { teams, loading, error } = useSelector((state) => state.team);
  const { user } = useSelector((state) => state.auth);
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const [view, setView] = useState('dashboard'); // 'dashboard', 'create', 'detail', 'edit'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTeam, setMenuTeam] = useState(null);

  useEffect(() => {
    dispatch(fetchUserTeams());
  }, [dispatch]);

  // URL 파라미터에서 teamId가 있으면 해당 팀의 상세 페이지로 이동
  useEffect(() => {
    console.log('URL 파라미터 teamId:', teamId);
    console.log('현재 teams:', teams);
    
    if (teamId && teams.length > 0) {
      // teamId를 숫자로 변환 시도
      const numericTeamId = parseInt(teamId);
      console.log('변환된 teamId:', numericTeamId);
      
      // 숫자 ID와 문자열 ID 모두 확인
      const team = teams.find(t => t.id === numericTeamId || t.id === teamId);
      console.log('찾은 팀:', team);
      
      if (team) {
        setSelectedTeam(team);
        setView('detail');
        console.log('팀 상세 페이지로 이동:', team.name);
      } else {
        // 팀을 찾을 수 없으면 대시보드로 이동
        console.log('팀을 찾을 수 없음, 대시보드로 이동');
        navigate('/teams', { replace: true });
      }
    }
  }, [teamId, teams, navigate]);

  const handleCreateTeam = () => {
    setCreateDialogOpen(true);
  };

  const handleTeamCreated = (team) => {
    setCreateDialogOpen(false);
    setSelectedTeam(team);
    setView('detail');
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setView('detail');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedTeam(null);
    navigate('/teams', { replace: true });
  };

  const handleInviteMember = (team) => {
    setSelectedTeam(team);
    setInviteDialogOpen(true);
  };

  const handleEditTeam = (team) => {
    setSelectedTeam(team);
    setEditDialogOpen(true);
  };

  const handleMenuOpen = (event, team) => {
    setAnchorEl(event.currentTarget);
    setMenuTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTeam(null);
  };

  const handleJoinSuccess = () => {
    setJoinDialogOpen(false);
    dispatch(fetchUserTeams());
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    dispatch(fetchUserTeams());
  };

  // 통계 계산
  const totalTeams = teams.length;
  const ownedTeams = teams.filter(team => team.userRole === 'OWNER').length;
  const memberTeams = teams.filter(team => team.userRole === 'MEMBER').length;
  const totalMembers = teams.reduce((sum, team) => sum + (team.memberCount || 0), 0);

  const renderDashboard = () => (
    <Box>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          팀 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          팀을 만들고 관리하여 협업을 진행하세요
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {totalTeams}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {ownedTeams}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    소유한 팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {memberTeams}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    참여한 팀
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {totalMembers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 멤버
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 팀 목록 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              내 팀 목록
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<GroupAddIcon />}
                onClick={() => setJoinDialogOpen(true)}
              >
                팀 참가
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTeam}
              >
                팀 만들기
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : teams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <GroupIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                아직 팀이 없습니다
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                팀을 만들어서 협업을 시작하거나, 초대 코드로 기존 팀에 참가하세요
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<GroupAddIcon />}
                  onClick={() => setJoinDialogOpen(true)}
                >
                  팀 참가
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTeam}
                >
                  팀 만들기
                </Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {teams.map((team) => (
                <Grid item xs={12} sm={6} md={4} key={team.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }
                    }}
                    onClick={() => handleTeamSelect(team)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
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
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Chip 
                          label={team.userRole === 'OWNER' ? '소유자' : '멤버'} 
                          size="small"
                          color={team.userRole === 'OWNER' ? 'primary' : 'default'}
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(team.createdAt)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AvatarGroup max={3} sx={{ mr: 1 }}>
                            {team.members?.slice(0, 3).map((member, index) => (
                              <Avatar key={index} sx={{ width: 24, height: 24, fontSize: '12px' }}>
                                {member.userName?.charAt(0) || 'U'}
                              </Avatar>
                            ))}
                          </AvatarGroup>
                          <Typography variant="body2" color="text.secondary">
                            {team.memberCount || 0}명
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* 팀 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleTeamSelect(menuTeam);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>상세 보기</ListItemText>
        </MenuItem>
        {menuTeam?.userRole === 'OWNER' && (
          <>
            <MenuItem onClick={() => {
              handleEditTeam(menuTeam);
              handleMenuClose();
            }}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>팀 편집</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => {
              handleInviteMember(menuTeam);
              handleMenuClose();
            }}>
              <ListItemIcon>
                <PersonAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>멤버 초대</ListItemText>
            </MenuItem>
          </>
        )}
        {menuTeam?.userRole === 'MEMBER' && (
          <MenuItem onClick={() => {
            // 팀 떠나기 로직
            handleMenuClose();
          }}>
            <ListItemIcon>
              <ExitToAppIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>팀 떠나기</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );

  const renderContent = () => {
    switch (view) {
      case 'create':
        return (
          <TeamCreator
            onTeamCreated={handleTeamCreated}
            onCancel={handleBackToDashboard}
          />
        );
      case 'detail':
        return (
          <TeamDetail
            teamId={selectedTeam?.id}
            onBack={handleBackToDashboard}
            onEdit={handleEditTeam}
            onInviteMember={handleInviteMember}
          />
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {renderContent()}

      {/* 다이얼로그들 */}
      <TeamCreator
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      <TeamInvite
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        team={selectedTeam}
      />

      <TeamJoin
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        onJoinSuccess={handleJoinSuccess}
      />

      <TeamEditor
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        team={selectedTeam}
        onSuccess={handleEditSuccess}
      />
    </Container>
  );
};

export default TeamManagement;
