import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { THAI_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุล'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(data.email, data.password, data.fullName);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('อีเมลนี้ถูกลงทะเบียนแล้ว');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
      toast({
        title: 'ลงทะเบียนสำเร็จ',
        description: 'บัญชีของคุณอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ',
      });
    } catch {
      setError('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">DMS</h1>
          </div>

          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">ลงทะเบียนสำเร็จ!</h2>
                <p className="text-muted-foreground">
                  บัญชีของคุณถูกสร้างเรียบร้อยแล้วและอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ
                </p>
                <p className="text-sm text-muted-foreground">
                  คุณจะสามารถเข้าสู่ระบบได้หลังจากผู้ดูแลระบบอนุมัติบัญชีของคุณ
                </p>
                <Button className="w-full mt-6" onClick={() => navigate('/login')}>
                  กลับไปยังหน้าเข้าสู่ระบบ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">DMS</h1>
          <p className="text-muted-foreground mt-2">ระบบจัดการเอกสาร</p>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {THAI_LABELS.register}
            </CardTitle>
            <CardDescription className="text-center">
              กรอกข้อมูลเพื่อสร้างบัญชีใหม่
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">{THAI_LABELS.full_name}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="ชื่อ นามสกุล"
                  {...register('fullName')}
                  disabled={isLoading}
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{THAI_LABELS.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...register('email')}
                  disabled={isLoading}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{THAI_LABELS.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={isLoading}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{THAI_LABELS.confirm_password}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={isLoading}
                    className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  บัญชีใหม่จะอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบก่อนใช้งานได้
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {THAI_LABELS.register}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {THAI_LABELS.login}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2024 DMS - Document Management System
        </p>
      </div>
    </div>
  );
}
