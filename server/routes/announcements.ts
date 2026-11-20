import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { isPostgresConnected, pgGetAnnouncements, pgCreateAnnouncement, pgDeleteAnnouncement } from '../pg';
import { Announcement, AnnouncementType } from '../../src/types';

export const announcementsRouter = Router();

// GET /api/announcements/feed?classroomId=...&department=...&type=...
announcementsRouter.get('/feed', async (req: Request, res: Response) => {
  try {
    const classroomId = req.query.classroomId as string;
    const department = req.query.department as string;
    const type = req.query.type as AnnouncementType | 'ALL';

    if (isPostgresConnected()) {
      const list = await pgGetAnnouncements(classroomId, department, type);
      return res.json({
        success: true,
        message: 'Announcements feed retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    let list = [...db.announcements];

    if (type && type !== 'ALL') {
      list = list.filter((a) => a.type === type);
    }

    if (classroomId || department) {
      list = list.filter((a) => {
        if (a.type === 'GENERAL') return true;
        if (
          a.type === 'DEPARTMENT' &&
          department &&
          a.department.toLowerCase() === department.toLowerCase()
        ) {
          return true;
        }
        if (a.type === 'SECTION' && classroomId && a.classroomId === classroomId) {
          return true;
        }
        return !classroomId && !department;
      });
    }

    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.json({
      success: true,
      message: 'Announcements feed retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch announcements feed',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/announcements/classroom/:classroomId
announcementsRouter.get('/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;

    if (isPostgresConnected()) {
      const list = await pgGetAnnouncements(classroomId);
      return res.json({
        success: true,
        message: 'Classroom announcements retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const list = db.announcements.filter((a) => a.classroomId === classroomId);

    return res.json({
      success: true,
      message: 'Classroom announcements retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch classroom announcements',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/announcements
announcementsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (isPostgresConnected()) {
      const created = await pgCreateAnnouncement(body);
      return res.status(201).json({
        success: true,
        message: 'Announcement created in PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const newAnnouncement: Announcement = {
      ...body,
      id: `anc_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    db.announcements.unshift(newAnnouncement);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Announcement created',
      data: newAnnouncement,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create announcement',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/announcements/:id
announcementsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.announcements.findIndex((a) => a.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = {
      ...db.announcements[index],
      ...req.body,
      id,
    };

    db.announcements[index] = updated;
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Announcement updated',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update announcement',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/announcements/:id
announcementsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const deleted = await pgDeleteAnnouncement(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Announcement deleted from PostgreSQL',
        data: { success: true, id },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const initialLen = db.announcements.length;

    db.announcements = db.announcements.filter((a) => a.id !== id);

    if (db.announcements.length === initialLen) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Announcement deleted',
      data: { success: true, id },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete announcement',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
