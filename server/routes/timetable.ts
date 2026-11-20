import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { isPostgresConnected, pgGetTimetable, pgCreateTimetableSlot, pgUpdateTimetableSlot, pgDeleteTimetableSlot } from '../pg';
import { TimetableSlot } from '../../src/types';

export const timetableRouter = Router();

// GET /api/timetable/classroom/:classroomId/weekly
timetableRouter.get('/classroom/:classroomId/weekly', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;

    if (isPostgresConnected()) {
      const slots = await pgGetTimetable(classroomId);
      return res.json({
        success: true,
        message: 'Weekly timetable retrieved from PostgreSQL',
        data: slots,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const slots = db.timetable.filter((s) => !classroomId || s.classroomId === classroomId);

    return res.json({
      success: true,
      message: 'Weekly timetable retrieved',
      data: slots,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch timetable',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/timetable/classroom/:classroomId/day/:day
timetableRouter.get('/classroom/:classroomId/day/:day', async (req: Request, res: Response) => {
  try {
    const { classroomId, day } = req.params;

    if (isPostgresConnected()) {
      const slots = await pgGetTimetable(classroomId, day);
      return res.json({
        success: true,
        message: 'Day timetable retrieved from PostgreSQL',
        data: slots,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const slots = db.timetable.filter(
      (s) =>
        (!classroomId || s.classroomId === classroomId) &&
        s.day.toUpperCase() === (day as string).toUpperCase()
    );

    return res.json({
      success: true,
      message: 'Day timetable retrieved',
      data: slots,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch timetable for day',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/timetable/faculty/:facultyId/weekly
timetableRouter.get('/faculty/:facultyId/weekly', async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;

    if (isPostgresConnected()) {
      const slots = await pgGetTimetable(undefined, undefined, facultyId);
      return res.json({
        success: true,
        message: 'Faculty timetable retrieved from PostgreSQL',
        data: slots,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const slots = db.timetable.filter(
      (s) => s.facultyId === facultyId || s.facultyName.toLowerCase().includes('sharma')
    );

    return res.json({
      success: true,
      message: 'Faculty timetable retrieved',
      data: slots,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch faculty timetable',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/timetable
timetableRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (isPostgresConnected()) {
      const slot = await pgCreateTimetableSlot(body);
      return res.status(201).json({
        success: true,
        message: 'Timetable slot created in PostgreSQL',
        data: slot,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const newSlot: TimetableSlot = {
      ...body,
      id: `slot_${Date.now()}`,
    };

    db.timetable.push(newSlot);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Timetable slot created',
      data: newSlot,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create timetable slot',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/timetable/:id
timetableRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const updated = await pgUpdateTimetableSlot(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Timetable slot not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Timetable slot updated in PostgreSQL',
        data: updated,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const index = db.timetable.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Timetable slot not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = {
      ...db.timetable[index],
      ...req.body,
      id,
    };

    db.timetable[index] = updated;
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Timetable slot updated',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update timetable slot',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/timetable/:id
timetableRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const deleted = await pgDeleteTimetableSlot(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Timetable slot not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Timetable slot deleted from PostgreSQL',
        data: { success: true, id },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const initialLen = db.timetable.length;

    db.timetable = db.timetable.filter((s) => s.id !== id);

    if (db.timetable.length === initialLen) {
      return res.status(404).json({
        success: false,
        message: 'Timetable slot not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Timetable slot deleted',
      data: { success: true, id },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete timetable slot',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
