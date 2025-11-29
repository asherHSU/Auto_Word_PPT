import React, { useState, useEffect } from 'react';

interface Song {
  id: number;
  name: string;
}

interface SongManagerProps {
  token: string | null;
}

const SongManager: React.FC<SongManagerProps> = ({ token }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSongName, setNewSongName] = useState('');
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [message, setMessage] = useState('');

  const API_BASE_URL = `${process.env.VITE_API_URL}/api/songs`;

  const fetchSongs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?name=${searchTerm}`);
      const data = await response.json();
      if (response.ok) {
        setSongs(data);
      } else {
        setMessage(data.message || 'Failed to fetch songs.');
      }
    } catch (error) {
      setMessage('Network error. Failed to fetch songs.');
      console.error('Fetch songs error:', error);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [searchTerm]); // Refetch when search term changes

  const handleAddSong = async () => {
    if (!newSongName.trim()) {
      setMessage('Song name cannot be empty.');
      return;
    }
    if (!token) {
      setMessage('You must be logged in to add a song.');
      return;
    }
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSongName }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Song added successfully!');
        setNewSongName('');
        fetchSongs(); // Refresh list
      } else {
        setMessage(data.message || 'Failed to add song.');
      }
    } catch (error) {
      setMessage('Network error. Failed to add song.');
      console.error('Add song error:', error);
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setNewSongName(song.name); // Populate input with current name
  };

  const handleUpdateSong = async () => {
    if (!editingSong || !newSongName.trim()) {
      setMessage('Song name cannot be empty.');
      return;
    }
    if (!token) {
      setMessage('You must be logged in to update a song.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/${editingSong.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSongName }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Song updated successfully!');
        setEditingSong(null);
        setNewSongName('');
        fetchSongs(); // Refresh list
      } else {
        setMessage(data.message || 'Failed to update song.');
      }
    } catch (error) {
      setMessage('Network error. Failed to update song.');
      console.error('Update song error:', error);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!window.confirm('Are you sure you want to delete this song?')) {
      return;
    }
    if (!token) {
      setMessage('You must be logged in to delete a song.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setMessage('Song deleted successfully!');
        fetchSongs(); // Refresh list
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to delete song.');
      }
    } catch (error) {
      setMessage('Network error. Failed to delete song.');
      console.error('Delete song error:', error);
    }
  };

  return (
    <div>
      <h2>Song Management</h2>
      {message && <p>{message}</p>}

      <div>
        <h3>Search Songs</h3>
        <input
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => fetchSongs()}>Search</button>
      </div>

      <div>
        <h3>{editingSong ? 'Edit Song' : 'Add New Song'}</h3>
        <input
          type="text"
          placeholder="Song Name"
          value={newSongName}
          onChange={(e) => setNewSongName(e.target.value)}
        />
        {editingSong ? (
          <>
            <button onClick={handleUpdateSong}>Update Song</button>
            <button onClick={() => { setEditingSong(null); setNewSongName(''); }}>Cancel</button>
          </>
        ) : (
          <button onClick={handleAddSong}>Add Song</button>
        )}
      </div>

      <h3>Song List</h3>
      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            {song.name} (ID: {song.id})
            <button onClick={() => handleEditSong(song)}>Edit</button>
            <button onClick={() => handleDeleteSong(song.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SongManager;