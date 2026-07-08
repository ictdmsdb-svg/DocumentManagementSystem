import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THAI_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import type { Json } from '@/types/database';

type GDriveStatus = 'checking' | 'configured' | 'not_configured';

interface AppSettings {
  app_name: string;
  department_name: string;
  max_upload_size: number;
  allowed_file_types: string[];
  default_confidentiality: string;
  public_link_mode_enabled: boolean;
  access_request_enabled: boolean;
  workflow_enabled: boolean;
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const { settings, refreshSettings } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gdriveStatus, setGdriveStatus] = useState<GDriveStatus>('checking');
  const [form, setForm] = useState<AppSettings>({
    app_name: 'DMS - Document Management System',
    department_name: 'Document Management Department',
    max_upload_size: 52428800,
    allowed_file_types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'rtf'],
    default_confidentiality: 'department',
    public_link_mode_enabled: false,
    access_request_enabled: true,
    workflow_enabled: true,
  });

  const [gdriveFolderId, setGdriveFolderId] = useState('');
  const [allowedFileTypesInput, setAllowedFileTypesInput] = useState('');

  useEffect(() => {
    loadSettings();
    checkGoogleDriveStatus();
  }, []);

  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        app_name: (settings.app_name as string) || prev.app_name,
        department_name: (settings.department_name as string) || prev.department_name,
        max_upload_size: (settings.max_upload_size as number) || prev.max_upload_size,
        allowed_file_types: (settings.allowed_file_types as string[]) || prev.allowed_file_types,
        default_confidentiality: (settings.default_confidentiality as string) || prev.default_confidentiality,
        public_link_mode_enabled: (settings.public_link_mode_enabled as boolean) ?? prev.public_link_mode_enabled,
        access_request_enabled: (settings.access_request_enabled as boolean) ?? prev.access_request_enabled,
        workflow_enabled: (settings.workflow_enabled as boolean) ?? prev.workflow_enabled,
      }));
      setAllowedFileTypesInput(((settings.allowed_file_types as string[]) || []).join(', '));
    }
  }, [settings]);

  const checkGoogleDriveStatus = async () => {
    setGdriveStatus('checking');
    try {
      const { error } = await supabase.functions.invoke('google-drive-upload', {
        method: 'POST',
        body: { _probe: true },
      });
      if (error?.message?.includes('not configured')) {
        setGdriveStatus('not_configured');
      } else {
        setGdriveStatus('configured');
      }
    } catch {
      setGdriveStatus('not_configured');
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    await refreshSettings();
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { key: string; value: Json }[] = [
        { key: 'app_name', value: form.app_name },
        { key: 'department_name', value: form.department_name },
        { key: 'max_upload_size', value: form.max_upload_size },
        { key: 'allowed_file_types', value: allowedFileTypesInput.split(',').map((t) => t.trim()).filter(Boolean) },
        { key: 'default_confidentiality', value: form.default_confidentiality },
        { key: 'public_link_mode_enabled', value: form.public_link_mode_enabled },
        { key: 'access_request_enabled', value: form.access_request_enabled },
        { key: 'workflow_enabled', value: form.workflow_enabled },
      ];

      for (const { key, value } of updates) {
        await supabase
          .from('system_settings')
          .upsert({ key, value, is_secret: false }, { onConflict: 'key' });
      }

      toast.toast({ title: THAI_LABELS.save_success });
      refreshSettings();
    } catch (error: any) {
      toast.toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const formatFileSizeMB = () => {
    return (form.max_upload_size / (1024 * 1024)).toFixed(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.settings}</h1>
        <p className="text-muted-foreground">
          ตั้งค่าระบบจัดการเอกสาร
        </p>
      </div>

      {/* Google Drive Status */}
      <Card className={gdriveStatus === 'configured' ? 'border-green-200 bg-green-50' : gdriveStatus === 'not_configured' ? 'border-amber-200 bg-amber-50' : 'border-muted'}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {gdriveStatus === 'checking' ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <div>
                  <p className="font-medium text-muted-foreground">กำลังตรวจสอบการเชื่อมต่อ Google Drive...</p>
                </div>
              </>
            ) : gdriveStatus === 'configured' ? (
              <>
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Google Drive พร้อมใช้งาน</p>
                  <p className="text-sm text-green-600">สามารถอัปโหลดและดาวน์โหลดไฟล์ได้</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Google Drive ยังไม่ได้กำหนดค่า</p>
                  <p className="text-sm text-amber-600">
                    กรุณากำหนดค่า Google Drive Service Account ใน Edge Function Secrets
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>การตั้งค่าทั่วไป</CardTitle>
          <CardDescription>
            ตั้งค่าชื่อแอปพลิเคชันและแผนก
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app_name">ชื่อแอปพลิเคชัน</Label>
            <Input
              id="app_name"
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_name">ชื่อแผนก</Label>
            <Input
              id="department_name"
              value={form.department_name}
              onChange={(e) => setForm({ ...form, department_name: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Settings */}
      <Card>
        <CardHeader>
          <CardTitle>การตั้งค่าไฟล์</CardTitle>
          <CardDescription>
            ตั้งค่าขนาดและประเภทไฟล์ที่อนุญาต
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max_upload_size">ขนาดไฟล์สูงสุด (MB)</Label>
            <Input
              id="max_upload_size"
              type="number"
              value={formatFileSizeMB()}
              onChange={(e) =>
                setForm({ ...form, max_upload_size: parseInt(e.target.value) * 1024 * 1024 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowed_file_types">ประเภทไฟล์ที่อนุญาต</Label>
            <Textarea
              id="allowed_file_types"
              value={allowedFileTypesInput}
              onChange={(e) => setAllowedFileTypesInput(e.target.value)}
              placeholder="pdf, doc, docx, xls, xlsx"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              คั่นด้วย comma (,)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_confidentiality">ระดับความลับเริ่มต้น</Label>
            <select
              id="default_confidentiality"
              value={form.default_confidentiality}
              onChange={(e) => setForm({ ...form, default_confidentiality: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="public_internal">{THAI_LABELS.public_internal}</option>
              <option value="department">{THAI_LABELS.department_confidential}</option>
              <option value="confidential">{THAI_LABELS.confidential}</option>
              <option value="restricted">{THAI_LABELS.restricted}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>การเปิด/ปิดฟีเจอร์</CardTitle>
          <CardDescription>
            เปิดหรือปิดฟีเจอร์ต่างๆ ในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>การขอสิทธิ์เข้าถึง</Label>
              <p className="text-sm text-muted-foreground">
                อนุญาตให้ผู้ใช้ขอสิทธิ์เข้าถึงเอกสารที่ต้องการ
              </p>
            </div>
            <Switch
              checked={form.access_request_enabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, access_request_enabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ระบบ Workflow</Label>
              <p className="text-sm text-muted-foreground">
                เปิดใช้งานการเปลี่ยนสถานะเอกสาร (อนุมัติ/ปฏิเสธ)
              </p>
            </div>
            <Switch
              checked={form.workflow_enabled}
              onCheckedChange={(checked) => setForm({ ...form, workflow_enabled: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>
                <span className="text-destructive font-medium">โหมดลิงก์สาธารณะ</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                เปิดใช้งานลิงก์สาธารณะสำหรับดาวน์โหลดไฟล์ (ไม่แนะนำ)
              </p>
            </div>
            <Switch
              checked={form.public_link_mode_enabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, public_link_mode_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Secrets Reminder */}
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">การกำหนดค่าที่เก็บไว้อย่างปลอดภัย</p>
              <p className="text-sm text-muted-foreground mt-1">
                รหัสลับอย่าง Google Private Key และ Supabase Service Role Key
                ต้องกำหนดผ่าน Edge Function Secrets ไม่ใช่ที่นี่
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Secrets ที่ต้องกำหนด:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">GOOGLE_PRIVATE_KEY</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">GOOGLE_CLIENT_EMAIL</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">GOOGLE_DRIVE_FOLDER_ID</Badge>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">SUPABASE_SERVICE_ROLE_KEY</Badge>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {THAI_LABELS.save}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
