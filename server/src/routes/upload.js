/**
 * File upload routes
 * Replaces base44.integrations.Core.UploadFile()
 *
 * POST /api/v1/upload
 *   Body: multipart/form-data with "file" field
 *   Response: { file_url, file_name, file_size }
 *
 * For production, this should generate a presigned URL for direct-to-S3 upload.
 * For development, files are stored locally in server/uploads/.
 */

import { Router } from 'express';
import express from 'express';
import multer from 'multer';
import { mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ── POST /api/v1/upload ──
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const { filename, originalname, size } = req.file;
  const publicUrl = `${process.env.API_BASE_URL || ''}/uploads/${filename}`;

  res.json({
    file_url: publicUrl,
    file_name: originalname,
    file_size: size,
  });
});

// ── Serve uploaded files (development only) ──
if (process.env.NODE_ENV !== 'production') {
  router.use('/uploads', express.static(UPLOAD_DIR));
}

export { router as uploadRouter };
