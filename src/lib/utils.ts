import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const thaiYear = year + 543;
  const monthNames = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  return `${d.getDate()} ${monthNames[d.getMonth()]} ${thaiYear}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  return `${formatDate(d)} ${time}`;
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} วันที่แล้ว`;
  }
  if (hours > 0) {
    return `${hours} ชั่วโมงที่แล้ว`;
  }
  if (minutes > 0) {
    return `${minutes} นาทีที่แล้ว`;
  }
  return 'เมื่อสักครู่';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '-';

  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function sanitizeFileName(name: string): string {
  // Remove path traversal attempts
  let sanitized = name.replace(/\.\./g, '');

  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_\u0E00-\u0E7F]/g, '_');

  // Remove multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_|_$/g, '');

  // Limit length
  if (sanitized.length > 100) {
    const ext = getExtension(sanitized);
    sanitized = sanitized.substring(0, 100 - ext.length - 1) + '.' + ext;
  }

  return sanitized;
}

export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function generateUniqueFileName(
  documentId: string,
  version: number,
  originalName: string
): string {
  const extension = getExtension(originalName);
  const sanitized = sanitizeFileName(originalName.replace(/\.[^.]+$/, ''));

  return `${documentId}_v${version}_${sanitized}.${extension}`;
}

export function getMimeTypeColor(mimeType: string | null | undefined): string {
  if (!mimeType) return 'bg-muted';

  if (mimeType.startsWith('image/')) return 'bg-green-500';
  if (mimeType === 'application/pdf') return 'bg-red-500';
  if (mimeType.includes('word')) return 'bg-blue-500';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-emerald-600';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'bg-orange-500';
  if (mimeType.startsWith('text/')) return 'bg-gray-500';

  return 'bg-muted';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function convertToThaiDate(date: Date): string {
  const year = date.getFullYear();
  const thaiYear = year + 543;
  const monthNames = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  return `${date.getDate()} ${monthNames[date.getMonth()]} ${thaiYear}`;
}
