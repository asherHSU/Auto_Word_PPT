import React, { useState, useEffect } from 'react';
import { 
  CssBaseline, 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  createTheme, 
  ThemeProvider,
  Paper,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Container
} from '@mui/material';
import Login from './components/Login';
import Register from './components/Register'; 
import SongManager from './components/SongManager';
import FileGenerator from './components/FileGenerator';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import QueueMusicIcon from '@mui/icons-material/QueueMusic'; // Icon for Generator
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'; // Icon for Database
import MenuIcon from '@mui/icons-material/Menu'; // Icon for mobile menu

// 🎨 自定義主題：放大字體與調整配色
const theme = createTheme({
  palette: {
    primary: {
      main: '#2c3e50', //以此色系為主，較為沈穩專業
    },
    secondary: {
      main: '#e67e22',
    },
    background: {
      default: '#ecf0f1', 
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Microsoft JhengHei", "Roboto", "Helvetica", "Arial", sans-serif',
    // 全局字體稍微放大
    fontSize: 16, 
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    button: {
      fontSize: '1rem',
    }
  },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#34495e',
            color: 'white',
            '& .MuiListItemIcon-root': {
              color: 'white',
            },
            '&:hover': {
              backgroundColor: '#2c3e50',
            },
          },
        },
      },
    },
  },
});

const drawerWidth = 280; // 側邊欄寬度

function App() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: Login, 1: Register
  const [currentPage, setCurrentPage] = useState<'generator' | 'database'>('generator'); // 控制主頁面內容

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) setAdminToken(storedToken);
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('adminToken', token);
    setShowLogin(false);
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('adminToken');
  };

  const handleAuthTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // 側邊欄內容
  const drawerContent = (
    <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Typography variant="h5" noWrap component="div" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <MusicNoteIcon sx={{ mr: 1, fontSize: 32 }} />
          Auto PPT
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2, py: 2 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton 
            selected={currentPage === 'generator'}
            onClick={() => setCurrentPage('generator')}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon>
              <QueueMusicIcon />
            </ListItemIcon>
            <ListItemText primary="製作敬拜檔案" primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentPage === 'database'}
            onClick={() => setCurrentPage('database')}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon>
              <LibraryMusicIcon />
            </ListItemIcon>
            <ListItemText primary="詩歌資料庫" primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Box sx={{ flexGrow: 1 }} /> {/* Spacer to push bottom items */}
      
      {/* 底部登入/登出區塊 */}
      <Divider />
      <Box sx={{ p: 2 }}>
        {adminToken ? (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', border: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'success.main' }}>
              <AdminPanelSettingsIcon sx={{ mr: 1 }} />
              <Typography variant="body1" fontWeight="bold">管理員已登入</Typography>
            </Box>
            <Button 
              fullWidth 
              variant="contained" 
              color="error" 
              startIcon={<ExitToAppIcon />}
              onClick={handleLogout}
            >
              登出
            </Button>
          </Paper>
        ) : (
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => setShowLogin(true)}
            sx={{ py: 1.5 }}
          >
            管理員登入
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        
        {/* 側邊欄 (Drawer) */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid rgba(0,0,0,0.08)' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* 主內容區塊 */}
        <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#f4f6f8', width:'100%', height: '100%', overflow: 'auto' }}>
          
          {/* 登入視窗 (Modal 覆蓋) */}
          {showLogin && !adminToken ? (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
              <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                   <Tabs value={currentTab} onChange={handleAuthTabChange} centered variant="fullWidth" sx={{ width: '100%' }}>
                      <Tab label="登入" sx={{ fontSize: '1.1rem' }} />
                      <Tab label="註冊" sx={{ fontSize: '1.1rem' }} />
                   </Tabs>
                </Box>
                {currentTab === 0 ? (
                   <Login onLoginSuccess={handleLoginSuccess} />
                ) : (
                   <Register />
                )}
                <Button fullWidth onClick={() => setShowLogin(false)} sx={{ mt: 2 }} color="inherit">
                  暫不登入
                </Button>
              </Paper>
            </Container>
          ) : (
            // 實際功能頁面
            <Box sx={{ maxWidth: '1600px', margin: '0 auto' }}> {/* 限制最大寬度以免在大螢幕太散 */}
              {currentPage === 'generator' && (
                <Box>
                  <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#2c3e50' }}>
                    製作敬拜檔案
                  </Typography>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e0e0e0' }}>
                    <FileGenerator token={adminToken} />
                  </Paper>
                </Box>
              )}

              {currentPage === 'database' && (
                <Box>
                  <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#2c3e50' }}>
                    詩歌資料庫
                  </Typography>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e0e0e0' }}>
                    <SongManager token={adminToken} />
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;