import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { isPostgresConnected, pgGetEvents, pgCreateEvent, pgDeleteEvent } from '../pg';
import { AcademicEvent, EventType } from '../../src/types';

export const eventsRouter = Router();

// GET /api/events/classroom/:classroomId?type=...&from=...&to=...
eventsRouter.get('/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const type = req.query.type as EventType | 'ALL';
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (isPostgresConnected()) {
      const list = await pgGetEvents(classroomId, type);
      return res.json({
        success: true,
        message: 'Events retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    let list = db.events.filter((e) => !classroomId || e.classroomId === classroomId);

    if (type && type !== 'ALL') {
      list = list.filter((e) => e.type === type);
    }

    if (from) {
      const fromTime = new Date(from).getTime();
      list = list.filter((e) => new Date(e.dateTime).getTime() >= fromTime);
    }

    if (to) {
      const toTime = new Date(to).getTime();
      list = list.filter((e) => new Date(e.dateTime).getTime() <= toTime);
    }

    list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    return res.json({
      success: true,
      message: 'Events retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch events',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/events/classroom/:classroomId/upcoming
eventsRouter.get('/classroom/:classroomId/upcoming', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const limit = Number(req.query.limit) || 3;

    if (isPostgresConnected()) {
      const upcoming = await pgGetEvents(classroomId, undefined, limit);
      return res.json({
        success: true,
        message: 'Upcoming events retrieved from PostgreSQL',
        data: upcoming,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const now = Date.now();

    const upcoming = db.events
      .filter((e) => (!classroomId || e.classroomId === classroomId) && new Date(e.dateTime).getTime() >= now - 86400000)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, limit);

    return res.json({
      success: true,
      message: 'Upcoming events retrieved',
      data: upcoming,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch upcoming events',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/events
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (isPostgresConnected()) {
      const created = await pgCreateEvent(body);
      return res.status(201).json({
        success: true,
        message: 'Event created in PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const newEvent: AcademicEvent = {
      ...body,
      id: `evt_${Date.now()}`,
    };

    db.events.push(newEvent);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Event created',
      data: newEvent,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create event',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/events/:id
eventsRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const index = db.events.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = {
      ...db.events[index],
      ...req.body,
      id,
    };

    db.events[index] = updated;
    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Event updated',
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update event',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const deleted = await pgDeleteEvent(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Event not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Event deleted from PostgreSQL',
        data: { success: true, id },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const initialLen = db.events.length;

    db.events = db.events.filter((e) => e.id !== id);

    if (db.events.length === initialLen) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Event deleted',
      data: { success: true, id },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete event',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
