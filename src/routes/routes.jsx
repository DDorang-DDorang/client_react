import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Main from '../pages/Main';
import Login from '../pages/Login';
import SignUp from '../pages/SignUp';
import ForgotPassword from '../pages/ForgotPassword';
import OAuth2RedirectHandler from '../pages/OAuth2RedirectHandler';
import Dashboard from '../pages/Dashboard';
import VideoAnalysis from '../pages/VideoAnalysis';
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
            <Route
                path="/dashboard"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
            <Route
                path="/video"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
            <Route
                path="/video-analysis/:presentationId"
                element={
                    <PrivateRoute>
                        <VideoAnalysis />
                    </PrivateRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;