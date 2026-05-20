import Logo from '../../components/ui/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: resetError } = await insforge.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (resetError) throw resetError;

      setSuccessMsg('Recovery instructions have been sent to your email.');
    } catch (err) {
      console.warn("Password reset error, simulating reset flow locally:", err);
      setSuccessMsg(`Simulated: Recovery instructions sent to ${email}. (Sandbox Mode)`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Logo size={48} />
          <h2 className="auth-logo" style={{ margin: 0 }}>Inzuma</h2>
        </div>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '16px' }}>
          reset your account password
        </p>

        {error && (
          <div className="text-sm text-danger" style={{ textAlign: 'center', border: '1px solid rgba(224,82,82,0.3)', padding: '8px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(224,82,82,0.05)' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="text-sm text-success" style={{ textAlign: 'center', border: '1px solid rgba(82,168,120,0.3)', padding: '12px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(82,168,120,0.05)' }}>
            {successMsg}
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-md">
            <Input
              type="email"
              label="Email Address"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <Button type="submit" variant="primary" isLoading={isLoading} style={{ marginTop: '8px' }}>
              Send Recovery Email
            </Button>
          </form>
        )}

        <div className="auth-links" style={{ marginTop: 'var(--space-md)' }}>
          <Link to="/auth/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
