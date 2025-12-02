import React, { useState, useEffect } from 'react';
import {
  Box, Paper, TextField, List, ListItem, ListItemText, 
  IconButton, Button, Typography, InputAdornment, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress, ListItemButton, Stack, ListItemIcon,
  Tabs, Tab, useMediaQuery, useTheme, Badge
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DownloadIcon from '@mui/icons-material/Download';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface SongData {
  title: string;
  lyrics: string[];
}

interface Song {
  id: number;
  name: string;
}

const FileGenerator: React.FC<{ token: string | null }> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 偵測手機/平板模式

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState(0); // 0: 搜尋, 1: 已選清單

  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${API_URL}/api/songs?limit=2000`)
      .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.data)) {
            setAllSongs(data.data);
        } else {
            console.warn("API returned unexpected format:", data);
            setAllSongs([]);
        }
      })
      .catch(error => {
        console.error("Failed to fetch songs:", error);
        setAllSongs([]); 
      });
  }, []);

  const handleAddSong = (song: Song) => {
    if (!selectedSongs.find(s => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleRemoveSong = (id: number) => {
    setSelectedSongs(selectedSongs.filter(s => s.id !== id));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(selectedSongs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedSongs(items);
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

  const safeSongs = Array.isArray(allSongs) ? allSongs : [];
  const filteredSongs = safeSongs.filter(s => 
    s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* 📱 手機版分頁切換 (僅在手機模式顯示) */}
      {isMobile && (
        <Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={mobileTab} 
            onChange={(_, v) => setMobileTab(v)} 
            variant="fullWidth"
            indicatorColor="secondary"
            textColor="secondary"
          >
            <Tab icon={<SearchIcon />} label="1. 搜尋詩歌" />
            <Tab 
              icon={
                <Badge badgeContent={selectedSongs.length} color="error" max={99}>
                  <PlaylistAddCheckIcon />
                </Badge>
              } 
              label="2. 已選清單" 
            />
          </Tabs>
        </Paper>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
        
        {/* -------------------- 左側：搜尋區塊 -------------------- */}
        {/* 在手機版，只有當 mobileTab 為 0 時顯示 */}
        {(!isMobile || mobileTab === 0) && (
          <Box sx={{ 
            width: { xs: '100%', md: '360px' }, 
            flex: { xs: 1, md: 'none' }, // 手機版佔滿，桌面版固定寬度
            flexShrink: 0, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: { xs: 2, md: 3 }, 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                bgcolor: '#ffffff',
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}
            >
              {!isMobile && ( // 桌面版才顯示標題，手機版已有 Tab
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary" sx={{ borderBottom: '2px solid #3498db', pb: 1, mb: 2, display: 'inline-block', width: 'fit-content' }}>
                  1. 搜尋詩歌庫
                </Typography>
              )}
              
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
        )}

        {/* -------------------- 右側：已選區塊 -------------------- */}
        {/* 在手機版，只有當 mobileTab 為 1 時顯示 */}
        {(!isMobile || mobileTab === 1) && (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: { xs: 2, md: 3 }, 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: '#fffbf2', 
                borderColor: '#ffe0b2',
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}
            >
              {!isMobile && (
                <Typography variant="h6" gutterBottom fontWeight="bold" color="secondary" sx={{ borderBottom: '2px solid #e67e22', pb: 1, mb: 2, display: 'inline-block', width: 'fit-content' }}>
                  2. 已選清單 (拖移調整順序)
                </Typography>
              )}
              
              {enabled && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="selected-songs">
                    {(provided) => (
                      <List 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'white', borderRadius: 2, border: '1px solid #ffe0b2' }}
                      >
                        {selectedSongs.map((song, idx) => (
                          <Draggable key={song.id} draggableId={String(song.id)} index={idx}>
                            {(provided, snapshot) => (
                              <ListItem 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                divider 
                                disablePadding
                                secondaryAction={
                                  <IconButton edge="end" onClick={() => handleRemoveSong(song.id)} color="error" size="large">
                                    <RemoveCircleOutlineIcon fontSize="inherit" />
                                  </IconButton>
                                }
                                sx={{ 
                                  bgcolor: snapshot.isDragging ? '#fff3e0' : 'white', 
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <ListItemButton sx={{ py: 1.5 }} disableRipple>
                                  <ListItemIcon 
                                    {...provided.dragHandleProps} 
                                    sx={{ minWidth: 36, cursor: 'grab', color: '#ccc', '&:hover': { color: '#666' } }}
                                  >
                                    <DragIndicatorIcon />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={`${idx + 1}. ${song.name}`} 
                                    primaryTypographyProps={{ fontSize: '1.1rem', fontWeight: 500 }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {selectedSongs.length === 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary', opacity: 0.6, minHeight: 300 }}>
                            <PlaylistAddCheckIcon sx={{ fontSize: 60, mb: 1 }} />
                            <Typography variant="h6">尚未選擇詩歌</Typography>
                          </Box>
                        )}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

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
        )}
      </Stack>

      <Dialog 
        open={isPreviewing} 
        onClose={() => setIsPreviewing(false)} 
        fullScreen={isMobile} // 手機版全螢幕顯示預覽
        maxWidth="xl" 
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa', py: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
                <Typography variant="h5" component="div" fontWeight="bold">📝 預覽與編輯歌詞</Typography>
                <Typography variant="body2" color="error" sx={{ mt: 0.5, display: { xs: 'none', sm: 'block' } }}>
                    提示：此處修改僅影響本次生成，不會覆蓋資料庫原始檔案。
                </Typography>
            </Box>
            <Button onClick={() => setIsPreviewing(false)} color="inherit" variant="outlined">取消</Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#f5f5f5', p: { xs: 1, md: 3 } }}>
          <Stack direction="row" flexWrap="wrap" gap={3} justifyContent="center">
            {previewData.map((data, idx) => (
              <Box key={idx} sx={{ flex: '1 1 350px', maxWidth: '600px', minWidth: '300px' }}>
                <Paper sx={{ p: 2, height: '100%', bgcolor: 'white', color: 'text.primary', borderRadius: 2, boxShadow: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ borderBottom: '1px dashed #ccc', pb: 1, mb: 2 }}>
                    {idx + 1}. {data.title}
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={10} 
                    maxRows={15}
                    value={data.lyrics.join('\n')}
                    onChange={(e) => handleLyricsChange(idx, e.target.value)}
                    variant="outlined"
                    sx={{ 
                        bgcolor: '#fafafa',
                        '& .MuiInputBase-input': { 
                            fontSize: '1.1rem',
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
            fullWidth={isMobile}
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