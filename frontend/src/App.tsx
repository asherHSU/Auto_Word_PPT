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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Container,
  IconButton,
  Tooltip,
  AppBar,
  useMediaQuery,
  Drawer as MuiDrawer
} from '@mui/material';
import { styled, Theme, CSSObject, useTheme } from '@mui/material/styles';
// Icons
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import QueueMusicIcon from '@mui/icons-material/QueueMusic'; 
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic'; 
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';

// Components
import Login from './components/Login';
import Register from './components/Register'; 
import SongManager from './components/SongManager';
import FileGenerator from './components/FileGenerator';

const drawerWidth = 280;

// 🎨 定義主題
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

// 🛠️ 桌面版 Drawer 的樣式 Mixins
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

// 自定義 Styled Drawer (僅用於桌面版)
const DesktopDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

// 抽出 Drawer 內容組件，讓手機/桌面共用
const DrawerContent = ({ 
  open, 
  toggleDrawer, 
  currentPage, 
  setCurrentPage, 
  adminToken, 
  setShowLogin, 
  handleLogout,
  isMobile 
}: any) => (
  <Box sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* 標題與切換按鈕 */}
    <Toolbar sx={{ px: [1], justifyContent: open ? 'space-between' : 'center', py: 2 }}>
      {open && (
        <Typography variant="h6" noWrap component="div" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', ml: 1, fontWeight: 'bold' }}>
          <MusicNoteIcon sx={{ mr: 1, fontSize: 28 }} />
          Auto PPT
        </Typography>
      )}
      {/* 手機版抽屜內只顯示關閉按鈕，桌面版顯示切換按鈕 */}
      <IconButton onClick={toggleDrawer}>
        {isMobile ? <ChevronLeftIcon /> : (open ? <ChevronLeftIcon /> : <MenuIcon />)}
      </IconButton>
    </Toolbar>
    
    <Divider />
    
    <List sx={{ px: 1, py: 2 }}>
      <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
        <Tooltip title={open ? "" : "製作敬拜檔案"} placement="right" arrow>
          <ListItemButton 
            selected={currentPage === 'generator'}
            onClick={() => { setCurrentPage('generator'); if(isMobile) toggleDrawer(); }}
            sx={{ 
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              borderRadius: 2,
              px: 2.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : 'auto', justifyContent: 'center' }}>
              <QueueMusicIcon />
            </ListItemIcon>
            <ListItemText primary="製作敬拜檔案" sx={{ opacity: open ? 1 : 0 }} primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </Tooltip>
      </ListItem>

      <ListItem disablePadding sx={{ display: 'block' }}>
        <Tooltip title={open ? "" : "詩歌資料庫"} placement="right" arrow>
          <ListItemButton 
            selected={currentPage === 'database'}
            onClick={() => { setCurrentPage('database'); if(isMobile) toggleDrawer(); }}
            sx={{ 
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              borderRadius: 2,
              px: 2.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : 'auto', justifyContent: 'center' }}>
              <LibraryMusicIcon />
            </ListItemIcon>
            <ListItemText primary="詩歌資料庫" sx={{ opacity: open ? 1 : 0 }} primaryTypographyProps={{ fontSize: '1.1rem' }} />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    </List>
    
    <Box sx={{ flexGrow: 1 }} />
    <Divider />
    
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {adminToken ? (
        open ? (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', border: 'none', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'success.main' }}>
              <AdminPanelSettingsIcon sx={{ mr: 1 }} />
              <Typography variant="body1" fontWeight="bold">管理員已登入</Typography>
            </Box>
            <Button fullWidth variant="contained" color="error" startIcon={<ExitToAppIcon />} onClick={handleLogout}>
              登出
            </Button>
          </Paper>
        ) : (
          <Tooltip title="管理員登出" placement="right">
            <IconButton color="error" onClick={handleLogout}>
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        )
      ) : (
        open ? (
          <Button fullWidth variant="contained" onClick={() => { setShowLogin(true); if(isMobile) toggleDrawer(); }} sx={{ py: 1.5 }}>
            管理員登入
          </Button>
        ) : (
          <Tooltip title="管理員登入" placement="right">
            <IconButton color="primary" onClick={() => { setShowLogin(true); if(isMobile) toggleDrawer(); }}>
              <AdminPanelSettingsIcon />
            </IconButton>
          </Tooltip>
        )
      )}
    </Box>
  </Box>
);

