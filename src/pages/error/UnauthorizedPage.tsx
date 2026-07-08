import { ShieldX, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-muted-foreground">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หากคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปแดชบอร์ด
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 bg-muted rounded-full flex items-center justify-center">
          <span className="text-4xl font-bold text-muted-foreground">404</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">ไม่พบหน้านี้</h1>
          <p className="text-muted-foreground">
            หน้าที่คุณค้นหาไม่พบ อาจถูกลบไปแล้วหรือ URL ไม่ถูกต้อง
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปแดชบอร์ด
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto h-20 w-20 bg-warning/10 rounded-full flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">รอการอนุมัติ</h1>
          <p className="text-muted-foreground">
            บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ กรุณารอสักครู่
          </p>
        </div>
        <Button asChild>
          <Link to="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            เข้าสู่ระบบใหม่
          </Link>
        </Button>
      </div>
    </div>
  );
}
