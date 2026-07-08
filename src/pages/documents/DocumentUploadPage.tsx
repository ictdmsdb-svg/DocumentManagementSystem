import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload,
  File,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { THAI_LABELS, ALLOWED_FILE_TYPES, BLOCKED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/constants';
import { formatFileSize, sanitizeFileName, getExtension } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const uploadSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อเอกสาร').max(200, 'ชื่อเอกสารยาวเกินไป'),
  description: z.string().max(1000, 'คำอธิบายยาวเกินไป').optional(),
  category_id: z.string().optional(),
  document_type_id: z.string().optional(),
  department: z.string().optional(),
  confidentiality_level: z.enum(['public_internal', 'department', 'confidential', 'restricted']),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  version_note: z.string().max(500, 'หมายเหตุยาวเกินไป').optional(),
  tags: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface FileWithPreview {
  file: File;
  preview?: string;
}

interface UploadPageProps {
  editMode?: boolean;
}

export default function DocumentUploadPage({ editMode = false }: UploadPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { categories, documentTypes } = useApp();

  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      confidentiality_level: 'department',
    },
  });

  const confidentialityValue = watch('confidentiality_level');

  const validateFile = (file: File): string | null => {
    const ext = getExtension(file.name);

    // Check for blocked extensions
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return `ประเภทไฟล์ "${ext}" ไม่ได้รับอนุญาต`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${formatFileSize(MAX_FILE_SIZE)})`;
    }

    // Check MIME type
    const allowedMimeTypes = Object.values(ALLOWED_FILE_TYPES).flat();
    if (!allowedMimeTypes.includes(file.type as any)) {
      return `ประเภทไฟล์ "${file.type}" ไม่รองรับ`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setSelectedFile({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile && !editMode) {
      setUploadError('กรุณาเลือกไฟล์ที่จะอัปโหลด');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่');
      }

      // Upload through Edge Function
      // Note: This requires the google-drive-upload Edge Function to be deployed
      setUploadProgress(10);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile.file);
      }
      formData.append('metadata', JSON.stringify({
        title: data.title,
        description: data.description || null,
        category_id: data.category_id || null,
        document_type_id: data.document_type_id || null,
        department: data.department || null,
        confidentiality_level: data.confidentiality_level,
        effective_date: data.effective_date || null,
        expiry_date: data.expiry_date || null,
        version_note: data.version_note || null,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }));

      const { data: result, error } = await supabase.functions.invoke('google-drive-upload', {
        body: formData,
      });

      setUploadProgress(80);

      if (error) {
        throw error;
      }

      setUploadProgress(100);

      toast({
        title: THAI_LABELS.upload_success,
        description: `เอกสาร "${data.title}" ถูกอัปโหลดเรียบร้อยแล้ว`,
      });

      // Navigate to document detail
      navigate(`/documents/${result.document_id}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || THAI_LABELS.upload_error);
      toast({
        variant: 'destructive',
        title: THAI_LABELS.upload_error,
        description: error.message || 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'rtf'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {editMode ? THAI_LABELS.edit_metadata : THAI_LABELS.upload_document}
        </h1>
        <p className="text-muted-foreground">
          {editMode
            ? 'แก้ไขข้อมูลเอกสาร'
            : 'อัปโหลดเอกสารใหม่เข้าสู่ระบบ'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        {!editMode && (
          <Card>
            <CardHeader>
              <CardTitle>เลือกไฟล์เอกสาร</CardTitle>
              <CardDescription>
                ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์ ({THAI_LABELS.file})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                  {selectedFile.preview ? (
                    <img
                      src={selectedFile.preview}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-primary/10 rounded flex items-center justify-center">
                      <File className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.file.size)} • {selectedFile.file.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ชื่อไฟล์ที่จะบันทึก: {sanitizeFileName(selectedFile.file.name)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                    ${isUploading ? 'pointer-events-none opacity-50' : ''}
                  `}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {dragActive ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวางหรือคลิกเพื่อเลือก'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    รองรับไฟล์: {allowedExtensions.join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ขนาดสูงสุด: {formatFileSize(MAX_FILE_SIZE)}
                  </p>
                </div>
              )}

              {uploadError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Document Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเอกสาร</CardTitle>
            <CardDescription>
              ระบุรายละเอียดของเอกสาร
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{THAI_LABELS.title} *</Label>
              <Input
                id="title"
                placeholder="ชื่อเอกสาร"
                {...register('title')}
                disabled={isUploading}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{THAI_LABELS.description}</Label>
              <Textarea
                id="description"
                placeholder="คำอธิบายเอกสาร (ไม่บังคับ)"
                rows={3}
                {...register('description')}
                disabled={isUploading}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id">{THAI_LABELS.category}</Label>
                <Select
                  onValueChange={(value) => setValue('category_id', value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <Label htmlFor="document_type_id">{THAI_LABELS.document_type}</Label>
                <Select
                  onValueChange={(value) => setValue('document_type_id', value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทเอกสาร" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">{THAI_LABELS.department}</Label>
                <Input
                  id="department"
                  placeholder="แผนก"
                  {...register('department')}
                  disabled={isUploading}
                />
              </div>

              {/* Confidentiality Level */}
              <div className="space-y-2">
                <Label htmlFor="confidentiality_level">{THAI_LABELS.confidentiality_level}</Label>
                <Select
                  value={confidentialityValue}
                  onValueChange={(value: any) => setValue('confidentiality_level', value)}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกระดับความลับ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_internal">{THAI_LABELS.public_internal}</SelectItem>
                    <SelectItem value="department">{THAI_LABELS.department_confidential}</SelectItem>
                    <SelectItem value="confidential">{THAI_LABELS.confidential}</SelectItem>
                    <SelectItem value="restricted">{THAI_LABELS.restricted}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Effective Date */}
              <div className="space-y-2">
                <Label htmlFor="effective_date">{THAI_LABELS.effective_date}</Label>
                <Input
                  id="effective_date"
                  type="date"
                  {...register('effective_date')}
                  disabled={isUploading}
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiry_date">{THAI_LABELS.expiry_date}</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  {...register('expiry_date')}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">{THAI_LABELS.tags}</Label>
              <Input
                id="tags"
                placeholder="แท็กคั่นด้วย comma เช่น สัญญา, จัดซื้อ"
                {...register('tags')}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                คั่นแท็กด้วย comma (,)
              </p>
            </div>

            {/* Version Note */}
            {!editMode && (
              <div className="space-y-2">
                <Label htmlFor="version_note">{THAI_LABELS.version_note}</Label>
                <Textarea
                  id="version_note"
                  placeholder="หมายเหตุสำหรับเวอร์ชันนี้"
                  rows={2}
                  {...register('version_note')}
                  disabled={isUploading}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {isUploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">กำลังอัปโหลด...</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{uploadProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isUploading}
          >
            {THAI_LABELS.cancel}
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังอัปโหลด...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {editMode ? THAI_LABELS.save : THAI_LABELS.upload_document}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
