# DMS - Document Management System

A secure, enterprise-grade Document Management System for internal department use. Built with React, TypeScript, Supabase, and Google Drive integration.

## Features

- **Secure Authentication** - Email/password authentication via Supabase with role-based access control
- **Document Management** - Upload, view, download, edit metadata, and manage document versions
- **Permission System** - Fine-grained document-level permissions with RLS enforcement
- **Version Control** - Track all document versions with full history
- **Check-in/Check-out** - Prevent concurrent editing conflicts
- **Audit Trail** - Comprehensive logging of all system activities
- **Thai Language UI** - User interface in Thai language

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend      │────▶│   Supabase      │────▶│  Google Drive   │
│  (React/Vite)   │     │  (PostgreSQL +  │     │   (File Store)  │
│                 │     │  Auth + Edge    │     │                 │
│                 │     │  Functions)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Security Architecture

- **Zero Trust Frontend** - All sensitive operations verified server-side
- **Row Level Security (RLS)** - Every database table protected
- **Server-side File Operations** - All Google Drive operations through Edge Functions
- **Audit Everything** - Every access and mutation is logged
- **Private Files by Default** - No public links unless explicitly enabled

## Prerequisites

- Node.js 18+
- Supabase account
- Google Cloud project with Drive API enabled

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable email authentication in Authentication > Providers
3. The database migrations are already applied (RLS enabled on all tables)
4. Configure Edge Function secrets (see below)

### 2. Google Cloud Setup

1. Create a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Google Drive API
3. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Grant "Editor" role
4. Create JSON key for the service account
5. Create a folder in Google Drive for DMS documents
6. Share the folder with the Service Account email (Editor access)
7. Copy the Folder ID from the URL

### 3. Configure Edge Function Secrets

The following secrets must be configured in Supabase Edge Function Secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `GOOGLE_CLIENT_EMAIL` | Service Account email | `dms@project-id.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Service Account private key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` |
| `GOOGLE_DRIVE_FOLDER_ID` | Central DMS folder ID | `1abc2def3ghi4jkl` |
| `GOOGLE_DRIVE_ARCHIVE_FOLDER_ID` | Archive folder ID (optional) | `5mno6pqr7stu8vwx` |

**Note:** DO NOT store these in `.env` files - use Supabase Edge Function Secrets only.

### 4. Frontend Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Create First Admin User

1. Register a new account through the app
2. In Supabase Dashboard > SQL Editor, run:

```sql
-- Activate the user and make them admin
UPDATE profiles 
SET is_active = true, role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

### 6. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Security Checklist

- [x] RLS enabled on all tables
- [x] No service role key in frontend
- [x] No Google private key in frontend
- [x] Files are private by default
- [x] Edge Functions verify permissions before file access
- [x] Audit logs for all operations
- [x] Users cannot view unauthorized documents
- [x] Public link mode disabled by default
- [x] SQL injection protected (parameterized queries)
- [x] XSS protected (React auto-escapes)
- [x] CSRF protected (SameSite cookies)

## File Upload Security

- Maximum file size: 50MB
- Allowed file types: PDF, Word, Excel, PowerPoint, images, text
- Blocked extensions: `.exe`, `.bat`, `.cmd`, `.js`, `.vbs`, `.jar`, `.msi`, etc.
- Filename sanitization: Special characters removed, path traversal blocked
- MIME type validation: Server-side verification of actual content type

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all documents, users, and settings |
| `user` | Access only to permitted documents; can request access |

## Permission Types

| Permission | Description |
|------------|-------------|
| `view` | View document metadata and content |
| `download` | Download document file |
| `edit_metadata` | Edit document title, description, tags |
| `upload_new_version` | Upload new version of document |
| `delete` | Delete/archive document |
| `approve` | Approve workflow status changes |
| `check_out` | Check out document for editing |
| `check_in` | Check in document after editing |
| `manage_permissions` | Grant/revoke permissions on document |

## API (Edge Functions)

| Function | Method | Description |
|----------|--------|-------------|
| `google-drive-upload` | POST | Upload document to Google Drive |
| `google-drive-view` | POST | Get view URL for document |
| `google-drive-download` | POST | Get download URL for document |
| `document-checkout` | POST | Check out document |
| `document-checkin` | POST | Check in document |

## Database Schema

### Core Tables

- `profiles` - User profiles linked to auth.users
- `documents` - Document metadata
- `document_versions` - Version history
- `document_permissions` - Fine-grained access control
- `categories` - Hierarchical document organization
- `document_types` - Document type definitions
- `audit_logs` - Audit trail
- `access_requests` - User access requests
- `system_settings` - System configuration

## Troubleshooting

### "Google Drive is not configured"
Ensure all Google secrets are set in Supabase Edge Function Secrets.

### "User account is not yet activated"
Admin must activate the user in Admin > Users.

### "You do not have permission"
Check document permissions in Admin > Permissions.

## License

Internal use only.

## Support

Contact your system administrator for support.
