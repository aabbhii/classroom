import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { isPostgresConnected, pgGetClassrooms, pgCreateClassroom, pgUpdateClassroom, pgDeleteClassroom } from '../pg';
import { Classroom } from '../../src/types';

export const classroomsRouter = Router();

// GET /api/classrooms (supports ?department=...)
classroomsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const department = req.query.department as string;

    if (isPostgresConnected()) {
      const results = await pgGetClassrooms(department);
      return res.json({
        success: true,
        message: 'Classrooms retrieved from PostgreSQL',
        data: results,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    let results = db.classrooms;
    if (department && department !== 'ALL') {
      results = results.filter(
        (c) => c.department.toLowerCase() === department.toLowerCase()
      );
    }

    return res.json({
      success: true,
      message: 'Classrooms retrieved successfully',
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch classrooms',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/classrooms
classroomsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.name || !body.department) {
      return res.status(400).json({
        success: false,
        message: 'Classroom name and department are required',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    if (isPostgresConnected()) {
      const created = await pgCreateClassroom(body);
      return res.status(201).json({
        success: true,
        message: 'Classroom created in PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const newClassroom: Classroom = {
      ...body,
      id: `cls_${Date.now()}`,
      totalStudents: Number(body.totalStudents) || 0,
      totalSubjects: Number(body.totalSubjects) || 6,
      createdAt: new Date().toISOString(),
    };

    db.classrooms.push(newClassroom);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: newClassroom,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create classroom',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/classrooms/:id
classroomsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const updated = await pgUpdateClassroom(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Classroom updated in PostgreSQL',
        data: updated,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const index = db.classrooms.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = {
      ...db.classrooms[index],
      ...req.body,
      id,
    };

    db.classrooms[index] = updated;
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Classroom updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update classroom',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/classrooms/:id
classroomsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const deleted = await pgDeleteClassroom(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Classroom deleted from PostgreSQL',
        data: { success: true, id },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const initialLen = db.classrooms.length;

    db.classrooms = db.classrooms.filter((c) => c.id !== id);

    if (db.classrooms.length === initialLen) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Classroom deleted successfully',
      data: { success: true, id },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete classroom',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
