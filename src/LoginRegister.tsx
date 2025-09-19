import * as React from 'react';
import { useState } from 'react';
import { Button, Box } from '@mui/material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import { useNavigate, Route, Routes } from 'react-router-dom';


export default function LoginRegister() {
  const [showOnlyLogin, setShowOnlyLogin] = useState(false);

  const handleRegisterSuccess = () => {
    setShowOnlyLogin(true);
  };

  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/');
  };

  return (
    <div className="form-container" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}>      
    <Routes>
      <Route path="/" element={
        showOnlyLogin ? (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            <LoginForm onLoginSuccess={handleLoginSuccess} />
            <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
          </>
        )
      } />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
    <Box sx={{ mt: 4 }}>
      <Button
          variant="contained"
          color="primary"
          onClick={handleLoginSuccess}
          sx={{ width: '100%', padding: 2 }}
        >
          Continue as Guest
        </Button>
      </Box>
    </div>
  );
}