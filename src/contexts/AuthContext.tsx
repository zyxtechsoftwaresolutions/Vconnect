import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/user';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => void;
	updateUser: (partial: Partial<User>) => void;
	isAuthenticated: boolean;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FETCH_MS = 4000;
const SESSION_CHECK_SAFETY_MS = 6000;
const PROFILE_CACHE_KEY = 'viet-connect-profile-cache';

function userFromProfile(profile: any): User {
	return {
		id: profile.id,
		name: profile.name,
		email: profile.email,
		role: profile.role,
		department: profile.department,
		profilePicture: profile.profile_picture || undefined,
		isActive: profile.is_active,
		createdAt: profile.created_at,
		updatedAt: profile.updated_at
	};
}

function userFromSession(session: Session): User {
	const meta = session.user.user_metadata || {};
	return {
		id: session.user.id,
		name: meta.name || session.user.email?.split('@')[0] || 'User',
		email: session.user.email || '',
		role: meta.role || 'ADMIN',
		department: meta.department || null,
		isActive: true,
		createdAt: new Date(session.user.created_at || Date.now()),
		updatedAt: new Date()
	};
}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(() => {
		try {
			const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
			if (!cached) return null;
			const parsed = JSON.parse(cached);
			if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
			if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
			return parsed;
		} catch { return null; }
	});
	const [loading, setLoading] = useState(() => {
		try { return !sessionStorage.getItem(PROFILE_CACHE_KEY); } catch { return true; }
	});
	const isLoggingInRef = useRef(false);

	const setUserAndCache = (u: User | null) => {
		setUser(u);
		try {
			if (u) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(u));
			else sessionStorage.removeItem(PROFILE_CACHE_KEY);
		} catch { /* quota exceeded – ignore */ }
	};

	async function fetchProfileWithTimeout(session: Session): Promise<User> {
		const profilePromise = supabase
			.from('users')
			.select('*')
			.eq('id', session.user.id)
			.single();
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_FETCH_MS)
		);
		try {
			const { data: profile, error: profileError } = await Promise.race([
				profilePromise,
				timeoutPromise
			]) as { data: any; error: any };
			if (profile) return userFromProfile(profile);
			if (profileError) console.warn('⚠️ Profile fetch failed, using auth metadata:', profileError?.message);
		} catch (_) {
			console.warn('⚠️ Profile fetch timeout or error, using auth metadata');
		}
		return userFromSession(session);
	}

	useEffect(() => {
		let isMounted = true;
		let safetyTimeoutId: NodeJS.Timeout;
		let subscription: { unsubscribe: () => void } | undefined;

		const checkSession = async () => {
			try {
				const { data: { session }, error: sessionError } = await supabase.auth.getSession();
				if (!isMounted) return;
				if (sessionError) {
					setLoading(false);
					return;
				}
				if (session?.user) {
					const u = await fetchProfileWithTimeout(session);
					if (isMounted) setUserAndCache(u);
				} else {
					setUserAndCache(null);
				}
			} catch (_) {
				// ignore
			} finally {
				if (isMounted) {
					clearTimeout(safetyTimeoutId);
					setLoading(false);
				}
			}
		};

		safetyTimeoutId = setTimeout(() => {
			if (isMounted) setLoading(false);
		}, SESSION_CHECK_SAFETY_MS);

		checkSession();

		const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_OUT' || !session) {
				setUserAndCache(null);
				setLoading(false);
				return;
			}
			if (event === 'TOKEN_REFRESHED') {
				return;
			}
			if (event === 'SIGNED_IN' && session?.user) {
				if (isLoggingInRef.current) return;
				setLoading(true);
				try {
					const u = await fetchProfileWithTimeout(session);
					if (isMounted) setUserAndCache(u);
				} finally {
					if (isMounted) setLoading(false);
				}
			}
		});
		subscription = authSubscription;

		return () => {
			isMounted = false;
			clearTimeout(safetyTimeoutId);
			subscription?.unsubscribe();
		};
	}, []);

	const login = async (email: string, password: string): Promise<boolean> => {
		isLoggingInRef.current = true;
		setLoading(true);
		try {
			const { data: authData, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error || !authData?.session?.user) {
				return false;
			}

			const u = await fetchProfileWithTimeout(authData.session);
			setUserAndCache(u);
			return true;
		} catch (_) {
			return false;
		} finally {
			isLoggingInRef.current = false;
			setLoading(false);
		}
	};

	const logout = async () => {
		await supabase.auth.signOut();
		setUserAndCache(null);
		localStorage.removeItem('user');
	};

	const updateUser = (partial: Partial<User>) => {
		setUser(prev => {
			const updated = prev ? { ...prev, ...partial } : prev;
			try {
				if (updated) sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
			} catch { /* ignore */ }
			return updated;
		});
	};

	const value = {
		user,
		login,
		logout,
		updateUser,
		isAuthenticated: !!user,
		loading
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
