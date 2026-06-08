import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const { register } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/onboarding');
    } catch (err: any) {
      const status = err?.response?.status;
      const data   = err?.response?.data;

      if (status === 409) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (status === 400) {
        // Zod flatten shape: { fieldErrors: { email?: string[], password?: string[], ... } }
        const fieldErrors: Record<string, string[]> = data?.error?.fieldErrors ?? {};
        const messages = Object.entries(fieldErrors)
          .flatMap(([field, errs]) => errs.map((e) => `${field}: ${e}`));
        setError(messages.length ? messages.join(' · ') : 'Invalid submission. Please check all fields.');
      } else if (!err?.response) {
        setError('Could not reach the server. Make sure the backend is running.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Start your financial clarity journey</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['firstName', 'lastName'].map((field) => (
              <div key={field}>
                <label className="text-sm text-gray-600 block mb-1 capitalize">
                  {field === 'firstName' ? 'First Name' : 'Last Name'}
                </label>
                <input
                  value={form[field as keyof typeof form]}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
            ))}
          </div>

          {['email', 'password'].map((field) => (
            <div key={field}>
              <label className="text-sm text-gray-600 block mb-1 capitalize">{field}</label>
              <input
                type={field === 'password' ? 'password' : 'email'}
                value={form[field as keyof typeof form]}
                onChange={(e) => update(field, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
                minLength={field === 'password' ? 8 : undefined}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
