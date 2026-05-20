import Logo from '../../components/ui/Logo';

export default function Invite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { signUpProfessional } = useAuth();

  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [email, setEmail] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('Psychiatrist');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [clinic, setClinic] = useState('');
  const [country, setCountry] = useState('US');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const { data, error } = await insforge.database
          .from('invite_tokens')
          .select('*')
          .eq('token', token)
          .single();

        if (error || !data) {
          setTokenError('This invitation link is invalid or does not exist.');
          return;
        }

        if (data.used) {
          setTokenError('This invitation has already been used.');
          return;
        }

        const isExpired = new Date() > new Date(data.expires_at);
        if (isExpired) {
          setTokenError('This invitation has expired (valid for 24 hours). Please request a new invite.');
          return;
        }

        setEmail(data.email);
      } catch (err) {
        console.error("Token verification error:", err);
        setTokenError('Failed to verify invitation link.');
      } finally {
        setTokenLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !password || !confirmPassword || !specialty || !licenseNumber || !phone || !clinic || !country || !city) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await signUpProfessional({
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
      });
      navigate('/professional');
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'Failed to complete registration.');
      setIsSubmitting(false);
    }
  };

  const specialties = [
    'Psychiatrist',
    'CBT Therapist',
    'EMDR Specialist',
    'Addiction Counsellor',
    'Marriage & Family Therapist',
    'Eating Disorder Specialist',
    'Grief Counsellor',
    'General Psychologist',
  ];

  if (tokenLoading) {
    return (
      <div className="auth-container">
        <Spinner size={32} />
        <span className="text-sm text-secondary mt-sm">Verifying invitation link...</span>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Logo size={48} />
            <h2 className="auth-logo" style={{ margin: 0 }}>Inzuma</h2>
          </div>
          <div className="text-sm text-danger mt-md" style={{ border: '1px solid rgba(224,82,82,0.3)', padding: '12px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(224,82,82,0.05)' }}>
            {tokenError}
          </div>
          <Link to="/auth/login" className="btn btn-ghost mt-md" style={{ display: 'inline-block' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ padding: '40px 16px' }}>
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Logo size={48} />
          <h2 className="auth-logo" style={{ margin: 0 }}>Inzuma</h2>
        </div>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '-12px', marginBottom: '16px' }}>
          professional practitioner registration
        </p>

        {submitError && (
          <div className="text-sm text-danger" style={{ textAlign: 'center', border: '1px solid rgba(224,82,82,0.3)', padding: '8px', borderRadius: 'var(--radius-input)', backgroundColor: 'rgba(224,82,82,0.05)' }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input
            type="email"
            label="Email Address (Locked)"
            value={email}
            disabled
            required
          />

          <Input
            type="text"
            label="Full Name"
            placeholder="Dr. Jordan Walker"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <div className="input-container">
            <label className="input-label">Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              disabled={isSubmitting}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '10px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-input)',
                width: '100%',
                outline: 'none'
              }}
            >
              {specialties.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <Input
            type="text"
            label="License Number / Credentials ID"
            placeholder="LIC-9988221"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            type="tel"
            label="Phone Number"
            placeholder="+1 555-0199"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            type="text"
            label="Clinic / Hospital Affiliation"
            placeholder="Metro Health Center"
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <div className="flex gap-sm">
            <div style={{ flex: 1 }}>
              <Input
                type="text"
                label="Country"
                placeholder="Canada"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                type="text"
                label="City"
                placeholder="Toronto"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="input-container">
            <label className="input-label">Short Biography (Optional)</label>
            <textarea
              placeholder="Tell us about your background and clinical focus..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSubmitting}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '10px 14px',
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-input)',
                width: '100%',
                minHeight: '80px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ marginTop: '8px' }}>
            Complete Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
