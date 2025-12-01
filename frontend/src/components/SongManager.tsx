import React, { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, IconButton, Chip, Pagination,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Typography, Stack, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface Song {
  id: number;
  name: string;
  hasFile: boolean;
}

interface SongManagerProps {
  token: string | null;
}

const SongManager: React.FC<SongManagerProps> = ({ token }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [limit] = useState(100);

  const [openDialog, setOpenDialog] = useState(false);
  const [currentSong, setCurrentSong] = useState<Partial<Song>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchSongs = async () => {
    try {
      const query = `?page=${page}&limit=${limit}&name=${searchTerm}`;
      const response = await fetch(`${API_URL}/api/songs${query}`);
      const data = await response.json();
      if (response.ok) {
        setSongs(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [page, searchTerm, limit]); 

  const handleOpenDialog = (song?: Song) => {
    if (song) {
      setCurrentSong(song);
    } else {
      setCurrentSong({});
    }
    setUploadFile(null);
    setMessage(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveSong = async () => {
    if (!token) return;
    if (!currentSong.name) {
      setMessage({ type: 'error', text: '歌名不能為空' });
      return;
    }

    try {
      // 1. Upload File
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!uploadRes.ok) throw new Error('檔案上傳失敗');
      }

      // 2. Save Data
      const url = currentSong.id 
        ? `${API_URL}/api/songs/${currentSong.id}`
        : `${API_URL}/api/songs`;
      
      const method = currentSong.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: currentSong.name })
      });

      if (res.ok) {
        handleCloseDialog();
        fetchSongs();
      } else {
        setMessage({ type: 'error', text: '儲存失敗' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '操作失敗' });
    }
  };

  const handleDelete = async (id: number) => {
    if(!window.confirm('確定刪除？')) return;
    try {
      await fetch(`${API_URL}/api/songs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSongs();
    } catch(e) { console.error(e); }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="center">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="搜尋歌名..."
          size="small"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        {token && (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ minWidth: 120 }}
          >
            新增
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }} aria-label="song table">
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell width={80} align="center">ID</TableCell>
              <TableCell>歌名</TableCell>
              <TableCell width={150} align="center">檔案狀態</TableCell>
              {token && <TableCell width={120} align="center">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {songs.map((song) => (
              <TableRow key={song.id} hover>
                <TableCell align="center">{song.id}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{song.name}</TableCell>
                <TableCell align="center">
                  {song.hasFile ? (
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="正常" 
                      color="success" 
                      size="small" 
                      variant="outlined" 
                    />
                  ) : (
                    <Chip 
                      icon={<ErrorIcon />} 
                      label="缺檔" 
                      color="error" 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </TableCell>
                {token && (
                  <TableCell align="center">
                    <Tooltip title="編輯">
                      <IconButton color="primary" onClick={() => handleOpenDialog(song)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="刪除">
                      <IconButton color="error" onClick={() => handleDelete(song.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {songs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">沒有找到相關詩歌</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination 
          count={totalPages} 
          page={page} 
          // 🛠️ 修正：將 e 改為 _，表示忽略事件參數
          onChange={(_, v) => setPage(v)} 
          color="primary" 
          showFirstButton 
          showLastButton 
          sx={{
            '& li': {
              backgroundColor: 'transparent !important',
              padding: '0 !important',
              margin: '0 !important',
              border: 'none !important',
              borderRadius: '0 !important',
              display: 'block !important', 
            }
          }}
        />
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle>{currentSong.id ? '編輯詩歌' : '新增詩歌'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="歌名"
            type="text"
            fullWidth
            variant="outlined"
            value={currentSong.name || ''}
            onChange={e => setCurrentSong({...currentSong, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            fullWidth
            sx={{ mb: 1 }}
          >
            {uploadFile ? uploadFile.name : '上傳 PPTX (選填)'}
            <input
              type="file"
              hidden
              accept=".pptx"
              onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
            />
          </Button>
          <Typography variant="caption" color="text.secondary">
            * 系統會根據檔案名稱自動關聯
          </Typography>
          {message && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {message.text}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">取消</Button>
          <Button onClick={handleSaveSong} variant="contained">儲存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SongManager;