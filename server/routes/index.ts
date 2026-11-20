import { Router } from 'express';
import { authRouter } from './auth';
import { classroomsRouter } from './classrooms';
import { timetableRouter } from './timetable';
import { announcementsRouter } from './announcements';
import { eventsRouter } from './events';
import { resourcesRouter } from './resources';
import { projectsRouter } from './projects';
import { studyRouter } from './study';
import { aiRouter } from './ai';
import { isPostgresConnected } from '../pg';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/classrooms', classroomsRouter);
apiRouter.use('/timetable', timetableRouter);
apiRouter.use('/announcements', announcementsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/resources', resourcesRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/study', studyRouter);
apiRouter.use('/ai', aiRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'Smart Classroom Management System',
    timestamp: new Date().toISOString(),
    backend: 'unified-express',
    database: isPostgresConnected() ? 'PostgreSQL' : 'LocalStore',
  });
});
