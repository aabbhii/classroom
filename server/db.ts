import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_CLASSROOMS,
  INITIAL_TIMETABLE,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_RESOURCES,
  INITIAL_EVENTS,
  INITIAL_PROJECTS,
  INITIAL_JOIN_REQUESTS,
} from '../src/api/mockData';
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  classrooms: Classroom[];
  timetable: TimetableSlot[];
  announcements: Announcement[];
  resources: Resource[];
  events: AcademicEvent[];
  projects: Project[];
  joinRequests: JoinRequest[];
  studyDocuments: StudyDocument[];
}

const INITIAL_STUDY_DOCUMENTS: StudyDocument[] = [
  {
    id: 101,
    documentId: 'doc-os-deadlock-01',
    filename: 'Operating_Systems_Deadlock_Notes.pdf',
    pagesProcessed: 14,
    chunksIndexed: 38,
    uploadedBy: 1,
    uploadedByName: 'Aarav Sharma',
    classroomId: 'cls_cse_3a',
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 102,
    documentId: 'doc-dbms-indexing-02',
    filename: 'DBMS_BTree_Indexing_and_Transactions.pdf',
    pagesProcessed: 19,
    chunksIndexed: 52,
    uploadedBy: 1,
    uploadedByName: 'Aarav Sharma',
    classroomId: 'cls_cse_3a',
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function getInitialData(): DatabaseSchema {
  return {
    classrooms: JSON.parse(JSON.stringify(INITIAL_CLASSROOMS)),
    timetable: JSON.parse(JSON.stringify(INITIAL_TIMETABLE)),
    announcements: JSON.parse(JSON.stringify(INITIAL_ANNOUNCEMENTS)),
    resources: JSON.parse(JSON.stringify(INITIAL_RESOURCES)),
    events: JSON.parse(JSON.stringify(INITIAL_EVENTS)),
    projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)),
    joinRequests: JSON.parse(JSON.stringify(INITIAL_JOIN_REQUESTS)),
    studyDocuments: JSON.parse(JSON.stringify(INITIAL_STUDY_DOCUMENTS)),
  };
}

let memoryDb: DatabaseSchema | null = null;

export function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data dir, using in-memory db', e);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
      return memoryDb!;
    } catch (e) {
      console.warn('Could not parse database.json, re-seeding default data', e);
    }
  }

  memoryDb = getInitialData();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function getDatabase(): DatabaseSchema {
  if (!memoryDb) {
    return initDatabase();
  }
  return memoryDb;
}

export function saveDatabase(data: DatabaseSchema): void {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error persisting database to disk:', e);
  }
}

export function resetDatabase(): DatabaseSchema {
  const initial = getInitialData();
  saveDatabase(initial);
  return initial;
}
