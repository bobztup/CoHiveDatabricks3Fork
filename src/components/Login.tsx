import { useState } from 'react';
import loginImage from 'figma:asset/11e423d80e5ce28fde4173da3dcb80d9f7d0c8fe.png';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Password can be set via environment variable or defaults to 'cohive2024'
  const CORRECT_PASSWORD = import.meta.env.VITE_COHIVE_PASSWORD || 'cohive2024';

  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      setError('');
      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
      {/* Login Section - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        {!showPasswordInput ? (
          <button
            onClick={() => setShowPasswordInput(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Login
          </button>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-purple-600">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Enter Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Password"
                autoFocus
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowPasswordInput(false);
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Large Logo - Center */}
      <div className="flex items-center justify-center">
        <img 
          src={loginImage} 
          alt="CoHive - Insight into Inspiration" 
          className="max-w-4xl w-full h-auto"
        />
      </div>
    </div>
  );
}