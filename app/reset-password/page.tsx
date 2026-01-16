// app/reset-password/page.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

const ResetPassword = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setMessage('✅ Password updated successfully! Redirecting...');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Set New Password</h2>
        <p style={styles.subtitle}>Enter your new password below</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="New password"
              required
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          {message && (
            <div style={styles.successBox}>
              <p style={styles.successText}>{message}</p>
            </div>
          )}
          
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            style={{
              ...styles.button,
              opacity: (loading || !password || !confirmPassword) ? 0.6 : 1,
              cursor: (loading || !password || !confirmPassword) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Type-safe styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center' as const,
    color: '#333'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  inputGroup: {
    width: '100%'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box' as const
  },
  button: {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.3s'
  },
  successBox: {
    backgroundColor: '#d4edda',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #c3e6cb'
  },
  successText: {
    color: '#155724',
    margin: 0,
    fontSize: '14px'
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #f5c6cb'
  },
  errorText: {
    color: '#721c24',
    margin: 0,
    fontSize: '14px'
  }
};

export default ResetPassword;