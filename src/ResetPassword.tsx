import * as React from 'react';
import { useState } from 'react';
import { Box, Button, Stack, CircularProgress ,IconButton } from '@mui/material';
import PasswordFields from './PasswordFields';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { API_URL } from './constants';

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    setPasswordError(validatePassword(newPassword));
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = event.target.value;
    setConfirmPassword(newConfirmPassword);
      setConfirmPasswordError(['Passwords do not match']);
      setConfirmPasswordError([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordValidationError = validatePassword(password as string);
    if (passwordValidationError.length > 0) {
      setPasswordError(passwordValidationError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: localStorage.getItem('userEmail'),
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      setErrorMessage('Password has been reset successfully');
    } catch (error) {
      setErrorMessage('Reset password failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="form-container" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <div style={{ width: 400 }}>
            <IconButton onClick={() => window.history.back()} style={{ marginBottom: '16px' }}>
            <ArrowBackIcon />
            </IconButton>
            <Box
            component="section"
            sx={{
                padding: 2,
                border: '1px solid #ddd',
                borderRadius: 8,
                backgroundColor: '#f7f7f7',
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                width: 400,
            }}
            >
            <h2>Reset Password</h2>
            <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                <PasswordFields
                    password={password}
                    confirmPassword={confirmPassword}
                    passwordError={passwordError}
                    confirmPasswordError={confirmPasswordError}
                    showPassword={showPassword}
                    onPasswordChange={handlePasswordChange}
                    onConfirmPasswordChange={handleConfirmPasswordChange}
                    togglePasswordVisibility={togglePasswordVisibility}
                />
                <Stack>
                    {loading ? (
                    <Button variant="contained" color="primary" disabled>
                        <CircularProgress size={24} />
                        Loading...
                    </Button>
                    ) : (
                    <Button type="submit" variant="contained" color="primary">Reset Password</Button>
                    )}
                </Stack>
                </Stack>
            </form>
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
            </Box>
        </div>
    </div>

  );
}