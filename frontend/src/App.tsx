import React, { useState, useEffect } from 'react';
import { 
  CssBaseline, 
  Box, 
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
import QueueMusicIcon from '@mui/icons-material/QueueMusic'; 
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'; 

// 🎨 自定義主題
const theme = createTheme({
  palette: {
    primary: {
      main: '#2c3e50',
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
    fontSize: 16, 
    h5: { fontWeight: 600, fontSize: '1.5rem' },
    h6: { fontWeight: 600, fontSize: '1.25rem' },
    button: { fontSize: '1rem' }
  },
  components: {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#34495e',
            color: 'white',
            '& .MuiListItemIcon-root': { color: 'white' },
            '&:hover': { backgroundColor: '#2c3e50' },
          },
        },
      },
    },
  },
});

const drawerWidth = 280;

function App() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); 
  const [currentPage, setCurrentPage] = useState<'generator' | 'database'>('generator');

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
            <ListItemIcon><QueueMusicIcon /></ListItemIcon>
            <ListItemText primary="製作敬拜檔案" primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            selected={currentPage === 'database'}
            onClick={() => setCurrentPage('database')}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon><LibraryMusicIcon /></ListItemIcon>
            <ListItemText primary="詩歌資料庫" primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        {adminToken ? (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', border: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'success.main' }}>
              <AdminPanelSettingsIcon sx={{ mr: 1 }} />
              <Typography variant="body1" fontWeight="bold">管理員已登入</Typography>
            </Box>
            <Button fullWidth variant="contained" color="error" startIcon={<ExitToAppIcon />} onClick={handleLogout}>
              登出
            </Button>
          </Paper>
        ) : (
          <Button fullWidth variant="contained" onClick={() => setShowLogin(true)} sx={{ py: 1.5 }}>
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

        {/* 🛠️ 主內容區塊修改：padding 縮小，移除 maxWidth */}
        <Box component="main" sx={{ flexGrow: 1, p: 2, bgcolor: '#f4f6f8', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {showLogin && !adminToken ? (
            <Container sx={{ mt: 8, flex: 1, overflow: 'auto' }}>
              <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                   <Tabs value={currentTab} onChange={handleAuthTabChange} centered variant="fullWidth" sx={{ width: '100%' }}>
                      <Tab label="登入" sx={{ fontSize: '1.1rem' }} />
                      <Tab label="註冊" sx={{ fontSize: '1.1rem' }} />
                   </Tabs>
                </Box>
                {currentTab === 0 ? <Login onLoginSuccess={handleLoginSuccess} /> : <Register />}
                <Button fullWidth onClick={() => setShowLogin(false)} sx={{ mt: 2 }} color="inherit">
                  暫不登入
                </Button>
              </Paper>
            </Container>
          ) : (
            // 🛠️ 頁面容器：寬度 100%，高度自動填滿
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {currentPage === 'generator' && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: '#2c3e50' }}>
                    製作敬拜檔案
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, // 縮小內距讓內容更寬
                      borderRadius: 3, 
                      border: '1px solid #e0e0e0',
                      flex: 1, // 自動填滿剩餘高度
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden' // 防止 Paper 本身出現捲軸，交給內部處理
                    }}
                  >
                    <FileGenerator token={adminToken} />
                  </Paper>
                </Box>
              )}

              {currentPage === 'database' && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: '#2c3e50' }}>
                    詩歌資料庫
                  </Typography>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
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