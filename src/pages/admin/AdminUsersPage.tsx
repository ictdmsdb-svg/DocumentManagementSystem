import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  MoreHorizontal,
  Loader2,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THAI_LABELS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types/database';

export default function AdminUsersPage() {
  const { toast } = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | 'change_role' | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data as Profile[]) || [];

      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(u =>
          statusFilter === 'active' ? u.is_active : !u.is_active
        );
      }

      setUsers(filteredData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    setActionLoading(true);
    try {
      if (actionType === 'activate') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast({ title: 'เปิดใช้งานผู้ใช้สำเร็จ' });
      } else if (actionType === 'deactivate') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast({ title: 'ปิดการใช้งานผู้ใช้สำเร็จ' });
      } else if (actionType === 'change_role') {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast({ title: 'เปลี่ยนบทบาทสำเร็จ' });
      }

      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: error.message,
      });
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const openActionDialog = (user: Profile, action: 'activate' | 'deactivate' | 'change_role') => {
    setSelectedUser(user);
    setActionType(action);
    if (action === 'change_role') {
      setNewRole(user.role);
    }
    setActionDialogOpen(true);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.users}</h1>
        <p className="text-muted-foreground">
          จัดการผู้ใช้งานในระบบ
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาผู้ใช้..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="บทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                <SelectItem value="admin">{THAI_LABELS.admin}</SelectItem>
                <SelectItem value="user">{THAI_LABELS.user}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                <SelectItem value="active">{THAI_LABELS.active}</SelectItem>
                <SelectItem value="inactive">{THAI_LABELS.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ใช้งาน</TableHead>
                  <TableHead>{THAI_LABELS.email}</TableHead>
                  <TableHead>{THAI_LABELS.department}</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>{THAI_LABELS.last_login}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                      <p className="mt-4">{THAI_LABELS.no_users}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || '-'}</p>
                            <p className="text-sm text-muted-foreground">{user.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? (
                            <>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {THAI_LABELS.admin}
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              {THAI_LABELS.user}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? THAI_LABELS.active : THAI_LABELS.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.last_login_at ? formatRelativeTime(user.last_login_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.is_active ? (
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'deactivate')}>
                                <UserX className="h-4 w-4 mr-2" />
                                ปิดการใช้งาน
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openActionDialog(user, 'activate')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                {THAI_LABELS.active}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openActionDialog(user, 'change_role')}>
                              <Shield className="h-4 w-4 mr-2" />
                              เปลี่ยนบทบาท
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'activate' && 'เปิดใช้งานผู้ใช้'}
              {actionType === 'deactivate' && 'ปิดการใช้งานผู้ใช้'}
              {actionType === 'change_role' && 'เปลี่ยนบทบาท'}
            </DialogTitle>
            <DialogDescription>
              ผู้ใช้: {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'change_role' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>บทบาทใหม่</Label>
                <Select value={newRole} onValueChange={(v: 'admin' | 'user') => setNewRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{THAI_LABELS.user}</SelectItem>
                    <SelectItem value="admin">{THAI_LABELS.admin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              {THAI_LABELS.cancel}
            </Button>
            <Button onClick={handleAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {THAI_LABELS.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
