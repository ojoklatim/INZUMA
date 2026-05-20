import { createClient } from "@insforge/sdk";

// Initialize the client using environment variables with local test fallbacks
const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://mock-inzuma.insforge.net';
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || 'mock-anon-key-123456';

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY
});

/**
 * Authentication Wrapper Methods
 */
export const auth = {
  /**
   * Registers a new user with email and password
   */
  async signUp(email, password) {
    try {
      const { data, error } = await insforge.auth.signUp({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('InsForge SignUp Error:', error);
      return { data: null, error };
    }
  },

  /**
   * Logs in a user with email and password
   */
  async signIn(email, password) {
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('InsForge SignIn Error:', error);
      return { data: null, error };
    }
  },

  /**
   * Retrieves the current authenticated user session
   */
  async getCurrentUser() {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('InsForge GetCurrentUser Error:', error);
      return { data: null, error };
    }
  },

  /**
   * Logs out the current user session
   */
  async signOut() {
    try {
      const { error } = await insforge.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('InsForge SignOut Error:', error);
      return { error };
    }
  }
};

/**
 * Database CRUD Wrapper Methods
 */
export const db = {
  /**
   * Queries records from a table with an optional filter
   */
  async select(tableName, filters = {}) {
    try {
      let query = insforge.database.from(tableName).select('*');
      
      // Apply filters if provided
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`InsForge DB Select Error on "${tableName}":`, error);
      return { data: null, error };
    }
  },

  /**
   * Inserts records into a table (format: item object or array of objects)
   */
  async insert(tableName, records) {
    try {
      const recordsArray = Array.isArray(records) ? records : [records];
      const { data, error } = await insforge.database
        .from(tableName)
        .insert(recordsArray)
        .select();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`InsForge DB Insert Error on "${tableName}":`, error);
      return { data: null, error };
    }
  }
};

/**
 * Storage File Upload Wrapper Methods
 */
export const storage = {
  /**
   * Uploads a file object to a storage bucket
   */
  async upload(bucketName, filePath, fileObj) {
    try {
      const { data, error } = await insforge.storage
        .from(bucketName)
        .upload(filePath, fileObj);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error(`InsForge Storage Upload Error to bucket "${bucketName}":`, error);
      return { data: null, error };
    }
  }
};
