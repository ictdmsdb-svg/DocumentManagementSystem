import { useState, useEffect, useCallback } from 'react';
import { History, Filter, Download, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THAI_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { AuditLog, Profile, Document } from '@/types/database';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AuditLogWithDetails extends AuditLog {
  user?: Profile | null;
  document?: Document | null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(
          `
          *,
          user:profiles(id, full_name, email),
          document:documents(id, title)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (resultFilter !== 'all') {
        query = query.eq('result', resultFilter);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Filter by user on client side if needed
      let filteredData = (data as AuditLogWithDetails[]) || [];

      if (searchUser) {
        filteredData = filteredData.filter(
          (log) =>
            log.user?.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchUser.toLowerCase())
        );
      }

      setLogs(filteredData);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resultFilter, page, dateFrom, dateTo, searchUser]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const clearFilters = () => {
    setActionFilter('all');
    setResultFilter('all');
    setSearchUser('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters =
    actionFilter !== 'all' ||
    resultFilter !== 'all' ||
    searchUser ||
    dateFrom ||
    dateTo;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      user_login: 'เข้าสู่ระบบ',
      user_logout: 'ออกจากระบบ',
      document_upload: 'อัปโหลดเอกสาร',
      document_view: 'ดูเอกสาร',
      document_download: 'ดาวน์โหลด',
      metadata_update: 'แก้ไขข้อมูล',
      permission_grant: 'มอบสิทธิ์',
      permission_revoke: 'เพิกถอนสิทธิ์',
      version_upload: 'อัปโหลดเวอร์ชันใหม่',
      document_checkout: 'เช็คเอาต์',
      document_checkin: 'เช็คอิน',
      document_archive: 'เก็บถาวร',
      document_restore: 'กู้คืน',
      document_delete: 'ลบ',
      access_request_create: 'ขอสิทธิ์',
      access_request_approve: 'อนุมัติคำขอ',
      access_request_reject: 'ปฏิเสธคำขอ',
      workflow_status_change: 'เปลี่ยนสถานะ',
    };
    return labels[action] || action;
  };

  const getResultBadge = (result: string) => {
    const styles: Record<string, string> = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      denied: 'bg-amber-100 text-amber-800',
    };

    const labels: Record<string, string> = {
      success: THAI_LABELS.success,
      failed: THAI_LABELS.failed,
      denied: THAI_LABELS.denied,
    };

    return (
      <Badge className={styles[result] || ''}>
        {labels[result] || result}
      </Badge>
    );
  };

  const actionOptions = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'user_login', label: 'เข้าสู่ระบบ' },
    { value: 'user_logout', label: 'ออกจากระบบ' },
    { value: 'document_upload', label: 'อัปโหลดเอกสาร' },
    { value: 'document_view', label: 'ดูเอกสาร' },
    { value: 'document_download', label: 'ดาวน์โหลด' },
    { value: 'document_checkout', label: 'เช็คเอาต์' },
    { value: 'document_checkin', label: 'เช็คอิน' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.audit_logs}</h1>
          <p className="text-muted-foreground">
            บันทึกการใช้งานระบบทั้งหมด
          </p>
        </div>
        <Button variant="outline" onClick={() => loadLogs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>{THAI_LABELS.action}</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ผลลัพธ์</Label>
              <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="success">{THAI_LABELS.success}</SelectItem>
                  <SelectItem value="failed">{THAI_LABELS.failed}</SelectItem>
                  <SelectItem value="denied">{THAI_LABELS.denied}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ผู้ใช้</Label>
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล"
                value={searchUser}
                onChange={(e) => { setSearchUser(e.target.value); setPage(1); }}
              />
            </div>

            <div className="space-y-2">
              <Label>วันที่</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                />
                <span className="py-2">-</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {THAI_LABELS.clear_filter}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{THAI_LABELS.date_time}</TableHead>
                    <TableHead>{THAI_LABELS.action}</TableHead>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>{THAI_LABELS.documents}</TableHead>
                    <TableHead>ผลลัพธ์</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="mt-4">ไม่พบบันทึก</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user?.full_name || log.user?.email || 'ระบบ'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {log.document?.title || '-'}
                        </TableCell>
                        <TableCell>{getResultBadge(log.result)}</TableCell>
                        <TableCell className="text-sm">
                          {log.details ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  ดู
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
