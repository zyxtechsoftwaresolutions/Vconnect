import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Printer,
  RotateCcw,
  Library,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import Loader from '../components/ui/loader';
import { UserRole } from '../types/user';
import type { StudentData } from '../services/studentService';

const db = supabaseAdmin || supabase;

interface IDCardData {
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
  /** e.g. "B.Tech ( CSE - A )" */
  courseStream?: string;
  dateOfBirth?: string;
  aadharNo?: string;
  address?: string;
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

const DigitalIDCard: React.FC = () => {
  const { user } = useAuth();
  const [cardData, setCardData] = useState<IDCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const swipeThreshold = 60;

  const handleSwipeStart = (clientX: number) => {
    touchStartX.current = clientX;
  };

  const handleSwipeEnd = (clientX: number) => {
    const delta = clientX - touchStartX.current;
    if (Math.abs(delta) >= swipeThreshold) {
      setFlipped((prev) => !prev);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    handleSwipeStart(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    handleSwipeEnd(e.changedTouches[0].clientX);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handleSwipeStart(e.clientX);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handleSwipeEnd(e.clientX);
  };

  useEffect(() => {
    if (user) loadCardData();
  }, [user]);

  const loadCardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const base: IDCardData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        profilePicture: user.profilePicture,
      };

      if (user.role === UserRole.STUDENT || user.role === UserRole.CR) {
        let student: StudentData | null = await supabaseService.getStudentByUserId(user.id);
        if (!student) student = await supabaseService.getStudentByEmail(user.email);
        if (student) {
          base.registerId = student.registerId;
          base.studentClass = student.class;
          base.bloodGroup = student.bloodGroup;
          base.phone = student.phoneNumber;
          base.department = student.department || base.department;
          base.dateOfBirth = student.dateOfBirth;
          base.aadharNo = student.aadharId;
          base.address = student.address;
          base.courseStream =
            [student.regulation || 'B.Tech', (student.class || student.department || '').replace(/-/g, ' - ')]
              .filter(Boolean)
              .join(' ( ') + (student.class || student.department ? ' )' : '');
          if (!base.profilePicture) {
            const { data: uRec } = await db.from('users').select('profile_picture').eq('id', user.id).single();
            if (uRec?.profile_picture) base.profilePicture = uRec.profile_picture;
          }
        }
      } else {
        const { data: fRec } = await db
          .from('users')
          .select('profile_picture, department')
          .eq('id', user.id)
          .single();
        if (fRec?.profile_picture) base.profilePicture = fRec.profile_picture;
        if (fRec?.department) base.department = fRec.department;

        const { data: facRec } = await db
          .from('faculty')
          .select('employee_id, designation, phone_number')
          .eq('user_id', user.id)
          .maybeSingle();
        if (facRec) {
          base.employeeId = facRec.employee_id;
          base.designation = facRec.designation;
          base.phone = facRec.phone_number;
        }
      }

      setCardData(base);
    } catch (err) {
      console.error('Error loading ID card data:', err);
    } finally {
      setLoading(false);
    }
  };

