import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  Edit,
  Clock,
  Lock,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Grid,
  List,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { THAI_LABELS } from '@/lib/constants';
import { formatDateTime, formatFileSize, formatRelativeTime } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Document, DocumentVersion, Category, DocumentType, Profile } from '@/types/database';

interface DocumentWithDetails extends Document {
  category: Category | null;
  document_type: DocumentType | null;
  creator: Profile | null;
  current_version: DocumentVersion | null;
}

const ITEMS_PER_PAGE = 10;

export default function DocumentLibraryPage() {
  const { isAdmin } = useAuth();
  const { categories, documentTypes } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [confidentialityFilter, setConfidentialityFilter] = useState(
    searchParams.get('confidentiality') || 'all'
  );

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(
          `
          *,
          category:categories(id, name),
          document_type:document_types(id, name),
          creator:profiles!documents_created_by_fkey(id, full_name, email),
          current_version:document_versions!documents_current_version_id_fkey(
            id,
            file_name,
            file_extension,
            mime_type,
            file_size
          )
        `,
          { count: 'exact' }
        )

        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      // Apply search
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('document_type_id', typeFilter);
      }

      if (confidentialityFilter !== 'all') {
        query = query.eq('confidentiality_level', confidentialityFilter);
      }

      // Pagination
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setDocuments((data as DocumentWithDetails[]) || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, typeFilter, confidentialityFilter, page]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (confidentialityFilter !== 'all') params.set('confidentiality', confidentialityFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, categoryFilter, typeFilter, confidentialityFilter, setSearchParams]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setTypeFilter('all');
    setConfidentialityFilter('all');
    setPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const hasActiveFilters =
    search ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    confidentialityFilter !== 'all';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.documents}</h1>
          <p className="text-muted-foreground">
            จัดการและค้นหาเอกสารทั้งหมดในระบบ
          </p>
        </div>
        <Button asChild>
          <Link to="/documents/upload">
            <Upload className="h-4 w-4 mr-2" />
            {THAI_LABELS.upload_document}
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเอกสาร..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={THAI_LABELS.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                  <SelectItem value="active">{THAI_LABELS.active}</SelectItem>
                  <SelectItem value="draft">{THAI_LABELS.draft}</SelectItem>
                  <SelectItem value="under_review">{THAI_LABELS.under_review}</SelectItem>
                  <SelectItem value="approved">{THAI_LABELS.approved}</SelectItem>
                  <SelectItem value="rejected">{THAI_LABELS.rejected}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={THAI_LABELS.category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    ตัวกรองเพิ่มเติม
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1">!</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{THAI_LABELS.document_type}</Label>
                      <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder={THAI_LABELS.all} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{THAI_LABELS.confidentiality_level}</Label>
                      <Select value={confidentialityFilter} onValueChange={(v) => { setConfidentialityFilter(v); setPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder={THAI_LABELS.all} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{THAI_LABELS.all}</SelectItem>
                          <SelectItem value="public_internal">{THAI_LABELS.public_internal}</SelectItem>
                          <SelectItem value="department">{THAI_LABELS.department_confidential}</SelectItem>
                          <SelectItem value="confidential">{THAI_LABELS.confidential}</SelectItem>
                          <SelectItem value="restricted">{THAI_LABELS.restricted}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
                        {THAI_LABELS.clear_filter}
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {THAI_LABELS.showing} {' '}
          <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span>
          {' '}-{THAI_LABELS.of}{' '}
          <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, total)}</span>
          {' '}{THAI_LABELS.results}
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">{THAI_LABELS.no_results}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'ไม่พบเอกสารที่ตรงกับเงื่อนไขค้นหา'
                  : 'ยังไม่มีเอกสารในระบบ'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  {THAI_LABELS.clear_filter}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{THAI_LABELS.title}</TableHead>
                  <TableHead>{THAI_LABELS.category}</TableHead>
                  <TableHead>{THAI_LABELS.document_type}</TableHead>
                  <TableHead>{THAI_LABELS.status}</TableHead>
                  <TableHead>{THAI_LABELS.confidentiality_level}</TableHead>
                  <TableHead>{THAI_LABELS.upload_date}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link to={`/documents/${doc.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.current_version?.file_name || '-'}
                            </p>
                          </div>
                          {doc.checked_out_by && (
                            <Lock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{doc.category?.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{doc.document_type?.name || '-'}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{getConfidentialityBadge(doc.confidentiality_level)}</TableCell>
                    <TableCell className="text-sm">
                      {formatRelativeTime(doc.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>การกระทำ</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link to={`/documents/${doc.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              {THAI_LABELS.view}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/documents/${doc.id}?download=true`}>
                              <Download className="h-4 w-4 mr-2" />
                              {THAI_LABELS.download}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/documents/${doc.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              {THAI_LABELS.edit_metadata}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link key={doc.id} to={`/documents/${doc.id}`}>
              <Card className="group hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    {doc.checked_out_by && (
                      <Lock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <CardTitle className="line-clamp-1 text-lg">{doc.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {doc.description || doc.current_version?.file_name || '-'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getStatusBadge(doc.status)}
                    {getConfidentialityBadge(doc.confidentiality_level)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>{doc.category?.name || '-'} • {doc.document_type?.name || '-'}</p>
                    <p>{formatRelativeTime(doc.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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
