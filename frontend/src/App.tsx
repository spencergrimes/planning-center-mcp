import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { Chat } from './components/Chat';
import { Login } from './components/Login';
import { Register } from './components/Register';

function App() {
  const { user, checkAuth } = useAuthStore();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated on app load
    checkAuth();
  }, [checkAuth]);

  // If user is authenticated, show chat interface
  if (user) {
    return <Chat />;
  }

  // Otherwise show authentication forms
  return (
    <>
      {showRegister ? (
        <Register onShowLogin={() => setShowRegister(false)} />
      ) : (
        <Login onShowRegister={() => setShowRegister(true)} />
      )}
    </>
  );
}

export default App;
