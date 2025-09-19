import * as React from 'react';
import { TextField, IconButton, InputAdornment, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface PasswordFieldsProps {
  password: string;
  confirmPassword: string;
  passwordError: string[] | null;
  confirmPasswordError: string[] | null;
  showPassword: boolean;
  onPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  togglePasswordVisibility: () => void;
}

export default function PasswordFields({
  password,
  confirmPassword,
  passwordError,
  confirmPasswordError,
  showPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  togglePasswordVisibility,
}: PasswordFieldsProps) {
  return (
    <>
      <TextField
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        fullWidth
        required
        value={password}
        onChange={onPasswordChange}
        error={!!passwordError}
        helperText={
          passwordError && passwordError.map((error, index) => (
            <Typography key={index} variant="body2" color="error">
              {error}
            </Typography>
          ))
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={togglePasswordVisibility}>
                {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label="Confirm Password"
        name="confirmPassword"
        type={showPassword ? 'text' : 'password'}
        fullWidth
        required
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        error={!!confirmPasswordError}
        helperText={confirmPasswordError}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={togglePasswordVisibility}>
              {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}