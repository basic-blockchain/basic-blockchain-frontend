// auth-screens.jsx — Login, Register, 2FA

function LoginScreen() {
  return (
    <div className="auth-wrap" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="auth-left">
        <div className="auth-brand">
          <div className="mark">◆</div>
          <span>Cadena</span>
        </div>
        <div className="auth-form">
          <h1>Ingresar</h1>
          <p className="sub">Accedé a tu panel de la plataforma.</p>

          <div className="fld">
            <label>Email o usuario</label>
            <input defaultValue="admin@dropi.co" />
          </div>
          <div className="fld">
            <label>Contraseña <a href="#" style={{ float: 'right', fontSize: 11, color: 'var(--accent-text)', fontWeight: 500 }}>¿Olvidaste?</a></label>
            <input type="password" defaultValue="••••••••••" />
          </div>
          <label className="toggle" style={{ marginBottom: 16 }}>
            <input type="checkbox" defaultChecked /> Mantener sesión en este dispositivo
          </label>
          <button className="btn btn-primary" style={{ width: '100%', height: 36, justifyContent: 'center' }}>
            Continuar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 11.5, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            <span>o</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
          </div>
          <button className="btn" style={{ width: '100%', height: 34, justifyContent: 'center' }}>
            Ingresar con SSO corporativo
          </button>
          <div style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-2)' }}>
            ¿No tenés cuenta? <a href="#" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Crear una</a>
          </div>
        </div>
        <div className="auth-foot">
          <span>© 2026 Cadena</span>
          <span>·</span>
          <a href="#" style={{ color: 'inherit' }}>Términos</a>
          <a href="#" style={{ color: 'inherit' }}>Privacidad</a>
        </div>
      </div>

      <div className="auth-right">
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Plataforma</div>
          <p className="quote">"Operaciones, cumplimiento y tesorería sobre la misma capa de datos blockchain — sin reconciliaciones manuales."</p>
        </div>

        <div className="role-card">
          <h4>Roles de la plataforma</h4>
          <div className="role-list">
            <div className="role-item">
              <span className="role-dot" style={{ background: '#a78bfa' }}></span>
              <div><b>ADMIN</b><span>Gobierno total · tesorería, configuración, eliminación de usuarios</span></div>
            </div>
            <div className="role-item">
              <span className="role-dot" style={{ background: '#67e8f9' }}></span>
              <div><b>OPERATOR</b><span>Operativa diaria · KYC, congelar/desbanear, mover fondos según política</span></div>
            </div>
            <div className="role-item">
              <span className="role-dot" style={{ background: '#86efac' }}></span>
              <div><b>USER-VIEWER</b><span>Cliente final · wallets, P2P, exchange, envíos y recepción</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterScreen() {
  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand"><div className="mark">◆</div><span>Cadena</span></div>
        <div className="auth-form">
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[1,2,3,4].map(n => (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= 2 ? 'var(--text)' : 'var(--border)' }}></div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Paso 2 de 4 · Datos personales</div>
          <h1 style={{ fontSize: 24, marginTop: 6 }}>Contanos sobre vos</h1>
          <p className="sub">Necesitamos algunos datos básicos antes de la verificación.</p>

          <div className="fld-row">
            <div className="fld"><label>Nombre</label><input defaultValue="Juliana" /></div>
            <div className="fld"><label>Apellido</label><input defaultValue="Martínez" /></div>
          </div>
          <div className="fld"><label>Email</label><input defaultValue="jmartinez@gmail.com" /></div>
          <div className="fld-row">
            <div className="fld"><label>País de residencia</label>
              <select defaultValue="AR"><option value="AR">🇦🇷 Argentina</option><option>🇲🇽 México</option></select>
            </div>
            <div className="fld"><label>Fecha de nacimiento</label><input defaultValue="14 / 03 / 1992" /></div>
          </div>
          <div className="fld"><label>Teléfono</label><input className="mono" defaultValue="+54 11 5544-2210" /></div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" style={{ flex: 0 }}>Atrás</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 36 }}>Continuar a verificación KYC</button>
          </div>
        </div>
        <div className="auth-foot"><span>© 2026 Cadena</span></div>
      </div>

      <div className="auth-right">
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Onboarding</div>
          <p className="quote">"Verificación KYC progresiva. Empezás operando en minutos, subís de nivel cuando te conviene."</p>
        </div>

        <div className="role-card">
          <h4>Lo que sigue</h4>
          <div className="role-list">
            <div className="role-item">
              <span style={{ width: 18, height: 18, borderRadius: 50, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>3</span>
              <div><b>Documento de identidad</b><span>DNI o pasaporte · 2 minutos</span></div>
            </div>
            <div className="role-item">
              <span style={{ width: 18, height: 18, borderRadius: 50, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>4</span>
              <div><b>Selfie de verificación</b><span>Confirmamos que sos vos · 1 minuto</span></div>
            </div>
            <div className="role-item">
              <span style={{ width: 18, height: 18, borderRadius: 50, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>5</span>
              <div><b>Activar 2FA</b><span style={{ color: 'rgba(255,255,255,0.5)' }}>Opcional pero recomendado</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OtpScreen() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface)', padding: 40 }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div className="mark" style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #1a1917, #3a3833)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>◆</div>
          <span style={{ fontWeight: 600 }}>Cadena</span>
        </div>

        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
          {React.cloneElement(I.lock, { props: { size: 20 } })}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 6px' }}>Verificá tu identidad</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 13.5, margin: '0 0 24px', lineHeight: 1.5 }}>Ingresá el código de 6 dígitos generado por tu app autenticadora.</p>

        <div className="otp-grid">
          {['4','9','2','7','',''].map((v, i) => (
            <div key={i} className={`otp-cell ${v ? 'filled' : ''} ${i === 4 ? 'cursor' : ''}`}>{v}</div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', height: 38, justifyContent: 'center', fontSize: 13 }}>Verificar y entrar</button>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}>
          <a href="#" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Usar otro método</a>
          <span>Reintentar en 0:42</span>
        </div>

        <div style={{ marginTop: 28, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
          {React.cloneElement(I.shield, { props: { size: 14 } })}
          <span>Conexión protegida desde <span className="mono" style={{ color: 'var(--text)' }}>200.45.183.112</span> · Buenos Aires, AR</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, RegisterScreen, OtpScreen });
