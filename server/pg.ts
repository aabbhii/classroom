import { Pool } from 'pg';
import {
  AcademicEvent,
  Announcement,
  Classroom,
  JoinRequest,
  Project,
  Resource,
  TimetableSlot,
} from '../src/types';
import { StudyDocument } from '../src/api/study';
import {
  INITIAL_CLASSROOMS,
  INITIAL_TIMETABLE,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_RESOURCES,
  INITIAL_EVENTS,
  INITIAL_PROJECTS,
  INITIAL_JOIN_REQUESTS,
} from '../src/api/mockData';

let pool: Pool | null = null;
let isConnected = false;

export function isPostgresConnected(): boolean {
  return isConnected;
}

export async function initPostgres(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    isConnected = true;
    console.log('[PostgreSQL] Connected successfully to database');

    await setupSchema();
    await seedIfEmpty();
    return true;
  } catch (error: any) {
    console.warn('[PostgreSQL] Connection failed, falling back to local store:', error.message);
    isConnected = false;
    return false;
  }
}

async function setupSchema() {
  if (!pool) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS classrooms (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      section VARCHAR(50) NOT NULL,
      department VARCHAR(255) NOT NULL,
      year INT NOT NULL,
      semester INT NOT NULL,
      total_students INT DEFAULT 0,
      total_subjects INT DEFAULT 6,
      faculty_advisor VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id VARCHAR(50) PRIMARY KEY,
      classroom_id VARCHAR(50),
      classroom_name VARCHAR(255),
      day VARCHAR(10) NOT NULL,
      start_time VARCHAR(20) NOT NULL,
      end_time VARCHAR(20) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      subject_code VARCHAR(50),
      faculty_id VARCHAR(50),
      faculty_name VARCHAR(255),
      room VARCHAR(100),
      type VARCHAR(50) DEFAULT 'LECTURE'
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      classroom_id VARCHAR(50),
      classroom_name VARCHAR(255),
      department VARCHAR(255),
      author_id VARCHAR(50),
      author_name VARCHAR(255),
      author_role VARCHAR(50),
      pinned BOOLEAN DEFAULT FALSE,
      attachments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      subject VARCHAR(255),
      date_time TIMESTAMPTZ NOT NULL,
      duration_minutes INT DEFAULT 60,
      venue VARCHAR(255),
      classroom_id VARCHAR(50),
      classroom_name VARCHAR(255),
      created_by_id VARCHAR(50),
      created_by_name VARCHAR(255),
      sync_to_calendar BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS resources (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject VARCHAR(255),
      type VARCHAR(50) NOT NULL,
      classroom_id VARCHAR(50),
      classroom_name VARCHAR(255),
      uploaded_by_id VARCHAR(50),
      uploaded_by_name VARCHAR(255),
      uploaded_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size VARCHAR(50),
      downloads_count INT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      tech_stack VARCHAR(255),
      tags JSONB DEFAULT '[]'::jsonb,
      repository_url TEXT,
      live_url TEXT,
      team_size INT DEFAULT 4,
      members JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(50) DEFAULT 'OPEN',
      posted_by_id VARCHAR(50),
      posted_by_name VARCHAR(255),
      posted_by_role VARCHAR(50),
      department VARCHAR(255),
      classroom_id VARCHAR(50),
      classroom_name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS join_requests (
      id VARCHAR(50) PRIMARY KEY,
      project_id VARCHAR(50) NOT NULL,
      project_title VARCHAR(255),
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      user_department VARCHAR(255),
      user_role VARCHAR(50),
      message TEXT,
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_documents (
      id BIGINT PRIMARY KEY,
      document_id VARCHAR(100) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      pages_processed INT DEFAULT 1,
      chunks_indexed INT DEFAULT 1,
      uploaded_by VARCHAR(50),
      uploaded_by_name VARCHAR(255),
      classroom_id VARCHAR(50),
      uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(ddl);
}

async function seedIfEmpty() {
  if (!pool) return;

  const countRes = await pool.query('SELECT COUNT(*) FROM classrooms');
  if (parseInt(countRes.rows[0].count, 10) > 0) {
    return;
  }

  console.log('[PostgreSQL] Seeding initial dataset into tables...');

  // Seed classrooms
  for (const c of INITIAL_CLASSROOMS) {
    await pool.query(
      `INSERT INTO classrooms (id, name, section, department, year, semester, total_students, total_subjects, faculty_advisor, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.section, c.department, c.year, c.semester, c.totalStudents || 60, c.totalSubjects || 6, c.facultyAdvisor || '', c.createdAt]
    );
  }

  // Seed timetable
  for (const s of INITIAL_TIMETABLE) {
    await pool.query(
      `INSERT INTO timetable (id, classroom_id, classroom_name, day, start_time, end_time, subject, subject_code, faculty_id, faculty_name, room, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.classroomId, s.classroomName, s.day, s.startTime, s.endTime, s.subject, s.subjectCode, s.facultyId, s.facultyName, s.room, s.type || 'LECTURE']
    );
  }

  // Seed announcements
  for (const a of INITIAL_ANNOUNCEMENTS) {
    await pool.query(
      `INSERT INTO announcements (id, title, body, type, classroom_id, classroom_name, department, author_id, author_name, author_role, pinned, attachments, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.title, a.body, a.type, a.classroomId, a.classroomName, a.department, a.authorId, a.authorName, a.authorRole, a.pinned || false, JSON.stringify(a.attachments || []), a.createdAt]
    );
  }

  // Seed events
  for (const e of INITIAL_EVENTS) {
    await pool.query(
      `INSERT INTO events (id, title, description, type, subject, date_time, duration_minutes, venue, classroom_id, classroom_name, created_by_id, created_by_name, sync_to_calendar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.title, e.description, e.type, e.subject, e.dateTime, e.durationMinutes, e.venue, e.classroomId, e.classroomName, e.createdById, e.createdByName, e.syncToCalendar ?? true]
    );
  }

  // Seed resources
  for (const r of INITIAL_RESOURCES) {
    await pool.query(
      `INSERT INTO resources (id, title, description, subject, type, classroom_id, classroom_name, uploaded_by_id, uploaded_by_name, uploaded_date, file_url, file_name, file_size, downloads_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.title, r.description, r.subject, r.type, r.classroomId, r.classroomName, r.uploadedById, r.uploadedByName, r.uploadedDate, r.fileUrl, r.fileName, r.fileSize, r.downloadsCount || 0]
    );
  }

  // Seed projects
  for (const p of INITIAL_PROJECTS) {
    await pool.query(
      `INSERT INTO projects (id, title, description, tech_stack, tags, repository_url, live_url, team_size, members, status, posted_by_id, posted_by_name, posted_by_role, department, classroom_id, classroom_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.title, p.description, p.techStack, JSON.stringify(p.tags || []), p.repositoryUrl, p.liveUrl, p.teamSize, JSON.stringify(p.members || []), p.status, p.postedById, p.postedByName, p.postedByRole, p.department, p.classroomId, p.classroomName, p.createdAt, p.updatedAt]
    );
  }

  // Seed join requests
  for (const j of INITIAL_JOIN_REQUESTS) {
    await pool.query(
      `INSERT INTO join_requests (id, project_id, project_title, user_id, user_name, user_department, user_role, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [j.id, j.projectId, j.projectTitle, j.userId, j.userName, j.userDepartment, j.userRole, j.message, j.status, j.createdAt]
    );
  }

  console.log('[PostgreSQL] Initial dataset seeded successfully');
}

/* =========================================================================
   POSTGRESQL REPOSITORY FUNCTIONS
========================================================================= */

export async function pgGetClassrooms(department?: string): Promise<Classroom[]> {
  if (!pool) return [];
  const query = department && department !== 'ALL'
    ? 'SELECT * FROM classrooms WHERE LOWER(department) = LOWER($1) ORDER BY name ASC'
    : 'SELECT * FROM classrooms ORDER BY name ASC';
  const params = department && department !== 'ALL' ? [department] : [];
  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    name: r.name,
    section: r.section,
    department: r.department,
    year: r.year,
    semester: r.semester,
    totalStudents: r.total_students,
    totalSubjects: r.total_subjects,
    facultyAdvisor: r.faculty_advisor,
    createdAt: r.created_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function pgCreateClassroom(data: Omit<Classroom, 'id' | 'createdAt'>): Promise<Classroom> {
  const id = `cls_${Date.now()}`;
  const now = new Date().toISOString();
  await pool!.query(
    `INSERT INTO classrooms (id, name, section, department, year, semester, total_students, total_subjects, faculty_advisor, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, data.name, data.section, data.department, data.year, data.semester, data.totalStudents || 0, data.totalSubjects || 6, data.facultyAdvisor || '', now]
  );
  return { id, ...data, createdAt: now };
}

export async function pgUpdateClassroom(id: string, data: Partial<Classroom>): Promise<Classroom | null> {
  const current = await pool!.query('SELECT * FROM classrooms WHERE id = $1', [id]);
  if (current.rows.length === 0) return null;
  const c = current.rows[0];
  const updated = {
    name: data.name ?? c.name,
    section: data.section ?? c.section,
    department: data.department ?? c.department,
    year: data.year ?? c.year,
    semester: data.semester ?? c.semester,
    totalStudents: data.totalStudents ?? c.total_students,
    totalSubjects: data.totalSubjects ?? c.total_subjects,
    facultyAdvisor: data.facultyAdvisor ?? c.faculty_advisor,
  };
  await pool!.query(
    `UPDATE classrooms SET name=$1, section=$2, department=$3, year=$4, semester=$5, total_students=$6, total_subjects=$7, faculty_advisor=$8 WHERE id=$9`,
    [updated.name, updated.section, updated.department, updated.year, updated.semester, updated.totalStudents, updated.totalSubjects, updated.facultyAdvisor, id]
  );
  return { id, ...updated, createdAt: c.created_at?.toISOString() };
}

export async function pgDeleteClassroom(id: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM classrooms WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   TIMETABLE
========================================================================= */

export async function pgGetTimetable(classroomId?: string, day?: string, facultyId?: string): Promise<TimetableSlot[]> {
  if (!pool) return [];
  let query = 'SELECT * FROM timetable WHERE 1=1';
  const params: any[] = [];
  if (classroomId) {
    params.push(classroomId);
    query += ` AND classroom_id = $${params.length}`;
  }
  if (day) {
    params.push(day.toUpperCase());
    query += ` AND UPPER(day) = $${params.length}`;
  }
  if (facultyId) {
    params.push(facultyId);
    query += ` AND (faculty_id = $${params.length} OR LOWER(faculty_name) LIKE '%sharma%')`;
  }
  query += ' ORDER BY start_time ASC';

  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    day: r.day,
    startTime: r.start_time,
    endTime: r.end_time,
    subject: r.subject,
    subjectCode: r.subject_code,
    facultyId: r.faculty_id,
    facultyName: r.faculty_name,
    room: r.room,
    type: r.type,
  }));
}

export async function pgCreateTimetableSlot(slot: Omit<TimetableSlot, 'id'>): Promise<TimetableSlot> {
  const id = `slot_${Date.now()}`;
  await pool!.query(
    `INSERT INTO timetable (id, classroom_id, classroom_name, day, start_time, end_time, subject, subject_code, faculty_id, faculty_name, room, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, slot.classroomId, slot.classroomName || '', slot.day, slot.startTime, slot.endTime, slot.subject, slot.subjectCode || '', slot.facultyId, slot.facultyName, slot.room, slot.type || 'LECTURE']
  );
  return { id, ...slot };
}

export async function pgUpdateTimetableSlot(id: string, data: Partial<TimetableSlot>): Promise<TimetableSlot | null> {
  const current = await pool!.query('SELECT * FROM timetable WHERE id = $1', [id]);
  if (current.rows.length === 0) return null;
  const s = current.rows[0];
  const updated = {
    classroomId: data.classroomId ?? s.classroom_id,
    classroomName: data.classroomName ?? s.classroom_name,
    day: data.day ?? s.day,
    startTime: data.startTime ?? s.start_time,
    endTime: data.endTime ?? s.end_time,
    subject: data.subject ?? s.subject,
    subjectCode: data.subjectCode ?? s.subject_code,
    facultyId: data.facultyId ?? s.faculty_id,
    facultyName: data.facultyName ?? s.faculty_name,
    room: data.room ?? s.room,
    type: data.type ?? s.type,
  };
  await pool!.query(
    `UPDATE timetable SET classroom_id=$1, classroom_name=$2, day=$3, start_time=$4, end_time=$5, subject=$6, subject_code=$7, faculty_id=$8, faculty_name=$9, room=$10, type=$11 WHERE id=$12`,
    [updated.classroomId, updated.classroomName, updated.day, updated.startTime, updated.endTime, updated.subject, updated.subjectCode, updated.facultyId, updated.facultyName, updated.room, updated.type, id]
  );
  return { id, ...updated };
}

export async function pgDeleteTimetableSlot(id: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM timetable WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   ANNOUNCEMENTS
========================================================================= */

export async function pgGetAnnouncements(classroomId?: string, department?: string, type?: string): Promise<Announcement[]> {
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC');
  let list = res.rows.map(r => ({
    id: r.id,
    title: r.title,
    body: r.body,
    type: r.type,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    department: r.department,
    authorId: r.author_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    pinned: r.pinned,
    attachments: r.attachments || [],
    createdAt: r.created_at?.toISOString() || new Date().toISOString(),
  }));

  if (type && type !== 'ALL') {
    list = list.filter(a => a.type === type);
  }
  if (classroomId || department) {
    list = list.filter(a => {
      if (a.type === 'GENERAL') return true;
      if (a.type === 'DEPARTMENT' && department && a.department?.toLowerCase() === department.toLowerCase()) return true;
      if (a.type === 'SECTION' && classroomId && a.classroomId === classroomId) return true;
      return !classroomId && !department;
    });
  }
  return list;
}

export async function pgCreateAnnouncement(data: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
  const id = `anc_${Date.now()}`;
  const now = new Date().toISOString();
  await pool!.query(
    `INSERT INTO announcements (id, title, body, type, classroom_id, classroom_name, department, author_id, author_name, author_role, pinned, attachments, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, data.title, data.body, data.type, data.classroomId || '', data.classroomName || '', data.department, data.authorId, data.authorName, data.authorRole, data.pinned || false, JSON.stringify(data.attachments || []), now]
  );
  return { id, ...data, createdAt: now };
}

export async function pgDeleteAnnouncement(id: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM announcements WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   EVENTS
========================================================================= */

export async function pgGetEvents(classroomId?: string, type?: string, limit?: number): Promise<AcademicEvent[]> {
  if (!pool) return [];
  let query = 'SELECT * FROM events WHERE 1=1';
  const params: any[] = [];
  if (classroomId) {
    params.push(classroomId);
    query += ` AND classroom_id = $${params.length}`;
  }
  if (type && type !== 'ALL') {
    params.push(type);
    query += ` AND type = $${params.length}`;
  }
  query += ' ORDER BY date_time ASC';
  if (limit) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }
  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    subject: r.subject,
    dateTime: r.date_time?.toISOString() || new Date().toISOString(),
    durationMinutes: r.duration_minutes,
    venue: r.venue,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    createdById: r.created_by_id,
    createdByName: r.created_by_name,
    syncToCalendar: r.sync_to_calendar,
  }));
}

