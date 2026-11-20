import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import {
  isPostgresConnected,
  pgGetProjects,
  pgCreateProject,
  pgUpdateProject,
  pgGetJoinRequests,
  pgCreateJoinRequest,
  pgUpdateJoinRequestStatus,
} from '../pg';
import { JoinRequest, Project, ProjectMember, ProjectStatus } from '../../src/types';

export const projectsRouter = Router();

// GET /api/projects/my-requests
projectsRouter.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'usr_student_01';

    if (isPostgresConnected()) {
      const allRequests = await pgGetJoinRequests();
      const list = allRequests.filter(r => r.userId === userId);
      return res.json({
        success: true,
        message: 'User join requests retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const list = db.joinRequests
      .filter((r) => r.userId === userId)
      .map((r) => {
        if (!r.projectTitle) {
          const prj = db.projects.find((p) => p.id === r.projectId);
          return { ...r, projectTitle: prj?.title || 'Collaboration Project' };
        }
        return r;
      });

    return res.json({
      success: true,
      message: 'User join requests retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch my join requests',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/projects
projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (isPostgresConnected()) {
      const list = await pgGetProjects();
      return res.json({
        success: true,
        message: 'Projects retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const list = [...db.projects].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json({
      success: true,
      message: 'Projects retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch projects',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/projects/classroom/:classroomId
projectsRouter.get('/classroom/:classroomId', async (req: Request, res: Response) => {
  try {
    const { classroomId } = req.params;
    const status = req.query.status as ProjectStatus;

    if (isPostgresConnected()) {
      const all = await pgGetProjects();
      const list = all.filter(p => p.classroomId === classroomId && (status ? p.status === status : true));
      return res.json({
        success: true,
        message: 'Classroom projects retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const list = db.projects.filter((p) => {
      const matchCls = p.classroomId === classroomId;
      const matchStatus = status ? p.status === status : true;
      return matchCls && matchStatus;
    });

    return res.json({
      success: true,
      message: 'Classroom projects retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch classroom projects',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/projects/department/:department
projectsRouter.get('/department/:department', async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const status = req.query.status as ProjectStatus;

    if (isPostgresConnected()) {
      const all = await pgGetProjects();
      const list = all.filter(p =>
        p.department.trim().toLowerCase() === decodeURIComponent(department).trim().toLowerCase() &&
        (status ? p.status === status : true)
      );
      return res.json({
        success: true,
        message: 'Department projects retrieved from PostgreSQL',
        data: list,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const list = db.projects.filter((p) => {
      const matchDept =
        p.department.trim().toLowerCase() === decodeURIComponent(department).trim().toLowerCase();
      const matchStatus = status ? p.status === status : true;
      return matchDept && matchStatus;
    });

    return res.json({
      success: true,
      message: 'Department projects retrieved',
      data: list,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch department projects',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const all = await pgGetProjects();
      const project = all.find(p => p.id === id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: 'Project retrieved from PostgreSQL',
        data: project,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const project = db.projects.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Project retrieved',
      data: project,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch project',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/projects
projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const currentUser = req.body.currentUser || {
      userId: 'usr_student_01',
      name: 'Alex Rivera',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
    };

    const newProject: Project = {
      id: `prj_${Date.now()}`,
      title: payload.title || 'Untitled Project',
      description: payload.description || '',
      techStack: payload.techStack || '',
      tags: payload.tags || [],
      repositoryUrl: payload.repositoryUrl || '',
      liveUrl: payload.liveUrl || '',
      teamSize: Number(payload.teamSize) || 4,
      members: [
        {
          userId: currentUser.userId,
          name: currentUser.name,
          department: currentUser.department,
          role: currentUser.role,
          joinedAt: new Date().toISOString(),
        },
      ],
      status: 'OPEN',
      postedById: currentUser.userId,
      postedByName: currentUser.name,
      postedByRole: currentUser.role,
      department: currentUser.department,
      classroomId: payload.classroomId || null,
      classroomName: payload.classroomId ? payload.classroomName || 'CSE - Section A' : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isPostgresConnected()) {
      const created = await pgCreateProject(newProject);
      return res.status(201).json({
        success: true,
        message: 'Project created in PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    db.projects.unshift(newProject);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: newProject,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create project',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/projects/:id/join
projectsRouter.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, currentUser } = req.body;

    const user = currentUser || {
      userId: 'usr_student_01',
      name: 'Alex Rivera',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
    };

    if (isPostgresConnected()) {
      const existingReqs = await pgGetJoinRequests(id);
      if (existingReqs.some(r => r.userId === user.userId)) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a join request for this project',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      const all = await pgGetProjects();
      const prj = all.find(p => p.id === id);

      const newReq: JoinRequest = {
        id: `req_${Date.now()}`,
        projectId: id,
        projectTitle: prj?.title || 'Collaboration Project',
        userId: user.userId,
        userName: user.name,
        userDepartment: user.department,
        userRole: user.role,
        message: message || 'I would like to collaborate on this project.',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const created = await pgCreateJoinRequest(newReq);
      return res.status(201).json({
        success: true,
        message: 'Join request sent to PostgreSQL',
        data: created,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const prj = db.projects.find((p) => p.id === id);
    if (!prj) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const existing = db.joinRequests.find(
      (r) => r.projectId === id && r.userId === user.userId
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a join request for this project',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const newReq: JoinRequest = {
      id: `req_${Date.now()}`,
      projectId: id,
      projectTitle: prj.title,
      userId: user.userId,
      userName: user.name,
      userDepartment: user.department,
      userRole: user.role,
      message: message || 'I would like to collaborate on this project.',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    db.joinRequests.unshift(newReq);
    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: 'Join request sent',
      data: newReq,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send join request',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/projects/:id/requests
projectsRouter.get('/:id/requests', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (isPostgresConnected()) {
      const requests = await pgGetJoinRequests(id);
      return res.json({
        success: true,
        message: 'Join requests retrieved from PostgreSQL',
        data: requests,
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const requests = db.joinRequests.filter((r) => r.projectId === id);

    return res.json({
      success: true,
      message: 'Join requests retrieved',
      data: requests,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch join requests',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/projects/requests/:requestId/accept
projectsRouter.put('/requests/:requestId/accept', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    if (isPostgresConnected()) {
      const allReqs = await pgGetJoinRequests();
      const joinReq = allReqs.find(r => r.id === requestId);
      if (!joinReq) {
        return res.status(404).json({
          success: false,
          message: 'Join request not found in PostgreSQL',
          data: null,
          timestamp: new Date().toISOString(),
        });
      }

      await pgUpdateJoinRequestStatus(requestId, 'ACCEPTED');

      const allProjects = await pgGetProjects();
      const prj = allProjects.find(p => p.id === joinReq.projectId);
      const newMember: ProjectMember = {
        userId: joinReq.userId,
        name: joinReq.userName,
        department: joinReq.userDepartment || 'General',
        role: joinReq.userRole || 'STUDENT',
        joinedAt: new Date().toISOString(),
      };

      if (prj) {
        const alreadyMember = (prj.members || []).some(m => m.userId === joinReq.userId);
        if (!alreadyMember) {
          const updatedMembers = [...(prj.members || []), newMember];
          const isFull = updatedMembers.length >= prj.teamSize;
          await pgUpdateProject(prj.id, {
            members: updatedMembers,
            status: isFull && prj.status === 'OPEN' ? 'IN_PROGRESS' : prj.status,
          });
        }
      }

      return res.json({
        success: true,
        message: 'Join request accepted in PostgreSQL',
        data: { success: true, member: newMember },
        timestamp: new Date().toISOString(),
      });
    }

    const db = getDatabase();
    const reqIndex = db.joinRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const joinReq = db.joinRequests[reqIndex];
    db.joinRequests[reqIndex] = { ...joinReq, status: 'ACCEPTED' };

    const prjIndex = db.projects.findIndex((p) => p.id === joinReq.projectId);
    const newMember: ProjectMember = {
      userId: joinReq.userId,
      name: joinReq.userName,
      department: joinReq.userDepartment || 'General',
      role: joinReq.userRole || 'STUDENT',
      joinedAt: new Date().toISOString(),
    };

    if (prjIndex !== -1) {
      const prj = db.projects[prjIndex];
      const alreadyMember = (prj.members || []).some((m) => m.userId === joinReq.userId);
      if (!alreadyMember) {
        const updatedMembers = [...(prj.members || []), newMember];
        const isFull = updatedMembers.length >= prj.teamSize;
        db.projects[prjIndex] = {
          ...prj,
          members: updatedMembers,
          status: isFull && prj.status === 'OPEN' ? 'IN_PROGRESS' : prj.status,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Join request accepted',
      data: { success: true, member: newMember },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept join request',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
