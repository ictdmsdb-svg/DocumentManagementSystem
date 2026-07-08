import { useState, useEffect, useCallback } from 'react';
import { FolderPlus, Folder, MoreHorizontal, Loader2, Edit, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { THAI_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types/database';
import { useApp } from '@/contexts/AppContext';

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const { refreshCategories } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true,
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, parent:categories(id, name)')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories((data as Category[]) || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: 'ไม่สามารถโหลดหมวดหมู่ได้',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', parent_id: '', is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'กรุณากรอกชื่อหมวดหมู่',
      });
      return;
    }

    setFormLoading(true);
    try {
      const level = form.parent_id
        ? (categories.find(c => c.id === form.parent_id)?.level || 0) + 1
        : 0;

      const payload = {
        name: form.name,
        description: form.description || null,
        parent_id: form.parent_id || null,
        level,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({ title: THAI_LABELS.save_success });
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
        toast({ title: THAI_LABELS.upload_success.replace('อัปโหลด', 'สร้าง') });
      }

      setDialogOpen(false);
      loadCategories();
      refreshCategories();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: error.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;
      toast({ title: 'ลบหมวดหมู่สำเร็จ' });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      loadCategories();
      refreshCategories();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: THAI_LABELS.error_generic,
        description: error.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Get root categories (no parent)
  const rootCategories = categories.filter((c) => !c.parent_id);

  // Get child categories for a parent
  const getChildCategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{THAI_LABELS.categories}</h1>
          <p className="text-muted-foreground">
            จัดการหมวดหมู่เอกสาร
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <FolderPlus className="h-4 w-4 mr-2" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Categories Tree */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="mt-4">{THAI_LABELS.no_categories}</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                เพิ่มหมวดหมู่แรก
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{THAI_LABELS.category}</TableHead>
                  <TableHead>คำอธิบาย</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>{THAI_LABELS.last_modified}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rootCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    allCategories={categories}
                    getChildCategories={getChildCategories}
                    onEdit={openEditDialog}
                    onDelete={(cat) => {
                      setCategoryToDelete(cat);
                      setDeleteDialogOpen(true);
                    }}
                    level={0}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'แก้ไขข้อมูลหมวดหมู่'
                : 'สร้างหมวดหมู่ใหม่สำหรับจัดกลุ่มเอกสาร'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อหมวดหมู่ *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ชื่อหมวดหมู่"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">คำอธิบาย</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="คำอธิบาย (ไม่บังคับ)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">หมวดหมู่แม่</Label>
              <Select
                value={form.parent_id}
                onValueChange={(v) => setForm({ ...form, parent_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ไม่มี (หมวดหมู่ระดับบนสุด)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ไม่มี (หมวดหมู่ระดับบนสุด)</SelectItem>
                  {categories
                    .filter((c) => c.level < 3)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {THAI_LABELS.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {THAI_LABELS.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{THAI_LABELS.delete_confirm}</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบหมวดหมู่ "{categoryToDelete?.name}" หรือไม่?
              <br />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{THAI_LABELS.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {THAI_LABELS.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Category Row Component (recursive for tree structure)
function CategoryRow({
  category,
  allCategories,
  getChildCategories,
  onEdit,
  onDelete,
  level,
}: {
  category: Category;
  allCategories: Category[];
  getChildCategories: (parentId: string) => Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  level: number;
}) {
  const children = getChildCategories(category.id);
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      <TableRow className={level > 0 ? 'bg-muted/30' : ''}>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            {children.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    expanded ? 'rotate-90' : ''
                  }`}
                />
              </Button>
            ) : (
              <span className="w-6" />
            )}
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{category.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {category.description || '-'}
        </TableCell>
        <TableCell>
          <Badge variant={category.is_active ? 'default' : 'secondary'}>
            {category.is_active ? 'ใช้งาน' : 'ปิดการใช้งาน'}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {formatDateTime(category.updated_at)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="h-4 w-4 mr-2" />
                {THAI_LABELS.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(category)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {THAI_LABELS.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {expanded &&
        children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            allCategories={allCategories}
            getChildCategories={getChildCategories}
            onEdit={onEdit}
            onDelete={onDelete}
            level={level + 1}
          />
        ))}
    </>
  );
}
