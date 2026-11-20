import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase, saveDatabase } from '../db';
import { isPostgresConnected, pgGetResources, pgCreateResource, pgDeleteResource } from '../pg';
import { Resource, ResourceType } from '../../src/types';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create uploads directory:', e);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const resourcesRouter = Router();

// GET /api/resources/classroom/:classroomId?subject=...&type=...
resourcesRouter.get('/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const subject = req.query.subject as string;
    const type = req.query.type as ResourceType | 'ALL';

    if (isPostgresConnected()) {
      const list = await pgGetResources(classroomId, subject, type);
      return res.json({
        success: true,
        message: 'Resources retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    let list = db.resources.filter((r) => !classroomId || r.classroomId === classroomId);

    if (subject && subject !== 'ALL') {
      list = list.filter((r) => r.subject.toLowerCase() === subject.toLowerCase());
    }

    if (type && type !== 'ALL') {
      list = list.filter((r) => r.type === type);
    }

    list.sort(
      (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()
    );

    return res.json({
      success: true,
      message: 'Resources retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch resources',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/resources (supports multipart/form-data or json)
resourcesRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const body = req.body;

    const fileSizeFormatted = file
      ? file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`
      : body.fileSize || '2.0 MB';

    const newResource: Resource = {
      id: `res_${Date.now()}`,
      title: body.title || file?.originalname || 'Lecture Material',
      description: body.description || '',
      subject: body.subject || 'General Engineering',
      type: (body.type as ResourceType) || 'NOTES',
      classroomId: body.classroomId || 'cls_cse_3a',
      classroomName: body.classroomName || 'CSE - 3rd Year (Section A)',
      uploadedById: body.uploadedById || 'usr_faculty_01',
      uploadedByName: body.uploadedByName || 'Dr. Ramesh Sharma',
      uploadedDate: new Date().toISOString(),
      fileUrl: file ? `/uploads/${file.filename}` : body.fileUrl || '#',
      fileName: file ? file.originalname : body.fileName || 'document.pdf',
      fileSize: fileSizeFormatted,
      downloadsCount: 0,
    };

    if (isPostgresConnected()) {
      const created = await pgCreateResource(newResource);
      return res.status(201).json({
        success: true,
        message: 'Resource uploaded and saved to PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    db.resources.unshift(newResource);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully',
      data: newResource,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload resource',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/resources/:id
resourcesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.resources.findIndex((r) => r.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = {
      ...db.resources[index],
      ...req.body,
      id,
    };

    db.resources[index] = updated;
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Resource updated',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update resource',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/resources/:id
resourcesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const deleted = await pgDeleteResource(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Resource deleted from PostgreSQL',
        data: { success: true, id },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const initialLen = db.resources.length;

    db.resources = db.resources.filter((r) => r.id !== id);

    if (db.resources.length === initialLen) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Resource deleted',
      data: { success: true, id },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete resource',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