// 內部 Layout 組件，負責響應式邏輯
function DashboardLayout() {
  const theme = useTheme();
  // 斷點設為 md (900px)，小於此寬度視為手機/平板模式
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); 
  const [currentPage, setCurrentPage] = useState<'generator' | 'database'>('generator');
  
  // 狀態管理
  const [desktopOpen, setDesktopOpen] = useState(true); // 桌面版側邊欄
  const [mobileOpen, setMobileOpen] = useState(false);  // 手機版側邊欄

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

  const handleAuthTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <CssBaseline />

      {/* 📱 手機版頂部導航列 (僅在手機模式顯示) */}
      <AppBar 
        position="fixed" 
        sx={{ 
          display: { xs: 'block', md: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 1 
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <MusicNoteIcon sx={{ mr: 1 }} />
            Auto PPT
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, height: '100%', overflow: 'hidden' }}>
        {/* 導航欄區域 */}
        <Box
          component="nav"
          sx={{ width: { md: desktopOpen ? drawerWidth : 65 }, flexShrink: { md: 0 } }}
        >
          {/* 📱 手機版 Drawer (Temporary) */}
          <MuiDrawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }} // 提升手機版開啟效能
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            <DrawerContent 
              open={true} // 手機版打開時總是展開狀態
              toggleDrawer={handleDrawerToggle}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              adminToken={adminToken}
              setShowLogin={setShowLogin}
              handleLogout={handleLogout}
              isMobile={true}
            />
          </MuiDrawer>

          {/* 💻 桌面版 Drawer (Permanent/Mini) */}
          <DesktopDrawer
            variant="permanent"
            open={desktopOpen}
            sx={{
              display: { xs: 'none', md: 'block' },
            }}
          >
            <DrawerContent 
              open={desktopOpen}
              toggleDrawer={handleDrawerToggle}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              adminToken={adminToken}
              setShowLogin={setShowLogin}
              handleLogout={handleLogout}
              isMobile={false}
            />
          </DesktopDrawer>
        </Box>

        {/* 📄 主要內容區域 */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 2, 
            bgcolor: '#f4f6f8', 
            height: '100vh', // 使用 vh 確保填滿
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            width: { xs: '100%', md: `calc(100% - ${desktopOpen ? drawerWidth : 65}px)` },
            mt: { xs: '56px', sm: '64px', md: 0 } // 手機版預留 AppBar 高度
          }}
        >
          {showLogin && !adminToken ? (
            <Container maxWidth="sm" sx={{ mt: { xs: 2, md: 8 }, flex: 1, overflow: 'auto' }}>
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
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {currentPage === 'generator' && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: '#2c3e50', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    製作敬拜檔案
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: { xs: 1, md: 2 }, 
                      borderRadius: 3, 
                      border: '1px solid #e0e0e0',
                      flex: 1, 
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden' 
                    }}
                  >
                    <FileGenerator token={adminToken} />
                  </Paper>
                </Box>
              )}

              {currentPage === 'database' && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: '#2c3e50', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    詩歌資料庫
                  </Typography>
                  <Paper elevation={0} sx={{ p: { xs: 1, md: 3 }, borderRadius: 3, border: '1px solid #e0e0e0' }}>
                    <SongManager token={adminToken} />
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// 主 App 組件提供 Theme Context
function App() {
  return (
    <ThemeProvider theme={theme}>
      <DashboardLayout />
    </ThemeProvider>
  );
}

export default App;