import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import AuthForm from '../components/common/AuthForm';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(['admin', 'supervisor'].includes(user.role) ? '/admin/dashboard' : '/user/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      icon="🏛️"
      title="Auditorium Booking"
      subtitle="Sign in to continue"
      loading={loading}
      onSubmit={handleSubmit}
      form={form}
      setForm={setForm}
      forgotPasswordLink={true}
    />
  );
};

export default Login;
