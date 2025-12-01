
import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { Profile, Tenant } from '../types.ts';
import AuthContext, { Session, User } from './AuthContext.ts';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout: If Supabase fails to respond in 6 seconds, force stop loading.
        const timer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth check timed out. Forcing app load.");
                setLoading(false);
            }
        }, 6000);

        const fetchUserData = async (currentSession: Session | null) => {
            try {
                if (!currentSession?.user) {
                    if (mounted) {
                        setSession(null);
                        setUser(null);
                        setProfile(null);
                        setTenant(null);
                        setLoading(false);
                    }
                    return;
                }

                // 1. Intentar cargar el Perfil
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .maybeSingle();

                // CORRECCIÓN CRÍTICA: Detectar "Sesión Zombi"
                // Si Auth tiene sesión, pero la DB no devuelve perfil (null), el estado es inválido.
                // Forzamos el cierre de sesión para que el usuario no vea una pantalla rota/vacía.
                if (!profileData) {
                    console.warn("Sesión válida encontrada, pero el perfil no existe. Cerrando sesión...");
                    await supabase.auth.signOut();
                    if (mounted) {
                        setSession(null);
                        setUser(null);
                        setProfile(null);
                        setTenant(null);
                        setLoading(false);
                    }
                    return;
                }

                if (mounted) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                    setProfile(profileData as Profile);
                }

                // 2. Cargar Tenant (si existe perfil y tiene tenant_id)
                if (profileData && profileData.tenant_id) {
                    const { data: tData } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('id', profileData.tenant_id)
                        .maybeSingle();
                    
                    if (mounted && tData) {
                        setTenant(tData as Tenant);
                    }
                }

            } catch (error) {
                console.error("Error crítico en autenticación:", error);
                // En caso de error de red grave, cerramos sesión por seguridad de UI
                if (mounted) {
                    setSession(null); 
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Inicialización
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserData(session);
        });

        // Suscripción a cambios de Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
                fetchUserData(session);
            } else if (_event === 'SIGNED_OUT') {
                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setTenant(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const isReadOnly = useMemo(() => {
        if (!tenant) return false;
        if (tenant.status === 'suspended') return true;
        if (tenant.subscription_end_date) {
            const today = new Date().toISOString().split('T')[0];
            return today > tenant.subscription_end_date;
        }
        return false;
    }, [tenant]);

    const value = useMemo(() => ({
        session,
        user,
        profile,
        tenant,
        isReadOnly,
        loading,
        signOut: async () => {
            // Limpieza optimista inmediata
            setSession(null);
            setUser(null);
            setProfile(null);
            setTenant(null);
            return await supabase.auth.signOut();
        },
    }), [session, user, profile, tenant, isReadOnly, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
