-- =========================================================================
-- Smart Classroom Management System - PostgreSQL Database Schema
-- Compatible with PostgreSQL 13, 14, 15, 16, 17, Supabase, Neon, AWS RDS
-- =========================================================================

-- 1. Classrooms Table
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

-- 2. Timetable Slots Table
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

-- 3. Announcements Table
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

-- 4. Academic Events Table
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

-- 5. Learning Resources Table
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

-- 6. Collaborative Projects Table
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

-- 7. Project Join Requests Table
CREATE TABLE IF NOT EXISTS join_requests (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  project_title VARCHAR(255),
  user_id VARCHAR(50) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  userDepartment VARCHAR(255),
  userRole VARCHAR(50),
  message TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. AI Study Documents Table
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

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_classrooms_dept ON classrooms(department);
CREATE INDEX IF NOT EXISTS idx_timetable_classroom ON timetable(classroom_id, day);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_announcements_feed ON announcements(classroom_id, department, type);
CREATE INDEX IF NOT EXISTS idx_events_classroom ON events(classroom_id, date_time);
CREATE INDEX IF NOT EXISTS idx_resources_classroom ON resources(classroom_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_project ON join_requests(project_id);