  const qrPayload = cardData
    ? `${window.location.origin}/id-card/view/${cardData.id}`
    : '';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !cardRef.current) return;
    const front = cardRef.current.querySelector('#id-card-front') as HTMLElement;
    const back = cardRef.current.querySelector('#id-card-back') as HTMLElement;
    if (!front || !back) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>VIET ID Card - ${cardData?.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#fff;display:flex;flex-direction:column;align-items:center;gap:24px;padding:20px}
.card{width:340px;height:540px;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.15);page-break-inside:avoid}
@media print{body{padding:0}.card{box-shadow:none;border:1px solid #ddd}}
</style></head><body>`);
    printWindow.document.write('<div class="card">' + front.innerHTML + '</div>');
    printWindow.document.write('<div class="card">' + back.innerHTML + '</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader text="Loading your ID card..." />
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load ID card data. Please try again.
      </div>
    );
  }

  const isStudent = cardData.role === 'STUDENT' || cardData.role === 'CR';
  const idNumber = isStudent ? cardData.registerId : (cardData.employeeId || cardData.id.slice(0, 8).toUpperCase());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Digital ID Card</h1>
        <p className="text-gray-600">Your official VIET identification card with QR access</p>
      </div>

      {/* Use cases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Library className="h-8 w-8 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-blue-900">Library Access</p>
              <p className="text-xs text-blue-700">Scan QR to borrow/return books</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-green-900">Gate Entry / Exit</p>
              <p className="text-xs text-green-700">Scan QR for security check-in</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setFlipped(!flipped)}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {flipped ? 'Show Front' : 'Show Back'}
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print Card
        </Button>
      </div>

      {/* The Card - swipe or drag to flip */}
      <div className="flex justify-center" ref={cardRef}>
        <div
          className="relative touch-pan-y select-none cursor-grab active:cursor-grabbing"
          style={{ width: 340, height: 540, perspective: 1000 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={() => touchStartX.current = 0}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); } }}
          aria-label={flipped ? 'Swipe or click to show front' : 'Swipe or click to show back'}
        >
          <div
            className="absolute inset-0 transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* ========== FRONT ========== */}
            <div
              id="id-card-front"
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                zIndex: 1,
              }}
            >
              <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #1a237e 0%, #283593 45%, #f5f5f5 45%)' }}>
                {/* Top pattern stripe */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />

                {/* Header */}
                <div className="text-center pt-4 pb-3 px-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img
                      src="/viet-logo.png"
                      alt="VIET"
                      className="h-10 w-auto"
                    />
                  </div>
                  <h2 className="text-white font-extrabold text-xs tracking-wider leading-tight">
                    VISAKHA INSTITUTE OF<br />ENGINEERING & TECHNOLOGY (A)
                  </h2>
                  <p className="text-blue-200 text-[9px] mt-0.5">Narava, Visakhapatnam - 530 027, A.P.</p>
                  <p className="text-yellow-300 text-[8px] font-semibold mt-0.5 tracking-wider">
                    NAAC ACCREDITED &bull; AICTE APPROVED &bull; JNTUGV AFFILIATED
                  </p>
                </div>

                {/* Role badge */}
                <div className="flex justify-center -mb-3 relative z-10">
                  <span
                    className="px-4 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md"
                    style={{
                      background: isStudent
                        ? 'linear-gradient(135deg, #1565c0, #1976d2)'
                        : 'linear-gradient(135deg, #b71c1c, #d32f2f)',
                      color: '#fff',
                    }}
                  >
                    {isStudent ? 'Student' : ROLE_LABELS[cardData.role] || cardData.role}
                  </span>
                </div>

                {/* Photo + details */}
                <div className="flex-1 bg-[#f5f5f5] px-5 pt-5 pb-3 flex flex-col items-center">
                  {/* Photo */}
                  <div
                    className="w-28 h-28 rounded-xl overflow-hidden border-4 border-white shadow-lg mb-3"
                    style={{ background: '#e0e0e0' }}
                  >
                    {cardData.profilePicture ? (
                      <img
                        src={cardData.profilePicture}
                        alt={cardData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                        {cardData.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-extrabold text-gray-900 text-center leading-tight">
                    {cardData.name}
                  </h3>

                  {/* ID */}
                  <p className="text-sm font-mono font-bold text-blue-800 mt-0.5">
                    {idNumber || '-'}
                  </p>

                  {/* Details grid */}
                  <div className="mt-3 w-full space-y-1.5 text-[11px]">
                    {cardData.courseStream && (
                      <DetailRow label="Course" value={cardData.courseStream} />
                    )}
                    <DetailRow label="Department" value={cardData.department} />
                    {isStudent && cardData.studentClass && (
                      <DetailRow label="Class" value={cardData.studentClass} />
                    )}
                    {!isStudent && cardData.designation && (
                      <DetailRow label="Designation" value={cardData.designation} />
                    )}
                    {cardData.dateOfBirth && (
                      <DetailRow label="DOB" value={cardData.dateOfBirth} />
                    )}
                    {cardData.aadharNo && (
                      <DetailRow label="Aadhar No" value={cardData.aadharNo} />
                    )}
                    {cardData.address && (
                      <DetailRow label="Address" value={cardData.address} />
                    )}
                    {cardData.phone && (
                      <DetailRow label="Ph No" value={cardData.phone} />
                    )}
                    {cardData.bloodGroup && (
                      <DetailRow label="Blood Group" value={cardData.bloodGroup} />
                    )}
                  </div>

                  {/* Footer stripe */}
                  <div className="mt-auto w-full pt-2">
                    <div className="text-center text-[8px] text-gray-400 tracking-wide">
                      V-CONNECT PORTAL &bull; DIGITAL ID
                    </div>
                  </div>
                </div>

                {/* Bottom gold stripe */}
                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />
              </div>
            </div>

            {/* ========== BACK ========== */}
            <div
              id="id-card-back"
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                zIndex: 2,
              }}
            >
              <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #1a237e 0%, #283593 20%, #f5f5f5 20%)' }}>
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />

                <div className="text-center pt-3 pb-2">
                  <h3 className="text-white font-bold text-xs tracking-wider">IDENTITY CARD</h3>
                </div>

                <div className="flex-1 bg-[#f5f5f5] px-5 pt-6 pb-4 flex flex-col items-center">
                  {/* QR Code */}
                  <div className="bg-white p-3 rounded-xl shadow-md border mb-3">
                    <QRCodeSVG
                      value={qrPayload}
                      size={160}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: '/viet-logo.png',
                        x: undefined,
                        y: undefined,
                        height: 28,
                        width: 28,
                        excavate: true,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-4">
                    <QrCode className="h-3 w-3" />
                    Scan for Library &amp; Gate Access
                  </div>

                  {/* Contact info */}
                  <div className="w-full space-y-1.5 text-[11px]">
                    <DetailRow label="Email" value={cardData.email} />
                    {cardData.phone && <DetailRow label="Phone" value={cardData.phone} />}
                    <DetailRow label="ID" value={cardData.id.slice(0, 12) + '...'} />
                  </div>

                  {/* Terms */}
                  <div className="mt-auto w-full pt-3">
                    <div className="border-t pt-2 text-[8px] text-gray-400 leading-relaxed text-center space-y-0.5">
                      <p>This card is the property of VIET, Narava.</p>
                      <p>If found, please return to the college office.</p>
                      <p className="font-semibold text-gray-500">
                        Ph: 0891-2739507 &bull; www.viet.edu.in
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #c5a15a, #e6c95a, #c5a15a)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR details panel */}
      <Card>
        <CardContent className="py-4">
          <Tabs defaultValue="library" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library">
                <Library className="h-4 w-4 mr-1" /> Library Access
              </TabsTrigger>
              <TabsTrigger value="gate">
                <ShieldCheck className="h-4 w-4 mr-1" /> Gate Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-4">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
                  <QRCodeSVG value={qrPayload} size={80} level="M" />
                </div>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-gray-900">Library Book Issue / Return</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Show this QR code at the library counter to borrow or return books.
                    The librarian will scan the code to identify your account and process
                    the transaction instantly.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">Borrow Books</Badge>
                    <Badge variant="outline" className="text-[10px]">Return Books</Badge>
                    <Badge variant="outline" className="text-[10px]">Check Fines</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gate" className="mt-4">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
                  <QRCodeSVG value={qrPayload} size={80} level="M" />
                </div>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-gray-900">Campus Gate Entry / Exit</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Scan this QR code at the security gate when entering or leaving the campus.
                    This records your entry/exit time for attendance and security tracking.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">Entry Log</Badge>
                    <Badge variant="outline" className="text-[10px]">Exit Log</Badge>
                    <Badge variant="outline" className="text-[10px]">Security Verified</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500 font-medium">{label}</span>
    <span className="text-gray-900 font-semibold text-right max-w-[180px] truncate">{value}</span>
  </div>
);

export default DigitalIDCard;
