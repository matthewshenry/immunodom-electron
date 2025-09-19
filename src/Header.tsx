import React, { useState } from 'react';
import { Button, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import './App.css';

const Header: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (isLoggedIn) {
      setAnchorEl(event.currentTarget);
    } else {
      handleNavigation('/loginregister');
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 2,
        backgroundColor: '#f7f7f7',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 2 }}>
        <Box className="nav">
          <Button onClick={() => handleNavigation('/mhci')} className="nav-button">
            MHC-I
          </Button>
          <Button onClick={() => handleNavigation('/mhcii')} className="nav-button">
            MHC-II
          </Button>
          {isLoggedIn && (
            <Button onClick={() => handleNavigation('/savedsearches')} className="nav-button">
              Saved Searches
            </Button>
          )}
          <Button onClick={() => handleNavigation('/about')} className="nav-button">
            About
          </Button>
        </Box>
      </Box>
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton onClick={handleMenuOpen}>
          <AccountCircleIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { handleNavigation('/reset-password'); handleMenuClose(); }}>Change Password</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Header;