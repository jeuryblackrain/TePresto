import { createContext } from 'react';
// FIX: Define Supabase auth types locally to support older versions of @supabase/supabase-js
// where these are not exported from the main package.
// import { Session, User, AuthError } from '@supabase/supabase-js';
import { Profile, Tenant } from '../types.ts';

export interface User {
    id: string;
    email?: string;
    [key: string]: any;
}

export interface Session {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: User;
}

export interface AuthError {
    name: string;
    message: string;
    status: number;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    tenant: Tenant | null;
    isReadOnly: boolean;
    loading: boolean;
    signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;