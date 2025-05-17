import { Box, Typography, IconButton, Menu, MenuItem, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const UserMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogoutClick = () => {
    handleClose();
    onLogout();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="body1" component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>
        {user.name}님 환영합니다
      </Typography>
      <IconButton
        size="large"
        onClick={handleMenu}
        color="inherit"
      >
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32,
            bgcolor: 'secondary.main'
          }}
        >
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleProfileClick}>
          프로필
        </MenuItem>
        <MenuItem onClick={handleLogoutClick}>로그아웃</MenuItem>
      </Menu>
    </Box>
  );
};

export default UserMenu; 