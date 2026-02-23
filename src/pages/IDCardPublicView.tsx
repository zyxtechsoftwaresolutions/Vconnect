import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import Loader from '../components/ui/loader';

const db = supabaseAdmin || supabase;

interface CardData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  profilePicture?: string;
  registerId?: string;
  studentClass?: string;
  bloodGroup?: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  isActive?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  CR: 'Class Representative',
  FACULTY: 'Faculty',
  HOD: 'Head of Department',
  COORDINATOR: 'Coordinator',
  PRINCIPAL: 'Principal',
  ADMIN: 'Administrator',
  LIBRARIAN: 'Librarian',
  ACCOUNTANT: 'Accountant',
  GUEST: 'Guest',
};

const IDCardPublicView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) loadData(userId);
    else setError('No user ID provided.');
  }, [userId]);

  const loadData = async (uid: string) => {
    setLoading(true);
    setError('');
    try {
      const { data: userRec, error: uErr } = await db
        .from('users')
        .select('id, name, email, role, department, profile_picture, is_active')
        .eq('id', uid)
        .single();

      if (uErr || !userRec) {
        setError('ID card not found. This QR code may be invalid.');
        setLoading(false);
        return;
      }

      const card: CardData = {
        id: userRec.id,
        name: userRec.name,
        email: userRec.email,
        role: userRec.role,
        department: userRec.department || '',
        profilePicture: userRec.profile_picture || undefined,
        isActive: userRec.is_active,
      };

      const isStudent = userRec.role === 'STUDENT' || userRec.role === 'CR';

      if (isStudent) {
        const { data: sRec } = await db
          .from('students')
          .select('register_id, class, blood_group, phone_number, department')
          .eq('user_id', uid)
          .maybeSingle();
        if (sRec) {
          card.registerId = sRec.register_id;
          card.studentClass = sRec.class;
          card.bloodGroup = sRec.blood_group;
          card.phone = sRec.phone_number;
          if (sRec.department) card.department = sRec.department;
        }
      } else {
        const { data: fRec } = await db
          .from('faculty')
          .select('employee_id, designation, phone_number')
          .eq('user_id', uid)
          .maybeSingle();
        if (fRec) {
          card.employeeId = fRec.employee_id;
          card.designation = fRec.designation;
          card.phone = fRec.phone_number;
        }
      }

      setCardData(card);
    } catch (err: any) {
      console.error('Error loading public ID card:', err);
      setError('Failed to load ID card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.pageCenter}>
        <Loader size="sm" text="Verifying ID card..." />
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div style={styles.pageCenter}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#9888;</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 8 }}>Invalid ID Card</h2>
          <p style={{ fontSize: 13, color: '#888' }}>{error || 'This QR code could not be verified.'}</p>
        </div>
      </div>
    );
  }

  const isStudent = cardData.role === 'STUDENT' || cardData.role === 'CR';
  const idNumber = isStudent ? cardData.registerId : (cardData.employeeId || cardData.id.slice(0, 8).toUpperCase());
  const qrUrl = window.location.href;
  const verifiedAt = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',sans-serif;background:#e8e8e8}
      `}</style>

      {/* Verified banner */}
      <div style={styles.verifiedBanner}>
        <CheckCircle2 style={{ width: 18, height: 18, color: '#15803d', flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>Identity Verified</p>
          <p style={{ fontSize: 10, color: '#22c55e' }}>Scanned at {verifiedAt}</p>
        </div>
        {cardData.isActive === false && (
          <span style={{ marginLeft: 'auto', background: '#fca5a5', color: '#991b1b', fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
            INACTIVE
          </span>
        )}
      </div>

      {/* Card */}
      <div style={styles.card}>
        {/* Gold top */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />

        {/* Navy header */}
        <div style={styles.header}>
          <img
            src="/viet-logo.png"
            alt="VIET"
            style={{ height: 40, marginBottom: 4 }}
          />
          <h1 style={{ color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1, lineHeight: 1.3 }}>
            VISAKHA INSTITUTE OF<br />ENGINEERING &amp; TECHNOLOGY (A)
          </h1>
          <p style={{ color: '#93c5fd', fontSize: 8, marginTop: 2 }}>Narava, Visakhapatnam - 530 027, A.P.</p>
          <p style={{ color: '#fde047', fontSize: 7, fontWeight: 600, marginTop: 2, letterSpacing: 1 }}>
            NAAC ACCREDITED &bull; AICTE APPROVED &bull; JNTUGV AFFILIATED
          </p>
        </div>

        {/* Role badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -12, position: 'relative', zIndex: 2 }}>
          <span style={{
            padding: '4px 16px',
            borderRadius: 99,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            color: '#fff',
            background: isStudent
              ? 'linear-gradient(135deg, #1565c0, #1976d2)'
              : 'linear-gradient(135deg, #b71c1c, #d32f2f)',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)',
          }}>
            {isStudent ? 'Student' : (ROLE_LABELS[cardData.role] || cardData.role)}
          </span>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Photo */}
          <div style={styles.photoFrame}>
            {cardData.profilePicture ? (
              <img src={cardData.profilePicture} alt={cardData.name} style={styles.photo} />
            ) : (
              <div style={styles.photoFallback}>
                {cardData.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', textAlign: 'center', marginTop: 8 }}>
            {cardData.name}
          </h2>

          {/* ID number */}
          <p style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1a237e', marginTop: 2 }}>
            {idNumber || '-'}
          </p>

          {/* Details */}
          <div style={styles.detailsGrid}>
            <Row label="Department" value={cardData.department} />
            {isStudent && cardData.studentClass && <Row label="Class / Section" value={cardData.studentClass} />}
            {!isStudent && cardData.designation && <Row label="Designation" value={cardData.designation} />}
            {cardData.bloodGroup && <Row label="Blood Group" value={cardData.bloodGroup} />}
            <Row label="Email" value={cardData.email} />
            {cardData.phone && <Row label="Phone" value={cardData.phone} />}
          </div>

          {/* Small QR for re-scan */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <QRCodeSVG value={qrUrl} size={56} level="M" />
            <div style={{ fontSize: 9, color: '#999', lineHeight: 1.4 }}>
              <p style={{ fontWeight: 600, color: '#555' }}>V-Connect Digital ID</p>
              <p>Library &amp; Gate Access</p>
              <p>Scan to re-verify</p>
            </div>
          </div>
        </div>

        {/* Gold bottom */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 16 }}>
        VIET V-Connect Portal &bull; www.viet.edu.in &bull; Ph: 0891-2739507
      </p>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee' }}>
    <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 11, color: '#111', fontWeight: 600, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{value}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#e8e8e8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 12px',
    fontFamily: "'Inter', sans-serif",
  },
  pageCenter: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    background: '#e8e8e8',
  },
  verifiedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '10px 16px',
    marginBottom: 16,
    width: '100%',
    maxWidth: 380,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,.12)',
  },
  header: {
    background: 'linear-gradient(180deg, #1a237e, #283593)',
    textAlign: 'center' as const,
    padding: '16px 16px 20px',
  },
  body: {
    padding: '16px 20px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  photoFrame: {
    width: 110,
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    border: '4px solid #fff',
    boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    background: '#e0e0e0',
    marginTop: -8,
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    fontWeight: 700,
    color: '#9ca3af',
  },
  detailsGrid: {
    width: '100%',
    marginTop: 12,
  },
};

export default IDCardPublicView;
