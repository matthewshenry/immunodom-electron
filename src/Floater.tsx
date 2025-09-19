import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { keyframes } from '@emotion/react';

const floatIn = keyframes`
  0% {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, 0);
    opacity: 1;
  }
`;

const floatOut = keyframes`
  0% {
    transform: translate(-50%, 20%);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
`;

interface FloaterProps {
  message: React.ReactNode | null;
  type: 'success' | 'error';
}


const Floater: React.FC<FloaterProps> = ({ message, type }) => {
  const [visible, setVisible] = useState(false);
  const [animation, setAnimation] = useState(floatIn);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setAnimation(floatIn);
      const timer = setTimeout(() => {
        setAnimation(floatOut);
        setTimeout(() => setVisible(false), 500);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [message, type]);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: type === 'success' ? 'green' : 'red',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '4px',
        animation: `${animation} 0.5s ease-out`,
        zIndex: 1000,
      }}
    >
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
};

export default Floater;