import { Router, Request, Response } from 'express';
import { DEMO_USERS, createMockJwt } from '../../src/utils/jwt';
import { User } from '../../src/types';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        data: null,
        timestamp: new Date().toISOString(),
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === trimmedEmail);

    let user: User;
    if (matched) {
      user = matched;
    } else {
      const isFaculty = trimmedEmail.includes('faculty') || trimmedEmail.includes('prof');
      const isAdmin = trimmedEmail.includes('admin');
      const role = isAdmin ? 'ADMIN' : isFaculty ? 'FACULTY' : 'STUDENT';
      const nameParts = trimmedEmail.split('@')[0].split('.');
      const capitalizedName = nameParts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

      user = {
        userId: `usr_${Date.now()}`,
        name: capitalizedName || 'Classroom Member',
        email: req.body.email,
        role,
        classroomId: role !== 'ADMIN' ? 'cls_cse_3a' : undefined,
        classroomName: role !== 'ADMIN' ? 'CSE - 3rd Year (Section A)' : undefined,
        department: 'Computer Science & Engineering',
      };
    }

    const token = createMockJwt({
      userId: user.userId,
      role: user.role,
      name: user.name,
      email: user.email,
      classroomId: user.classroomId,
      classroomName: user.classroomName,
      department: user.department,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal authentication error',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
});
