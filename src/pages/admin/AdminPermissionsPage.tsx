import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  Plus,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Save,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { THAI_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import type { Document, Profile, DocumentPermissionWithDetails } from '@/types/database';
import { PERMISSION_TYPES } from '@/types/database';

type PermissionType = typeof PERMISSION_TYPES[number];

export default function AdminPermissionsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { categories, documentTypes } = useApp();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<DocumentPermissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsResult, usersResult] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, category_id, created_by, status')
          .eq('is_archived', false)
          .order('title'),
        supabase
          .from('profiles')
          .select('id, full_name, email, role, is_active')
          .eq('role', 'user')
          .eq('is_active', true),
      ]);

      setDocuments((docsResult.data as Document[]) || []);
      setUsers((usersResult.data as Profile[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadPermissionsForDocument = async (documentId: string) => {
    const { data } = await supabase
      .from('document_permissions')
      .select('*, user:profiles(id, full_name, email)')
      .eq('document_id', documentId);
    setPermissions((data as DocumentPermissionWithDetails[]) || []);
  };

  const openPermissionDialog = (doc: Document) => {
    setSelectedDocument(doc);
    setSelectedUserId('');
    setSelectedPermissions([]);
    loadPermissionsForDocument(doc.id);
    setDialogOpen(true);
  };

  const handleAddPermission = async () => {
    if (!selectedDocument || !selectedUserId || selectedPermissions.length === 0 || !user) {
      toast.toast({
        variant: 'destructive',
        title: 'กรุณากรอกข้อมูลให้ครบ',
      });
      return;
    }

    setFormLoading(true);
    try {
      // Insert permissions with granted_by field
      const inserts = selectedPermissions.map((permission_type) => ({
        document_id: selectedDocument.id,
        user_id: selectedUserId,
        permission_type,
        granted_by: user.id,
      }));

      const { error } = await supabase
        .from('document_permissions')
        .upsert(inserts, { onConflict: 'document_id,user_id,permission_type' });

      if (error) throw error;

      // Log audit
      await supabase.from('audit_logs').insert([{
        action: 'permission_grant',
        document_id: selectedDocument.id,
        result: 'success',
        details: {
          user_id: selectedUserId,
          permissions: selectedPermissions,
        },
      }]);

      toast.toast({ title: THAI_LABELS.save_success });
      loadPermissionsForDocument(selectedDocument.id);
      setSelectedUserId('');
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: error.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      if (selectedDocument) {
        loadPermissionsForDocument(selectedDocument.id);
      }
    } catch (error: any) {
      toast.toast({
        variant: 'destructive',
        title: 'ลบสิทธิ์ไม่สำเร็จ',
        description: error.message,
      });
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      !search
  );

  const getPermissionLabel = (type: PermissionType): string => {
    const labels: Record<PermissionType, string> = {
      view: THAI_LABELS.view,
      download: THAI_LABELS.download,
      edit_metadata: THAI_LABELS.edit_metadata,
      upload_new_version: THAI_LABELS.upload_new_version,
      delete: THAI_LABELS.delete,
      approve: 'อนุมัติ',
      check_out: THAI_LABELS.checkout,
      check_in: THAI_LABELS.checkin,
      manage_permissions: THAI_LABELS.permissions,
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.permissions}</h1>
        <p className="text-muted-foreground">
          จัดการสิทธิ์การเข้าถึงเอกสาร
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาเอกสาร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการเอกสาร</CardTitle>
          <CardDescription>
            คลิกเพื่อจัดการสิทธิ์ของแต่ละเอกสาร
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{THAI_LABELS.title}</TableHead>
                  <TableHead>{THAI_LABELS.status}</TableHead>
                  <TableHead>จำนวนผู้มีสิทธิ์</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const permCount = permissions.filter(
                    (p) => p.document_id === doc.id
                  ).length;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permCount > 0 ? 'default' : 'secondary'}>
                          {permCount} สิทธิ์
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openPermissionDialog(doc)}>
                          <Shield className="h-4 w-4 mr-2" />
                          จัดการ
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>จัดการสิทธิ์: {selectedDocument?.title}</DialogTitle>
            <DialogDescription>
              เพิ่มหรือลบสิทธิ์การเข้าถึงเอกสาร
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add Permission Form */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">เพิ่มสิทธิ์ใหม่</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ผู้ใช้</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกผู้ใช้" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>สิทธิ์</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSION_TYPES.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={selectedPermissions.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPermissions([...selectedPermissions, type]);
                              } else {
                                setSelectedPermissions(
                                  selectedPermissions.filter((p) => p !== type)
                                );
                              }
                            }}
                          />
                          <label htmlFor={type} className="text-sm">
                            {getPermissionLabel(type)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  className="mt-4"
                  onClick={handleAddPermission}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  เพิ่มสิทธิ์
                </Button>
              </CardContent>
            </Card>

            {/* Current Permissions */}
            <div>
              <h3 className="font-medium mb-2">สิทธิ์ปัจจุบัน</h3>
              <ScrollArea className="h-[200px] border rounded-lg">
                {permissions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    ยังไม่มีสิทธิ์ที่กำหนด
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ผู้ใช้</TableHead>
                        <TableHead>สิทธิ์</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((perm) => (
                        <TableRow key={perm.id}>
                          <TableCell className="text-sm">
                            {perm.user?.full_name || perm.user?.email || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPermissionLabel(perm.permission_type as PermissionType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePermission(perm.id)}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {THAI_LABELS.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
