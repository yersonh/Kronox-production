import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import storage from '../api/storage';

export default function PrivateRoute({ children }) {
    const token = storage.get('token');
    const location = useLocation();

    if (!token) return <Navigate to="/login" />;

    const userRaw = storage.get('user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    if (user?.must_change_password && location.pathname !== '/cambiar-contrasena') {
        return <Navigate to="/cambiar-contrasena" />;
    }

    return children;
}