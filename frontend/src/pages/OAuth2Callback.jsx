import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth'; 

export default function OAuth2Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error === 'use_password') {
      alert('This account was registered with email/password. Please sign in normally.');
      navigate('/login');
      return;
    }

    if (token) {
      loginUser(token);       // saves to localStorage, sets user
      navigate('/dashboard'); // redirect after login
    } else {
      navigate('/login');
    }
  }, []);

  return <div>Signing you in...</div>;
}