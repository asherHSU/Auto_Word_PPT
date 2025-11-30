import React, { useState, useEffect } from 'react';
import {
  Box, Paper, TextField, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Button, Typography, InputAdornment, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress, ListItemButton, Stack, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DownloadIcon from '@mui/icons-material/Download';

interface SongData {
  title: string;
  lyrics: string[];
}

interface Song {
  id: number;
  name: string;
}

const FileGenerator: React.FC<{ token: string | null }> = ({ token }) => {
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${API_URL}/api/songs?limit=2000`)
      .then(res => res.json())
      .then(data => setAllSongs(data.data));
  }, []);

  const handleAddSong = (song: Song) => {
    if (!selectedSongs.find(s => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleRemoveSong = (id: number) => {
    setSelectedSongs(selectedSongs.filter(s => s.id !== id));
  };

  const handlePreview = async () => {
    if (selectedSongs.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: selectedSongs }) 
      });
      const data = await response.json();
      setPreviewData(data);
      setIsPreviewing(true);
    } catch (e) {
      alert('預覽失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleLyricsChange = (index: number, newText: string) => {
    const updated = [...previewData];
    updated[index].lyrics = newText.split('\n');
    setPreviewData(updated);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songData: previewData })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'presentation_files.zip';
        a.click();
        setIsPreviewing(false);
        setSelectedSongs([]);
      } else {
        alert('生成失敗');
      }
    } catch (e) {
      alert('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = allSongs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    // 🛠️ 修改 1: 設定整體高度為螢幕高度的 75%，讓區塊變大變滿
    <Box sx={{ height: '75vh' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ height: '100%' }}>
        
        {/* 左側：搜尋與選擇 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 3, 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              bgcolor: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary" sx={{ borderBottom: '2px solid #3498db', pb: 1, mb: 2, display: 'inline-block', width: 'fit-content' }}>
              1. 搜尋詩歌庫
            </Typography>
            <TextField
              fullWidth
              placeholder="輸入歌名搜尋..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="medium" /></InputAdornment>,
                style: { fontSize: '1.1rem' } 
              }}
              sx={{ mb: 2 }}
            />
            
            {/* 🛠️ 修改 2: 移除 maxHeight，讓列表自動填滿剩餘空間 (flexGrow: 1) */}
            <List sx={{ flexGrow: 1, overflow: 'auto', border: '1px solid #eee', borderRadius: 2, bgcolor: '#fafafa' }}>
              {filteredSongs.slice(0, 100).map(song => {
                const isSelected = selectedSongs.some(s => s.id === song.id);
                return (
                  <ListItem 
                    key={song.id} 
                    disablePadding 
                    divider
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleAddSong(song)} disabled={isSelected} color="primary" size="large">
                        <AddCircleOutlineIcon fontSize="inherit" />
                      </IconButton>
                    }
                    sx={{ bgcolor: isSelected ? '#e3f2fd' : 'transparent' }}
                  >
                    <ListItemButton 
                      onClick={() => !isSelected && handleAddSong(song)}
                      disabled={isSelected}
                      sx={{ py: 1.5 }} 
                    >
                      <ListItemText 
                        primary={`${song.id}. ${song.name}`} 
                        primaryTypographyProps={{ fontSize: '1.1rem', fontWeight: 500 }} 
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Box>

        {/* 右側：已選清單 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 3, 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              bgcolor: '#fffbf2', 
              borderColor: '#ffe0b2',
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Typography variant="h6" gutterBottom fontWeight="bold" color="secondary" sx={{ borderBottom: '2px solid #e67e22', pb: 1, mb: 2, display: 'inline-block', width: 'fit-content' }}>
              2. 已選清單 (生成順序)
            </Typography>
            
            {/* 🛠️ 修改 3: 移除 maxHeight/minHeight，讓列表自動填滿空間 */}
            <List sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white', borderRadius: 2, border: '1px solid #ffe0b2' }}>
              {selectedSongs.map((song, idx) => (
                <ListItem 
                  key={song.id} 
                  divider 
                  disablePadding
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveSong(song.id)} color="error" size="large">
                      <RemoveCircleOutlineIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                   <ListItemButton sx={{ py: 1.5 }}>
                      <ListItemText 
                        primary={`${idx + 1}. ${song.name}`} 
                        primaryTypographyProps={{ fontSize: '1.1rem', fontWeight: 500 }}
                      />
                   </ListItemButton>
                </ListItem>
              ))}
              {selectedSongs.length === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary', opacity: 0.6 }}>
                  <PlaylistAddCheckIcon sx={{ fontSize: 60, mb: 1 }} />
                  <Typography variant="h6">尚未選擇詩歌</Typography>
                </Box>
              )}
            </List>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button 
                variant="contained" 
                color="secondary"
                size="large" 
                fullWidth
                startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <PlaylistAddCheckIcon fontSize="large" />}
                onClick={handlePreview}
                disabled={loading || selectedSongs.length === 0}
                sx={{ py: 1.5, borderRadius: 2, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 2 }}
                >
                {loading ? '處理中...' : '下一步：預覽與編輯'}
                </Button>
            </Box>
          </Paper>
        </Box>
      </Stack>

      {/* Preview Dialog - 加大字體與編輯區 */}
      <Dialog 
        open={isPreviewing} 
        onClose={() => setIsPreviewing(false)} 
        maxWidth="xl" // 加寬 Dialog
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa', py: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
                <Typography variant="h5" component="div" fontWeight="bold">📝 預覽與編輯歌詞</Typography>
                <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    提示：此處修改僅影響本次生成，不會覆蓋資料庫原始檔案。
                </Typography>
            </Box>
            <Button onClick={() => setIsPreviewing(false)} color="inherit" variant="outlined">取消</Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#f5f5f5', p: 3 }}>
          <Stack direction="row" flexWrap="wrap" gap={3} justifyContent="center">
            {previewData.map((data, idx) => (
              <Box key={idx} sx={{ flex: '1 1 350px', maxWidth: '600px', minWidth: '350px' }}> {/* 卡片變寬 */}
                <Paper sx={{ p: 2, height: '100%', bgcolor: 'white', color: 'text.primary', borderRadius: 2, boxShadow: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ borderBottom: '1px dashed #ccc', pb: 1, mb: 2 }}>
                    {idx + 1}. {data.title}
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={10} // 增加行數
                    maxRows={15}
                    value={data.lyrics.join('\n')}
                    onChange={(e) => handleLyricsChange(idx, e.target.value)}
                    variant="outlined"
                    sx={{ 
                        bgcolor: '#fafafa',
                        '& .MuiInputBase-input': { 
                            fontSize: '1.1rem', // 編輯區字體加大
                            lineHeight: 1.6,
                            fontFamily: 'monospace'
                        }
                    }}
                  />
                </Paper>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#fafafa', borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleGenerate} 
            variant="contained" 
            color="secondary" 
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            disabled={loading}
            sx={{ px: 4, py: 1.2, fontSize: '1.1rem', borderRadius: 2 }}
          >
            {loading ? '打包中...' : '確認並下載'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileGenerator;