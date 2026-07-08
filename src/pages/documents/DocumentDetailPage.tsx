import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Lock,
  Unlock,
  History,
  Tag,
  Calendar,
  User,
  Building,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { THAI_LABELS } from '@/lib/constants';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { Document, DocumentVersion, Category, DocumentType, Profile, AuditLogWithDetails } from '@/types/database';

interface DocumentWithDetails extends Document {
  category: Category | null;
  document_type: DocumentType | null;
  creator: Profile | null;
  current_version: DocumentVersion | null;
  versions?: DocumentVersion[];
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  const [documentData, setDocumentData] = useState<DocumentWithDetails | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Load document details
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          category:categories(id, name),
          document_type:document_types(id, name),
          creator:profiles!documents_created_by_fkey(id, full_name, email),
          current_version:document_versions!documents_current_version_id_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (docError) throw docError;

      setDocumentData(docData as DocumentWithDetails);

      // Load versions
      const { data: versionData } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', id)
        .order('version_number', { ascending: false });

      setVersions((versionData as DocumentVersion[]) || []);

      // Load audit logs for this document (admin only)
      if (isAdmin) {
        const { data: logData } = await supabase
          .from('audit_logs')
          .select('*, user:profiles(id, full_name, email)')
          .eq('document_id', id)
          .order('created_at', { ascending: false })
          .limit(50);

        setAuditLogs((logData as AuditLogWithDetails[]) || []);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: 'ไม่สามารถโหลดข้อมูลเอกสารได้',
      });
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, toast]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleView = async () => {
    if (!documentData) return;

    setActionLoading('view');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่');
      }

      const { data, error } = await supabase.functions.invoke('google-drive-view', {
        body: { document_id: documentData.id },
      });

      if (error) throw error;

      if (data.view_url) {
        window.open(data.view_url, '_blank');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถดูเอกสารได้',
        description: error.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (versionId?: string) => {
    if (!documentData) return;

    setActionLoading('download');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่');
      }

      const { data, error } = await supabase.functions.invoke('google-drive-download', {
        body: { document_id: documentData.id, version_id: versionId },
      });

      if (error) throw error;

      if (data.download_url) {
        // Create a temporary link and trigger download
        const a = window.document.createElement('a');
        a.href = data.download_url;
        a.download = data.original_file_name || 'download';
        a.target = '_blank';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถดาวน์โหลดเอกสารได้',
        description: error.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async () => {
    if (!documentData) return;

    setActionLoading('checkout');
    try {
      const { error } = await supabase.functions.invoke('document-checkout', {
        body: { document_id: documentData.id },
      });

      if (error) throw error;

      toast({ title: 'ยืมเอกสารสำเร็จ' });
      loadDocument();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถยืมเอกสารได้',
        description: error.message,
      });
    } finally {
      setActionLoading(null);
      setCheckoutDialogOpen(false);
    }
  };

  const handleCheckin = async () => {
    if (!documentData) return;

    setActionLoading('checkin');
    try {
      const { error } = await supabase.functions.invoke('document-checkin', {
        body: { document_id: documentData.id },
      });

      if (error) throw error;

      toast({ title: 'คืนเอกสารสำเร็จ' });
      loadDocument();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถคืนเอกสารได้',
        description: error.message,
      });
    } finally {
      setActionLoading(null);
      setCheckinDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-600',
    };

    const labels: Record<string, string> = {
      draft: THAI_LABELS.draft,
      active: THAI_LABELS.active,
      under_review: THAI_LABELS.under_review,
      approved: THAI_LABELS.approved,
      rejected: THAI_LABELS.rejected,
      archived: THAI_LABELS.archived,
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getConfidentialityBadge = (level: string) => {
    const styles: Record<string, string> = {
      public_internal: 'bg-gray-100 text-gray-800',
      department: 'bg-blue-100 text-blue-800',
      confidential: 'bg-amber-100 text-amber-800',
      restricted: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      public_internal: THAI_LABELS.public_internal,
      department: THAI_LABELS.department_confidential,
      confidential: THAI_LABELS.confidential,
      restricted: THAI_LABELS.restricted,
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[level] || ''}`}>
        {labels[level] || level}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">ไม่พบเอกสาร</h2>
        <p className="text-muted-foreground">เอกสารที่คุณค้นหาไม่พบหรือคุณไม่มีสิทธิ์เข้าถึง</p>
        <Button asChild>
          <Link to="/documents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Link>
        </Button>
      </div>
    );
  }

  const isCheckoutByMe = documentData.checked_out_by === user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{documentData.title}</h1>
              {documentData.checked_out_by && (
                <Lock className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {documentData.description || 'ไม่มีคำอธิบาย'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleView} disabled={actionLoading !== null}>
            {actionLoading === 'view' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {THAI_LABELS.view}
          </Button>
          <Button variant="outline" onClick={() => handleDownload()} disabled={actionLoading !== null}>
            {actionLoading === 'download' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {THAI_LABELS.download}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/documents/${documentData.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  {THAI_LABELS.edit_metadata}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {documentData.checked_out_by ? (
                isCheckoutByMe || isAdmin ? (
                  <DropdownMenuItem onClick={() => setCheckinDialogOpen(true)}>
                    <Unlock className="h-4 w-4 mr-2" />
                    {THAI_LABELS.checkin}
                  </DropdownMenuItem>
                ) : null
              ) : (
                <DropdownMenuItem onClick={() => setCheckoutDialogOpen(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  {THAI_LABELS.checkout}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Checkout Warning */}
      {documentData.checked_out_by && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {isCheckoutByMe ? (
              'คุณได้ยืมเอกสารนี้ไว้ กรุณาคืนเมื่อแก้ไขเสร็จสิ้น'
            ) : (
              'เอกสารนี้ถูกยืมโดยผู้ใช้อื่น ไม่สามารถแก้ไขได้ในขณะนี้'
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Content */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">รายละเอียด</TabsTrigger>
            <TabsTrigger value="versions">
              <History className="h-4 w-4 mr-2" />
              เวอร์ชัน ({versions.length})
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="audit">
                <Shield className="h-4 w-4 mr-2" />
                บันทึกการใช้งาน
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลเอกสาร</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      ชื่อไฟล์
                    </p>
                    <p className="font-medium">
                      {documentData.current_version?.original_file_name || documentData.current_version?.file_name || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      ผู้อัปโหลด
                    </p>
                    <p className="font-medium">{documentData.creator?.full_name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {THAI_LABELS.category}
                    </p>
                    <p className="font-medium">{documentData.category?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {THAI_LABELS.document_type}
                    </p>
                    <p className="font-medium">{documentData.document_type?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {THAI_LABELS.department}
                    </p>
                    <p className="font-medium">{documentData.department || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {THAI_LABELS.upload_date}
                    </p>
                    <p className="font-medium">{formatDateTime(documentData.created_at)}</p>
                  </div>
                  {documentData.effective_date && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {THAI_LABELS.effective_date}
                      </p>
                      <p className="font-medium">{formatDateTime(documentData.effective_date)}</p>
                    </div>
                  )}
                  {documentData.expiry_date && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {THAI_LABELS.expiry_date}
                      </p>
                      <p className="font-medium">{formatDateTime(documentData.expiry_date)}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(documentData.status)}
                  {getConfidentialityBadge(documentData.confidentiality_level)}
                </div>

                {documentData.tags && documentData.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{THAI_LABELS.tags}</p>
                      <div className="flex flex-wrap gap-2">
                        {documentData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ประวัติเวอร์ชัน</CardTitle>
                <CardDescription>
                  เวอร์ชันทั้งหมดของเอกสารนี้
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        version.is_current ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            v{version.version_number}
                          </span>
                          {version.is_current && (
                            <Badge variant="default" className="text-xs">ปัจจุบัน</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {version.original_file_name || version.file_name}
                        </p>
                        {version.version_note && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.version_note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          อัปโหลด {formatRelativeTime(version.uploaded_at)}
                        </p>
                      </div>
                      {!version.is_current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(version.id)}
                          disabled={actionLoading !== null}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {THAI_LABELS.download}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>บันทึกการใช้งาน</CardTitle>
                  <CardDescription>
                    ประวัติการเข้าถึงและแก้ไขเอกสาร
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {auditLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        ไม่มีบันทึกการใช้งาน
                      </p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="mt-0.5">
                            {log.result === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.action}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.result}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.user?.full_name || 'Unknown'} • {formatRelativeTime(log.created_at)}
                            </p>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ขนาดไฟล์</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {documentData.current_version?.file_size
                  ? `${(documentData.current_version.file_size / 1024 / 1024).toFixed(2)} MB`
                  : '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ประเภทไฟล์</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium uppercase">
                {documentData.current_version?.file_extension || '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{THAI_LABELS.checkout}</DialogTitle>
            <DialogDescription>
              คุณต้องการยืมเอกสาร "{documentData.title}" เพื่อแก้ไขหรือไม่?
              ขณะที่เอกสารถูกยืม ผู้ใช้อื่นจะไม่สามารถแก้ไขได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>
              {THAI_LABELS.cancel}
            </Button>
            <Button onClick={handleCheckout} disabled={actionLoading !== null}>
              {actionLoading === 'checkout' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {THAI_LABELS.checkout}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkin Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{THAI_LABELS.checkin}</DialogTitle>
            <DialogDescription>
              คุณต้องการคืนเอกสาร "{documentData.title}" หรือไม่?
              หลังจากคืนเอกสาร ผู้ใช้อื่นจะสามารถยืมเพื่อแก้ไขได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinDialogOpen(false)}>
              {THAI_LABELS.cancel}
            </Button>
            <Button onClick={handleCheckin} disabled={actionLoading !== null}>
              {actionLoading === 'checkin' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              {THAI_LABELS.checkin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
