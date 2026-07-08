import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  Users,
  TrendingUp,
  Loader2,
  Eye,
  Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { THAI_LABELS } from '@/lib/constants';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Document, DocumentVersion, Profile } from '@/types/database';

interface DashboardStats {
  totalDocuments: number;
  uploadedThisMonth: number;
  awaitingReview: number;
  checkedOut: number;
}

interface RecentDocument extends Document {
  current_version?: DocumentVersion;
  profiles?: Profile;
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    uploadedThisMonth: 0,
    awaitingReview: 0,
    checkedOut: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [checkedOutDocuments, setCheckedOutDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get current month start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch total documents count
      const { count: totalDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

      // Fetch documents uploaded this month
      const { count: uploadedThisMonth } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .eq('is_archived', false);

      // Fetch documents awaiting review
      const { count: awaitingReview } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review')
        .eq('is_archived', false);

      // Fetch checked out documents
      const { count: checkedOut } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .not('checked_out_by', 'is', null)
        .eq('is_archived', false);

      setStats({
        totalDocuments: totalDocuments || 0,
        uploadedThisMonth: uploadedThisMonth || 0,
        awaitingReview: awaitingReview || 0,
        checkedOut: checkedOut || 0,
      });

      // Fetch recent documents
      const { data: recentData } = await supabase
        .from('documents')
        .select(`
          *,
          current_version:document_versions(
            file_name,
            file_extension,
            mime_type,
            file_size
          ),
          profiles:created_by(id, full_name, email)
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentDocuments((recentData as RecentDocument[]) || []);

      // Fetch checked out documents
      const { data: checkedOutData } = await supabase
        .from('documents')
        .select(`
          *,
          current_version:document_versions(
            file_name,
            file_extension,
            mime_type,
            file_size
          ),
          profiles:created_by(id, full_name, email)
        `)
        .not('checked_out_by', 'is', null)
        .eq('is_archived', false)
        .order('checked_out_at', { ascending: false })
        .limit(5);

      setCheckedOutDocuments((checkedOutData as RecentDocument[]) || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      active: 'default',
      under_review: 'outline',
      approved: 'default',
      rejected: 'destructive',
      archived: 'secondary',
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
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getConfidencialityBadge = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      public_internal: 'outline',
      department: 'secondary',
      confidential: 'default',
      restricted: 'destructive',
    };

    const colors: Record<string, string> = {
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
      <Badge variant={variants[level] || 'default'} className={colors[level]}>
        {labels[level] || level}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.dashboard}</h1>
          <p className="text-muted-foreground">
            ภาพรวมของระบบจัดการเอกสาร
          </p>
        </div>
        <Button asChild>
          <Link to="/documents/upload">
            <Upload className="h-4 w-4 mr-2" />
            {THAI_LABELS.upload_document}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {THAI_LABELS.total_documents}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารทั้งหมดในระบบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {THAI_LABELS.uploaded_this_month}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uploadedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารที่อัปโหลดเดือนนี้
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {THAI_LABELS.awaiting_review}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.awaitingReview}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารรอการตรวจสอบ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {THAI_LABELS.checked_out_documents}
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedOut}</div>
            <p className="text-xs text-muted-foreground">
              เอกสารที่ถูกเช็คเอาต์
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>{THAI_LABELS.recent_documents}</CardTitle>
            <CardDescription>
              เอกสารล่าสุดที่อัปโหลดเข้าสู่ระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{THAI_LABELS.no_documents}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{THAI_LABELS.title}</TableHead>
                    <TableHead>{THAI_LABELS.status}</TableHead>
                    <TableHead>{THAI_LABELS.upload_date}</TableHead>
                    <TableHead>การกระทำ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.current_version?.file_name || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatRelativeTime(doc.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/documents/${doc.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/documents">
                  ดูเอกสารทั้งหมด
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Checked Out Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {THAI_LABELS.checked_out_documents}
            </CardTitle>
            <CardDescription>
              เอกสารที่ถูกเช็คเอาต์และยังไม่ได้เช็คอิน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkedOutDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ไม่มีเอกสารที่ถูกเช็คเอาต์</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{THAI_LABELS.title}</TableHead>
                    <TableHead>ผู้เช็คเอาต์</TableHead>
                    <TableHead>วันที่เช็คเอาต์</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedOutDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell className="text-sm">
                        {doc.profiles?.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.checked_out_at ? formatRelativeTime(doc.checked_out_at) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Quick Stats */}
      {isAdmin && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              สถิติผู้ดูแลระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.awaitingReview}
                </p>
                <p className="text-sm text-muted-foreground">เอกสารรอการอนุมัติ</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.uploadedThisMonth}
                </p>
                <p className="text-sm text-muted-foreground">อัปโหลดเดือนนี้</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-amber-600">
                  {stats.checkedOut}
                </p>
                <p className="text-sm text-muted-foreground">ถูกเช็คเอาต์</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/users">
                  {THAI_LABELS.users}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/audit-logs">
                  {THAI_LABELS.audit_logs}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
