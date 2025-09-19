import * as React from 'react';
import { useState } from 'react';
import { Box, Stack, TextField, Button, CircularProgress, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './constants';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    formJson.email = formJson.email.toLowerCase();

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            email: formJson.email,
            password: formJson.password,
            }),
        });
    
        if (!response.ok) {
            throw new Error('Failed to login');
        }
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', formJson.email);
        onLoginSuccess();
    } catch (error) {
        setErrorMessage('Login failed. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        padding: 2,
        border: '1px solid #ddd',
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        width: 400,
        marginBottom: 4,
      }}
    >
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField label="Email" name="email" fullWidth required />
          <TextField label="Password" name="password" type="password" fullWidth required />
          <Stack>
            {loading ? (
              <Button variant="contained" color="primary" disabled>
                <CircularProgress size={24} />
                Loading...
              </Button>
            ) : (
              <Button type="submit" variant="contained" color="primary">Login</Button>
            )}
          </Stack>
        </Stack>
      </form>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        <Link component="button" variant="body2" onClick={() => navigate('/forgot-password')}>
          Forgot Password?
        </Link>
      </Stack>
    </Box>
  );
}