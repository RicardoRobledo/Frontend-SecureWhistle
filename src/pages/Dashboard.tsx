import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  EyeOff, 
  ShieldCheck, 
  Fingerprint,
  Info,
  Server
} from 'lucide-react';

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: '#020617',
    color: '#e2e8f0',
    fontFamily: 'sans-serif',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  background: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.05,
    backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
  },
  glow: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '400px',
    height: '400px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    filter: 'blur(100px)',
    borderRadius: '50%',
  },
  main: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.9rem',
    borderRadius: '9999px',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    fontSize: '10px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    marginBottom: '1.5rem',
    whiteSpace: 'nowrap',
  },
  title: {
    fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: '-0.04em',
    lineHeight: '1',
    marginBottom: '1rem',
  },
  gradientText: {
    background: 'linear-gradient(to right, #60a5fa, #818cf8, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
  },
  description: {
    color: '#94a3b8',
    fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
    fontWeight: '300',
    lineHeight: '1.6',
    maxWidth: '540px',
    margin: '0 auto 2rem auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    width: '100%',
    maxWidth: '860px',
  },
  card: {
    padding: '1.25rem',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(30, 41, 59, 0.5)',
    borderRadius: '1rem',
    backdropFilter: 'blur(4px)',
  },
  iconContainer: {
    padding: '0.5rem',
    width: 'fit-content',
    margin: '0 auto 0.75rem auto',
    borderRadius: '0.75rem',
    backgroundColor: '#1e293b',
  },
  footer: {
    position: 'relative',
    zIndex: 10,
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.5,
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: '#64748b',
    flexWrap: 'wrap',
    gap: '0.5rem',
  }
};

const Dashboard = () => {
  const [isScanning, setIsScanning] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setIsScanning(false);
      setShowContent(true);
    }, 1200);
    return () => clearTimeout(scanTimer);
  }, []);

  return (
    <div style={styles.container}>
      {/* Fondo */}
      <div style={styles.background}>
        <div style={styles.gridOverlay} />
        <motion.div 
          animate={{ opacity: [0.1, 0.15, 0.1], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
          style={styles.glow} 
        />
      </div>

      {/* Escaneo inicial */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', backgroundColor: '#020617'
            }}
          >
            <div style={{ position: 'relative' }}>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: '100px', height: '100px',
                  border: '2px solid rgba(59, 130, 246, 0.1)',
                  borderTopColor: '#3b82f6', borderRadius: '50%'
                }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Fingerprint size={36} color="#3b82f6" />
              </div>
            </div>
            <h2 style={{ marginTop: '1.5rem', color: '#3b82f6', fontSize: '10px', letterSpacing: '0.4em', fontWeight: 'bold' }}>
              BIENVENIDO ...
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido */}
      <main style={styles.main}>
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={styles.badge}>
                <Server size={11} />
                Protocolo de Seguridad Activo
              </div>

              <h1 style={styles.title}>
                <span style={styles.gradientText}>SecureWhistle</span>
              </h1>

              <p style={styles.description}>
                Sistema de integridad corporativa de denuncias.
              </p>

              <div style={styles.grid}>
                {[
                  { title: "Anonimato", icon: EyeOff, desc: "Cifrado de identidad sin rastros digitales.", color: "#60a5fa" },
                  { title: "Cumplimiento", icon: ShieldCheck, desc: "Alineado con estándares ISO globales.", color: "#10b981" },
                  { title: "Protección", icon: Info, desc: "Garantía de no represalias institucionales.", color: "#f59e0b" }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    style={styles.card}
                  >
                    <div style={styles.iconContainer}>
                      <item.icon size={18} color={item.color} />
                    </div>
                    <h3 style={{ fontSize: '13px', marginBottom: '0.4rem', color: '#fff' }}>{item.title}</h3>
                    <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer style={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={11} />
          Canal Seguro
        </div>
        <div>© Ecosistema de Integridad</div>
      </footer>
    </div>
  );
};

export default Dashboard;