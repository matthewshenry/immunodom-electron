import * as React from 'react';
import { useState } from 'react';
import { Box, Stack, TextField, Button, CircularProgress, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import PasswordFields from './PasswordFields';
import Floater from './Floater';
import { API_URL } from './constants';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
}

const securityQuestionsList = [
  "What is your mother's maiden name?",
  "What is the name of your first pet?",
  "What is your favorite movie?",
  "What was the name of your first school?",
  "What is your favorite book?",
  "What city were you born in?",
  "What is your favorite food?",
  "What was the make of your first car?",
  "What is your father's middle name?",
  "What was your childhood nickname?"
];

export default function RegisterForm({ onRegisterSuccess }: RegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string[] | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string[] | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState<{ [key: string]: string }>({
    question1: '',
    answer1: '',
    question2: '',
    answer2: '',
    question3: '',
    answer3: '',
  });
  const [step, setStep] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);

  const handleSecurityQuestionChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setSecurityQuestions((prev) => ({ ...prev, [name as string]: value as string }));
  };

  const handleSecurityAnswerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSecurityQuestions((prev) => ({ ...prev, [name]: value }));
  };

  const validatePassword = (password: string) => {
    const errors = [];
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
    return errors.length > 0 ? errors : null;
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    setPasswordError(validatePassword(newPassword));
  };

  const handleConfirmPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = event.target.value;
    setConfirmPassword(newConfirmPassword);
    if (newConfirmPassword !== password) {
      setConfirmPasswordError(['Passwords do not match']);
    } else {
      setConfirmPasswordError(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmitStep1 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
    formJson.email = formJson.email.toLowerCase();

    if (formJson.password !== formJson.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordValidationError = validatePassword(formJson.password as string);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setLoading(false);
      return;
    }

    setEmail(formJson.email as string);
    setPassword(formJson.password as string);
    setStep(2);
    setLoading(false);
  };

  const handleSubmitStep2 = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            securityQuestions: {
              [formJson.question1]: formJson.answer1,
              [formJson.question2]: formJson.answer2,
              [formJson.question3]: formJson.answer3,
            },
          }),
        });

        if (!response.ok) {
            throw new Error('Failed to register');
        }
        onRegisterSuccess();
    } catch (error) {
        setErrorMessage('Registration failed. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const handleSkipSecurityQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register');
      }
      onRegisterSuccess();
    } catch (error) {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setOpenDialog(false);
    }
  }

    const handleOpenDialog = () => {
      setOpenDialog(true);
    };

    const handleCloseDialog = () => {
      setOpenDialog(false);
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
      }}
    >
      <h2>Register</h2>
      <form onSubmit={step === 1 ? handleSubmitStep1 : handleSubmitStep2}>
        <Stack spacing={2}>
        {step === 1 && (
          <>
            <TextField label="Email" name="email" type="email" fullWidth required />
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
          </>
        )}
        {step === 2 && (
          <>
          <FormControl fullWidth required>
            <InputLabel>Security Question 1</InputLabel>
            <Select
              name="question1"
              value={securityQuestions.question1}
              onChange={handleSecurityQuestionChange}
            >
              {securityQuestionsList.map((question, index) => (
                <MenuItem key={index} value={question}>
                  {question}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Answer 1"
            name="answer1"
            fullWidth
            required
            value={securityQuestions.answer1}
            onChange={handleSecurityAnswerChange}
          />
          <FormControl fullWidth required>
            <InputLabel>Security Question 2</InputLabel>
            <Select
              name="question2"
              value={securityQuestions.question2}
              onChange={handleSecurityQuestionChange}
            >
              {securityQuestionsList.map((question, index) => (
                <MenuItem key={index} value={question}>
                  {question}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Answer 2"
            name="answer2"
            fullWidth
            required
            value={securityQuestions.answer2}
            onChange={handleSecurityAnswerChange}
          />
          <FormControl fullWidth required>
            <InputLabel>Security Question 3</InputLabel>
            <Select
              name="question3"
              value={securityQuestions.question3}
              onChange={handleSecurityQuestionChange}
            >
              {securityQuestionsList.map((question, index) => (
                <MenuItem key={index} value={question}>
                  {question}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Answer 3"
            name="answer3"
            fullWidth
            required
            value={securityQuestions.answer3}
            onChange={handleSecurityAnswerChange}
          />
            <Button variant="outlined" sx={{ color: 'red', borderColor: 'red' }} onClick={handleOpenDialog}>
            Skip Security Questions
            </Button>
          <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
          >
            <DialogTitle>Skip Security Questions</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure? Your account will not be recoverable if you skip.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button onClick={handleSkipSecurityQuestions} sx={{ color: 'red', borderColor: 'red' }}>
                Skip
              </Button>
            </DialogActions>
          </Dialog>
        </>
        )}
          <Stack>
            {loading ? (
              <Button variant="contained" color="primary" disabled>
                <CircularProgress size={24} />
                Loading...
              </Button>
            ) : (
              <Button type="submit" variant="contained" color="primary">Register</Button>
            )}
          </Stack>
        </Stack>
      </form>
      {errorMessage && <Floater message={errorMessage} type="error" />}
    </Box>
  );
}