import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, Stack, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import PasswordFields from './PasswordFields';
import Floater from './Floater';
import { API_URL } from './constants';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState<{ [key: string]: string }>({});
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
const messageType = message && message.includes('successfully') ? 'success' : 'error';

const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
            const response = await fetch(`${API_URL}/auth/get-security-questions`, {
            method: 'POST',
            headers: {
                    'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.toLowerCase() }),
            });

            if (response.status === 400) {
                    setMessage('User not found or no security questions are associated with this user');
                    return;
            } else if (!response.ok) {
                    throw new Error('Failed to fetch security questions');
            }

            const questions = await response.json();
            if (!questions) {
                    setMessage('User not found or no security questions are associated with this user');
                    return;
            }
            setSecurityQuestions(questions);
            setStep(2);
    } catch (error) {
            setMessage(error.message || 'Failed to fetch security questions');
    }
};

  const handleAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnswersSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formattedAnswers = Object.keys(securityQuestions).reduce<{ [key: string]: string }>((acc, question, index) => {
        acc[question] = answers[`answer${index + 1}`];
        return acc;
      }, {});

    const response = await fetch(`${API_URL}/auth/verify-security-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, securityQuestions: formattedAnswers }),
    });

    if (response.ok) {
      const isValid = await response.json();
      if (isValid) {
        setMessage('Security questions verified. You can now reset your password.');
        setStep(3);
      } else {
        setMessage('Security questions verification failed.');
      }
    } else {
      setMessage('Failed to verify security questions.');
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    const error = validatePassword(newPassword);
    setPasswordError(error ? [error] : []);
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = event.target.value;
    setConfirmPassword(newConfirmPassword);
    if (newConfirmPassword !== password) {
      setConfirmPasswordError(['Passwords do not match']);
    } else {
      setConfirmPasswordError([]);
    }
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());

    if (formJson.password !== formJson.confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordValidationError = validatePassword(formJson.password as string);
    if (passwordValidationError) {
      setPasswordError([passwordValidationError]);
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
          email: email.toLowerCase(),
          password: formJson.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      setMessage('Password has been reset successfully');
      navigate('/loginregister');
    } catch (error) {
      setMessage('Reset password failed. Please try again.');
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
            <IconButton onClick={() => navigate('/loginregister')} style={{ marginBottom: '16px' }}>
            <ArrowBackIcon />
            </IconButton>
            <Box component="section" sx={{ padding: 2, border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#f7f7f7', boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)', width: 400 }}>
            <h2>Forgot Password</h2>
            {step === 1 ? (
                <form onSubmit={handleEmailSubmit}>
                <Stack spacing={2}>
                    <TextField label="Email" type="email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} />
                    <Button type="submit" variant="contained" color="primary">Get Security Questions</Button>
                </Stack>
                </form>
            ) : step === 2 ? (
                <form onSubmit={handleAnswersSubmit}>
                <Stack spacing={2}>
                {Object.entries(securityQuestions).map(([questionKey, question], index) => (
                  <React.Fragment key={index}>
                    <TextField
                      label={`Question ${index + 1}`}
                      value={question}
                      fullWidth
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <TextField
                      label={`Answer ${index + 1}`}
                      name={`answer${index + 1}`}
                      fullWidth
                      required
                      value={answers[`answer${index + 1}`] || ''}
                      onChange={handleAnswerChange}
                    />
                  </React.Fragment>
                ))}
                <Button type="submit" variant="contained" color="primary">Submit Answers</Button>
                </Stack>
                </form>
            ) : (
            <form onSubmit={handlePasswordSubmit}>
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
          )}
          {message && <Floater message={message} type={messageType} />}
          </Box>
        </div>
    </div>
  );
}