export async function pgCreateEvent(data: Omit<AcademicEvent, 'id'>): Promise<AcademicEvent> {
  const id = `evt_${Date.now()}`;
  await pool!.query(
    `INSERT INTO events (id, title, description, type, subject, date_time, duration_minutes, venue, classroom_id, classroom_name, created_by_id, created_by_name, sync_to_calendar)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, data.title, data.description || '', data.type, data.subject, data.dateTime, data.durationMinutes || 60, data.venue, data.classroomId, data.classroomName || '', data.createdById, data.createdByName, data.syncToCalendar ?? true]
  );
  return { id, ...data };
}

export async function pgDeleteEvent(id: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM events WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   RESOURCES
========================================================================= */

export async function pgGetResources(classroomId?: string, subject?: string, type?: string): Promise<Resource[]> {
  if (!pool) return [];
  let query = 'SELECT * FROM resources WHERE 1=1';
  const params: any[] = [];
  if (classroomId) {
    params.push(classroomId);
    query += ` AND classroom_id = $${params.length}`;
  }
  if (subject && subject !== 'ALL') {
    params.push(subject.toLowerCase());
    query += ` AND LOWER(subject) = $${params.length}`;
  }
  if (type && type !== 'ALL') {
    params.push(type);
    query += ` AND type = $${params.length}`;
  }
  query += ' ORDER BY uploaded_date DESC';
  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    subject: r.subject,
    type: r.type,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    uploadedById: r.uploaded_by_id,
    uploadedByName: r.uploaded_by_name,
    uploadedDate: r.uploaded_date?.toISOString() || new Date().toISOString(),
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileSize: r.file_size,
    downloadsCount: r.downloads_count,
  }));
}

export async function pgCreateResource(data: Omit<Resource, 'id'>): Promise<Resource> {
  const id = `res_${Date.now()}`;
  await pool!.query(
    `INSERT INTO resources (id, title, description, subject, type, classroom_id, classroom_name, uploaded_by_id, uploaded_by_name, uploaded_date, file_url, file_name, file_size, downloads_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [id, data.title, data.description || '', data.subject, data.type, data.classroomId, data.classroomName || '', data.uploadedById, data.uploadedByName, data.uploadedDate, data.fileUrl, data.fileName, data.fileSize, data.downloadsCount || 0]
  );
  return { id, ...data };
}

export async function pgDeleteResource(id: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM resources WHERE id = $1', [id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   PROJECTS & JOIN REQUESTS
========================================================================= */

export async function pgGetProjects(): Promise<Project[]> {
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  return res.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    techStack: r.tech_stack,
    tags: Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags || '[]'),
    repositoryUrl: r.repository_url,
    liveUrl: r.live_url,
    teamSize: r.team_size,
    members: Array.isArray(r.members) ? r.members : JSON.parse(r.members || '[]'),
    status: r.status,
    postedById: r.posted_by_id,
    postedByName: r.posted_by_name,
    postedByRole: r.posted_by_role,
    department: r.department,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    createdAt: r.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function pgCreateProject(project: Project): Promise<Project> {
  await pool!.query(
    `INSERT INTO projects (id, title, description, tech_stack, tags, repository_url, live_url, team_size, members, status, posted_by_id, posted_by_name, posted_by_role, department, classroom_id, classroom_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [project.id, project.title, project.description, project.techStack, JSON.stringify(project.tags || []), project.repositoryUrl, project.liveUrl, project.teamSize, JSON.stringify(project.members || []), project.status, project.postedById, project.postedByName, project.postedByRole, project.department, project.classroomId, project.classroomName, project.createdAt, project.updatedAt]
  );
  return project;
}

export async function pgUpdateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  const current = await pool!.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (current.rows.length === 0) return null;
  const p = current.rows[0];
  const members = updates.members ? JSON.stringify(updates.members) : p.members;
  const status = updates.status ?? p.status;
  const now = new Date().toISOString();
  await pool!.query(
    `UPDATE projects SET members = $1, status = $2, updated_at = $3 WHERE id = $4`,
    [members, status, now, id]
  );
  const updatedRes = await pool!.query('SELECT * FROM projects WHERE id = $1', [id]);
  const r = updatedRes.rows[0];
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    techStack: r.tech_stack,
    tags: Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags || '[]'),
    repositoryUrl: r.repository_url,
    liveUrl: r.live_url,
    teamSize: r.team_size,
    members: Array.isArray(r.members) ? r.members : JSON.parse(r.members || '[]'),
    status: r.status,
    postedById: r.posted_by_id,
    postedByName: r.posted_by_name,
    postedByRole: r.posted_by_role,
    department: r.department,
    classroomId: r.classroom_id,
    classroomName: r.classroom_name,
    createdAt: r.created_at?.toISOString(),
    updatedAt: r.updated_at?.toISOString(),
  };
}

export async function pgGetJoinRequests(projectId?: string): Promise<JoinRequest[]> {
  if (!pool) return [];
  const query = projectId
    ? 'SELECT * FROM join_requests WHERE project_id = $1 ORDER BY created_at DESC'
    : 'SELECT * FROM join_requests ORDER BY created_at DESC';
  const params = projectId ? [projectId] : [];
  const res = await pool.query(query, params);
  return res.rows.map(r => ({
    id: r.id,
    projectId: r.project_id,
    projectTitle: r.project_title,
    userId: r.user_id,
    userName: r.username,
    userDepartment: r.userdepartment,
    userRole: r.userrole,
    message: r.message,
    status: r.status,
    createdAt: r.created_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function pgCreateJoinRequest(req: JoinRequest): Promise<JoinRequest> {
  await pool!.query(
    `INSERT INTO join_requests (id, project_id, project_title, user_id, userName, userDepartment, userRole, message, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [req.id, req.projectId, req.projectTitle, req.userId, req.userName, req.userDepartment || '', req.userRole || 'STUDENT', req.message, req.status, req.createdAt]
  );
  return req;
}

export async function pgUpdateJoinRequestStatus(id: string, status: string): Promise<boolean> {
  const res = await pool!.query('UPDATE join_requests SET status = $1 WHERE id = $2', [status, id]);
  return (res.rowCount ?? 0) > 0;
}

/* =========================================================================
   STUDY DOCUMENTS
========================================================================= */

export async function pgGetStudyDocuments(): Promise<StudyDocument[]> {
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM study_documents ORDER BY uploaded_at DESC');
  return res.rows.map(r => ({
    id: Number(r.id),
    documentId: r.document_id,
    filename: r.filename,
    pagesProcessed: r.pages_processed,
    chunksIndexed: r.chunks_indexed,
    uploadedBy: r.uploaded_by,
    uploadedByName: r.uploaded_by_name,
    classroomId: r.classroom_id,
    uploadedAt: r.uploaded_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function pgCreateStudyDocument(doc: StudyDocument): Promise<StudyDocument> {
  await pool!.query(
    `INSERT INTO study_documents (id, document_id, filename, pages_processed, chunks_indexed, uploaded_by, uploaded_by_name, classroom_id, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [doc.id, doc.documentId, doc.filename, doc.pagesProcessed, doc.chunksIndexed, String(doc.uploadedBy), doc.uploadedByName, doc.classroomId || '', doc.uploadedAt]
  );
  return doc;
}

export async function pgDeleteStudyDocument(documentId: string): Promise<boolean> {
  const res = await pool!.query('DELETE FROM study_documents WHERE document_id = $1', [documentId]);
  return (res.rowCount ?? 0) > 0;
}
