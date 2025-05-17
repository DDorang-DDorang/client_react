import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Avatar
} from '@mui/material';
import authService from '../services/authService';
import { AUTH_ROUTES } from '../constants/auth';

const Home = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            환영합니다!
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            서비스를 이용하시려면 로그인이 필요합니다.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(AUTH_ROUTES.LOGIN)}
            sx={{ mt: 4 }}
          >
            로그인하기
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2rem'
                }}
              >
                {user?.name?.charAt(0) || user?.email?.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {user?.name || '사용자'}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {user?.email}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Home; 