import loginImage from 'figma:asset/11e423d80e5ce28fde4173da3dcb80d9f7d0c8fe.png';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
      {/* Login Button - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={onLogin}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Login
        </button>
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