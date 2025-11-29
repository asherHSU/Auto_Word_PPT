import React, { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import SongManager from './components/SongManager';
import FileGenerator from './components/FileGenerator'; // Import FileGenerator

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for token in localStorage on initial load
    const storedToken = localStorage.getItem('jwtToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('jwtToken', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('jwtToken');
  };

  return (
    <div className="App">
      <div>
        <h1>Auto PPT Word App</h1>
        {token ? (
          <div>
            <p>Welcome, you are logged in!</p>
            <button onClick={handleLogout}>Logout</button>
            <SongManager token={token} />
            <FileGenerator token={token} /> {/* Render FileGenerator when logged in */}
          </div>
        ) : (
          <div>
            <p>Please Register or Login</p>
            <Register />
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;