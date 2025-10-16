import React, { useState, useEffect, ReactNode, useMemo } from 'react';
// import { Session, User } from '@supabase/supabase-js'; // FIX: Removed due to type export issues in older versions.
import { supabase } from '../lib/supabaseClient.ts';
import { Profile } from '../types.ts';
import AuthContext, { Session, User } from './AuthContext.ts';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChange is called upon subscription with the current session.
        // This handles both initial load and subsequent changes.
        // FIX: Adjusted destructuring for `onAuthStateChange` to match Supabase v2 API, which returns { data: { subscription } }.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUser.id)
                        .single();
                    
                    if (error) {
                        console.error("Error fetching profile:", error);
                        setProfile(null);
                    } else {
                        setProfile(data as Profile);
                    }
                } else {
                    setProfile(null);
                }
                // The first time this callback runs, the initial state is determined.
                setLoading(false);
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, []); // Using an empty dependency array is crucial to prevent re-subscribing.

    const value = useMemo(() => ({
        session,
        user,
        profile,
        // FIX: `signOut` exists in v1, the error was likely due to type mismatches. No change needed here.
        signOut: () => supabase.auth.signOut(),
    }), [session, user, profile]);

    // Render children only after the initial session load is complete
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
