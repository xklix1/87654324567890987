import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/user';
import { AuthService, LoginDto, RegisterDto } from '../services/auth-and-sync.service';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (dto: LoginDto) => Promise<UserProfile>;
  register: (dto: RegisterDto) => Promise<UserProfile>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => AuthService.getStoredToken());
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (token) {
      AuthService.setStoredToken(token);
    } else {
      AuthService.clearStoredToken();
    }
  }, [token]);

  const setToken = (newToken: string | null): void => {
    setTokenState(newToken);
  };

  const login = async (dto: LoginDto): Promise<UserProfile> => {
    const payload = await AuthService.login(dto);
    setTokenState(payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const register = async (dto: RegisterDto): Promise<UserProfile> => {
    const payload = await AuthService.register(dto);
    setTokenState(payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const logout = (): void => {
    setTokenState(null);
    setUser(null);
    AuthService.clearStoredToken();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
