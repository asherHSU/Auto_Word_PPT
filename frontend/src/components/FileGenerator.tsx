import React, { useState, useEffect } from 'react';

interface Song {
  id: number;
  name: string;
}

interface FileGeneratorProps {
  token: string | null;
}

const FileGenerator: React.FC<FileGeneratorProps> = ({ token }) => {
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_SONGS_URL = `${process.env.VITE_API_URL}/api/songs`;
  const API_GENERATE_URL = `${process.env.VITE_API_URL}/api/generate`;

  useEffect(() => {
    const fetchAvailableSongs = async () => {
      try {
        const response = await fetch(API_SONGS_URL);
        const data = await response.json();
        if (response.ok) {
          setAvailableSongs(data);
        } else {
          setMessage(data.message || 'Failed to fetch available songs.');
        }
      } catch (error) {
        setMessage('Network error. Failed to fetch available songs.');
        console.error('Fetch available songs error:', error);
      }
    };
    fetchAvailableSongs();
  }, []);

  const handleCheckboxChange = (songId: number) => {
    setSelectedSongIds((prevSelected) =>
      prevSelected.includes(songId)
        ? prevSelected.filter((id) => id !== songId)
        : [...prevSelected, songId]
    );
  };

  const handleGenerateFiles = async () => {
    if (!token) {
      setMessage('You must be logged in to generate files.');
      return;
    }
    if (selectedSongIds.length === 0) {
      setMessage('Please select at least one song to generate files.');
      return;
    }

    setIsLoading(true);
    setMessage('Generating files...');

    try {
      const songsToGenerate = selectedSongIds.map(
        (id) => availableSongs.find((song) => song.id === id)?.name || ''
      ).filter(name => name !== ''); // Get names of selected songs

      const response = await fetch(API_GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ songs: songsToGenerate }),
      });

      if (response.ok) {
        // Assuming the backend sends back a file stream
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'presentation_files.zip'; // Filename from backend
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMessage('Files generated and downloaded successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to generate files.');
      }
    } catch (error) {
      setMessage('Network error. Failed to generate files.');
      console.error('Generate files error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>File Generator</h2>
      {message && <p>{message}</p>}

      <h3>Select Songs:</h3>
      {isLoading && <p>Loading...</p>}
      {!isLoading && availableSongs.length === 0 && <p>No songs available. Please add some first.</p>}
      {!isLoading && availableSongs.length > 0 && (
        <ul>
          {availableSongs.map((song) => (
            <li key={song.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedSongIds.includes(song.id)}
                  onChange={() => handleCheckboxChange(song.id)}
                />
                {song.name} (ID: {song.id})
              </label>
            </li>
          ))}
        </ul>
      )}

      <button onClick={handleGenerateFiles} disabled={isLoading || selectedSongIds.length === 0}>
        {isLoading ? 'Generating...' : 'Generate Files'}
      </button>
    </div>
  );
};

export default FileGenerator;