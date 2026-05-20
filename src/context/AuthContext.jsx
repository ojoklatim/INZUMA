import React, { createContext, useContext, useState, useEffect } from 'react';
import { insforge } from '../lib/insforge';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the extended user profile including role from public users table
  const fetchUserProfile = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await insforge.database
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.warn("User profile not found in public 'user_profiles' table. Creating default profile.");
        
        // Seed default profile. If email is admin@inzuma.com, auto-assign admin role.
        const isAdmin = currentUser.email === 'admin@inzuma.com';
        const defaultProfile = {
          id: currentUser.id,
          name: currentUser.email.split('@')[0],
          role: isAdmin ? 'admin' : 'user',
          country: 'US',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        };

        const { data: newProfile, error: insertError } = await insforge.database
          .from('users')
          .insert([defaultProfile])
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create default user profile:", insertError);
          setUser(currentUser);
          setRole('user');
        } else {
          setUser(currentUser);
          setRole(newProfile.role);
        }
      } else {
        setUser(currentUser);
        setRole(data.role);

        // Update last_active timestamp
        await insforge.database
          .from('users')
          .update({ last_active: new Date().toISOString() })
          .eq('id', currentUser.id);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setUser(currentUser);
      setRole('user');
    } finally {
      setLoading(false);
    }
  };

  // Check session status on mount
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (mounted) {
          if (data?.user) {
            await fetchUserProfile(data.user);
          } else {
            setUser(null);
            setRole(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error checking active session:", err);
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Standard Login
  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data?.user) {
        await fetchUserProfile(data.user);
      }
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Standard User Signup
  const registerUser = async ({ email, password, name, country }) => {
    setLoading(true);
    try {
      const { data, error } = await insforge.auth.signUp({ email, password });
      if (error) throw error;

      if (data?.user) {
        const isAdmin = email === 'admin@inzuma.com';
        const profilePayload = {
          id: data.user.id,
          name: name,
          role: isAdmin ? 'admin' : 'user',
          country: country || 'US',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        };

        const { error: dbError } = await insforge.database
          .from('users')
          .insert([profilePayload]);

        if (dbError) {
          console.error("Failed to insert user profile to database:", dbError);
        }
        
        await fetchUserProfile(data.user);
      }
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Professional Token-based Registration
  const registerProfessional = async ({
    email,
    password,
    name,
    specialty,
    licenseNumber,
    phone,
    clinic,
    country,
    city,
    bio,
    token
  }) => {
    setLoading(true);
    try {
      // 1. Sign up the user in auth service
      const { data, error } = await insforge.auth.signUp({ email, password });
      if (error) throw error;

      if (data?.user) {
        const userId = data.user.id;

        // 2. Create the user record in public user_profiles table
        const { error: userDbError } = await insforge.database
          .from('users')
          .insert([{
            id: userId,
            name,
            role: 'professional',
            country,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          }]);

        if (userDbError) throw userDbError;

        // 3. Create the professional profile record
        const { error: profDbError } = await insforge.database
          .from('professional_profiles')
          .insert([{
            user_id: userId,
            specialty,
            license_number: licenseNumber,
            phone,
            clinic,
            country,
            city,
            bio,
            verified: false,
            created_at: new Date().toISOString()
          }]);

        if (profDbError) throw profDbError;

        // 4. Mark token as used
        const { error: tokenError } = await insforge.database
          .from('invite_tokens')
          .update({ used: true })
          .eq('token', token);

        if (tokenError) {
          console.error("Failed to set invite token as used:", tokenError);
        }

        await fetchUserProfile(data.user);
      }
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Sign out
  const logoutUser = async () => {
    setLoading(true);
    try {
      await insforge.auth.signOut();
    } catch (err) {
      console.error("Error calling signOut:", err);
    } finally {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      signIn: loginUser,
      signUp: registerUser,
      signUpProfessional: registerProfessional,
      signOut: logoutUser,
      refreshUser: () => fetchUserProfile(user)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
