import type {
  DB, Organisation, User, Department, Contact, Correspondence, DocumentRecord,
  Matter, Meeting, TaskItem, ApprovalRecord, EmailRecord, NotificationItem,
  AuditEntry, CommentItem, Role, SecurityLevel, Priority, CorrType, CorrStatus,
  TaskStatus, MeetingStatus, ResponseOption, DocCategory, MatterEvent,
} from './types';
import { d, dateOnly, pad, uid, initials } from './utils';
import { hashSecret, deviceLabel } from './security';

export const SEED_VERSION = 10;

/* demo tenant credential — documented dev-only secret, hashed before storage */
const DEMO_PWD_HASH = hashSecret('cortexa');

/* ── helpers ──────────────────────────────────────────────────────────── */

const AVATAR_COLORS = ['#146355', '#9C6B1E', '#3E5C76', '#A8402C', '#2E7D4F', '#125045', '#7C5514', '#34506A'];

function mkUser(i: number, orgId: string, name: string, email: string, title: string, role: Role, departmentId?: string): User {
  return {
    id: `u_${i}`, orgId, name, email, title, role, departmentId,
    active: true, initials: initials(name), color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    pwdHash: DEMO_PWD_HASH, emailVerified: true, country: 'NG',
    pwdChangedAt: d(-90),
    /* AI seats: executives, admins, secretaries & records officers get AI access in the demo */
    aiEnabled: ['Organisation Admin', 'Super Admin', 'Executive', 'Secretary', 'Records Officer', 'Department Head'].includes(role),
  };
}

export function buildSeed(): DB {
  const orgId = 'org_demo';
  const PREFIX = 'CFR';
  const YEAR = new Date().getFullYear();

  /* counters */
  const counters: Record<string, number> = {};
  const local: Record<string, number> = {};
  function nextRef(kind: string, deptCode: string): string {
    const key = `${kind}:${deptCode}`;
    local[key] = (local[key] || 0) + 1;
    counters[`${orgId}:${kind}:${deptCode}:${YEAR}`] = local[key];
    return `${PREFIX}/${deptCode}/${YEAR}/${pad(local[key])}`;
  }

  /* ── organisation ── */
  const org: Organisation = {
    id: orgId,
    name: 'Cortexa Demo Foundation',
    type: 'NGO',
    logoInitials: 'CF',
    address: '14 Institutional Avenue, Central Business District, Abuja',
    email: 'secretariat@cortexafoundation.demo',
    phone: '+234 800 226 7710',
    refPrefix: PREFIX,
    approvalChain: ['Department Head', 'Executive', 'Organisation Admin'],
    notificationPrefs: [
      { category: 'Meetings', inApp: true, email: true, browser: true },
      { category: 'Tasks', inApp: true, email: true, browser: false },
      { category: 'Approvals', inApp: true, email: true, browser: true },
      { category: 'Correspondence', inApp: true, email: false, browser: false },
      { category: 'Deadlines', inApp: true, email: true, browser: true },
      { category: 'System', inApp: true, email: false, browser: false },
    ],
    country: 'NG',
    website: 'https://cortexafoundation.demo',
    setupComplete: true,
    currency: { code: 'NGN', symbol: '₦' },
    brand: { primary: '#146355', secondary: '#9C6B1E' },
    flags: { finance: true, assets: true, announcements: true, deadlines: true, ai: true, hr: false, procurement: true, projects: false, board: false },
    aiSeats: 100,
    pettyCashOpening: 150000,
    budgetAlertPct: [70, 80, 90, 100],
    createdAt: d(-240),
  };

  /* ── departments ── */
  const depts: Department[] = [
    { id: 'dep_adm', orgId, name: 'Administration', code: 'ADM', headId: 'u_9', description: 'Executive secretariat, registry and general administration.' },
    { id: 'dep_prg', orgId, name: 'Programmes', code: 'PRG', headId: 'u_5', description: 'Design and delivery of programme interventions.' },
    { id: 'dep_fin', orgId, name: 'Finance', code: 'FIN', headId: 'u_6', description: 'Budgets, grants, procurement and financial control.' },
    { id: 'dep_com', orgId, name: 'Communications', code: 'COM', headId: 'u_7', description: 'Media, publications and external relations.' },
    { id: 'dep_hrs', orgId, name: 'Human Resources', code: 'HRS', headId: 'u_8', description: 'Staffing, welfare, policy and volunteer management.' },
  ];

  /* ── users (20) ── */
  const users: User[] = [
    mkUser(1, orgId, 'Adaeze Okonkwo', 'admin@cortexa.demo', 'Executive Director', 'Organisation Admin', 'dep_adm'),
    mkUser(2, orgId, 'Folake Adeyemi', 'secretary@cortexa.demo', 'Executive Secretary', 'Secretary', 'dep_adm'),
    mkUser(3, orgId, 'Dr. Emmanuel Eze', 'executive@cortexa.demo', 'Board Chair', 'Executive', 'dep_adm'),
    mkUser(4, orgId, 'Samuel Odum', 'records@cortexa.demo', 'Records Officer', 'Records Officer', 'dep_adm'),
    mkUser(5, orgId, 'Hauwa Bello', 'h.bello@cortexa.demo', 'Programmes Manager', 'Department Head', 'dep_prg'),
    mkUser(6, orgId, 'Chinedu Umeh', 'c.umeh@cortexa.demo', 'Finance Manager', 'Department Head', 'dep_fin'),
    mkUser(7, orgId, 'Grace Danjuma', 'g.danjuma@cortexa.demo', 'Communications Lead', 'Department Head', 'dep_com'),
    mkUser(8, orgId, 'Yusuf Ibrahim', 'y.ibrahim@cortexa.demo', 'HR Manager', 'Department Head', 'dep_hrs'),
    mkUser(9, orgId, 'Ngozi Ekwueme', 'n.ekwueme@cortexa.demo', 'Head of Administration', 'Department Head', 'dep_adm'),
    mkUser(10, orgId, 'Tunde Alabi', 't.alabi@cortexa.demo', 'Programme Officer', 'Staff', 'dep_prg'),
    mkUser(11, orgId, 'Amina Suleiman', 'a.suleiman@cortexa.demo', 'Programme Officer', 'Staff', 'dep_prg'),
    mkUser(12, orgId, 'Blessing Okoro', 'b.okoro@cortexa.demo', 'Accountant', 'Staff', 'dep_fin'),
    mkUser(13, orgId, 'Kemi Ogunleye', 'k.ogunleye@cortexa.demo', 'Media Officer', 'Staff', 'dep_com'),
    mkUser(14, orgId, 'Ibrahim Musa', 'i.musa@cortexa.demo', 'HR Officer', 'Staff', 'dep_hrs'),
    mkUser(15, orgId, 'Chika Nwosu', 'c.nwosu@cortexa.demo', 'Administrative Officer', 'Staff', 'dep_adm'),
    mkUser(16, orgId, 'Fatima Zubairu', 'f.zubairu@cortexa.demo', 'M&E Officer', 'Staff', 'dep_prg'),
    mkUser(17, orgId, 'Emeka Obi', 'e.obi@cortexa.demo', 'Procurement Officer', 'Staff', 'dep_fin'),
    mkUser(18, orgId, 'Osaro Idahosa', 'o.idahosa@cortexa.demo', 'ICT Officer', 'Staff', 'dep_adm'),
    mkUser(19, orgId, 'Zainab Lawal', 'z.lawal@cortexa.demo', 'Board Liaison', 'Viewer', 'dep_adm'),
    mkUser(20, orgId, 'Peter Chukwuma', 'p.chukwuma@cortexa.demo', 'Communications Officer', 'Staff', 'dep_com'),
  ];

  /* ── matters (10) ── */
  function ev(offset: number, hour: number, text: string, kind: MatterEvent['kind']): MatterEvent {
    return { id: uid('ev'), at: d(offset, hour), text, kind };
  }
  const matters: Matter[] = [
    {
      id: 'm_housing', orgId, fileNumber: nextRef('FILE', 'ADM'), title: 'Abuja Housing Policy Engagement',
      description: 'Full institutional history of the Foundation\u2019s engagement with the Federal Ministry of Housing on the affordable housing policy dialogue, MoU and stakeholder summit.',
      category: 'Policy Engagement', departmentId: 'dep_adm', ownerId: 'u_3', status: 'Active',
      security: 'Confidential', retention: 'Active', createdAt: d(-24, 9), updatedAt: d(0, 8, 15),
      events: [
        ev(-24, 9, 'Invitation received from the Federal Ministry of Housing', 'correspondence'),
        ev(-23, 11, 'Assigned to Dr. Emmanuel Eze for executive review', 'correspondence'),
        ev(-21, 10, 'Briefing note on housing policy prepared', 'document'),
        ev(-18, 14, 'Executive approval granted to participate', 'approval'),
        ev(-12, 10, 'MoU draft received for legal review', 'document'),
        ev(-7, 9, 'Internal alignment meeting held', 'meeting'),
        ev(-2, 16, 'Response letter dispatched to the Ministry', 'correspondence'),
      ],
    },
    {
      id: 'm_teacher', orgId, fileNumber: nextRef('FILE', 'PRG'), title: 'Teacher Recruitment Programme',
      description: 'Recruitment of 120 teachers for partner schools: approvals, contracts, correspondence and board reporting.',
      category: 'Programme Delivery', departmentId: 'dep_prg', ownerId: 'u_5', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-40, 10), updatedAt: d(-1, 15),
      events: [
        ev(-40, 10, 'Programme concept note approved by the Board', 'approval'),
        ev(-33, 9, 'Recruitment circular issued to partner schools', 'correspondence'),
        ev(-20, 12, 'Shortlist review meeting held', 'meeting'),
        ev(-9, 10, 'Contract templates uploaded for legal review', 'document'),
        ev(-1, 15, '48 offers dispatched to candidates', 'task'),
      ],
    },
    {
      id: 'm_grant', orgId, fileNumber: nextRef('FILE', 'FIN'), title: 'Annual Grant Renewal — World Trust Foundation',
      description: 'Renewal of the core programme grant: proposal, budget, due-diligence documents and reporting commitments.',
      category: 'Grants & Finance', departmentId: 'dep_fin', ownerId: 'u_6', status: 'Active',
      security: 'Confidential', retention: 'Active', createdAt: d(-55, 9), updatedAt: d(-3, 11),
      events: [
        ev(-55, 9, 'Renewal invitation received from World Trust Foundation', 'correspondence'),
        ev(-47, 10, 'Proposal draft v1 circulated internally', 'document'),
        ev(-30, 14, 'Budget defence meeting with Finance', 'meeting'),
        ev(-14, 9, 'Final proposal submitted', 'correspondence'),
        ev(-3, 11, 'Due-diligence questionnaire received', 'correspondence'),
      ],
    },
    {
      id: 'm_health', orgId, fileNumber: nextRef('FILE', 'PRG'), title: 'Community Health Outreach — Gwagwalada',
      description: 'Mobile clinic outreach: permits, partner MOUs, volunteer rosters and the post-outreach report.',
      category: 'Programme Delivery', departmentId: 'dep_prg', ownerId: 'u_10', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-30, 8, 30), updatedAt: d(-4, 17),
      events: [
        ev(-30, 8, 'Outreach proposal approved', 'approval'),
        ev(-22, 10, 'Permit request sent to Gwagwalada Area Council', 'correspondence'),
        ev(-15, 9, 'Volunteer briefing held', 'meeting'),
        ev(-4, 17, 'Draft outreach report uploaded', 'document'),
      ],
    },
    {
      id: 'm_handbook', orgId, fileNumber: nextRef('FILE', 'HRS'), title: 'Staff Handbook Revision 2026',
      description: 'Institutional handbook revision covering leave policy, code of conduct and remote-work guidelines.',
      category: 'Policy', departmentId: 'dep_hrs', ownerId: 'u_8', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-18, 10), updatedAt: d(-2, 12),
      events: [
        ev(-18, 10, 'Revision committee constituted', 'meeting'),
        ev(-10, 9, 'Working draft v0.2 circulated', 'document'),
        ev(-2, 12, 'Legal comments incorporated', 'note'),
      ],
    },
    {
      id: 'm_media', orgId, fileNumber: nextRef('FILE', 'COM'), title: 'Media Partnership — Sunrise TV',
      description: 'Partnership for a monthly public-interest segment: agreement, airtime schedule and content pipeline.',
      category: 'Partnership', departmentId: 'dep_com', ownerId: 'u_7', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-26, 11), updatedAt: d(-6, 10),
      events: [
        ev(-26, 11, 'Partnership proposal received from Sunrise TV', 'correspondence'),
        ev(-16, 15, 'Content calendar agreed', 'meeting'),
        ev(-6, 10, 'Partnership agreement signed', 'document'),
      ],
    },
    {
      id: 'm_procure', orgId, fileNumber: nextRef('FILE', 'FIN'), title: 'Procurement of Office Equipment',
      description: 'Open procurement of laptops and office furniture for the new annex: bids, evaluations and award.',
      category: 'Procurement', departmentId: 'dep_fin', ownerId: 'u_17', status: 'Closed',
      security: 'Confidential', retention: 'Closed', createdAt: d(-70, 9), updatedAt: d(-12, 14),
      events: [
        ev(-70, 9, 'Procurement plan approved', 'approval'),
        ev(-50, 10, 'Bid invitations dispatched to 9 vendors', 'correspondence'),
        ev(-28, 11, 'Bid evaluation committee meeting', 'meeting'),
        ev(-12, 14, 'Award letter issued to Meridian Supplies Ltd', 'correspondence'),
      ],
    },
    {
      id: 'm_volunteer', orgId, fileNumber: nextRef('FILE', 'HRS'), title: 'Volunteer Management Policy',
      description: 'Policy development for onboarding, insurance and recognition of institutional volunteers.',
      category: 'Policy', departmentId: 'dep_hrs', ownerId: 'u_14', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-14, 9), updatedAt: d(-5, 16),
      events: [
        ev(-14, 9, 'Policy research commenced', 'task'),
        ev(-5, 16, 'Benchmark review from 4 NGOs completed', 'document'),
      ],
    },
    {
      id: 'm_annual', orgId, fileNumber: nextRef('FILE', 'COM'), title: 'Annual Report 2025 Publication',
      description: 'Design, approval and publication of the 2025 institutional annual report.',
      category: 'Publication', departmentId: 'dep_com', ownerId: 'u_13', status: 'Active',
      security: 'Internal', retention: 'Active', createdAt: d(-35, 10), updatedAt: d(0, 9, 40),
      events: [
        ev(-35, 10, 'Editorial calendar approved', 'approval'),
        ev(-20, 13, 'Design draft reviewed', 'meeting'),
        ev(-8, 9, 'Final layout submitted for approval', 'document'),
        ev(0, 9, 'Print proofs expected from vendor', 'note'),
      ],
    },
    {
      id: 'm_mou', orgId, fileNumber: nextRef('FILE', 'ADM'), title: 'MoU — Federal Ministry of Housing',
      description: 'Memorandum of Understanding formalising joint research on affordable housing delivery.',
      category: 'Legal', departmentId: 'dep_adm', ownerId: 'u_1', status: 'Active',
      security: 'Highly Confidential', retention: 'Active', createdAt: d(-12, 10), updatedAt: d(-1, 17),
      events: [
        ev(-12, 10, 'MoU draft received from Ministry legal team', 'document'),
        ev(-6, 11, 'Redlines reviewed by external counsel', 'note'),
        ev(-1, 17, 'Clean draft returned for signature', 'document'),
      ],
    },
  ];

  /* ── correspondence ── */
  const correspondence: Correspondence[] = [];
  type CorrInput = Partial<Correspondence> &
    Pick<Correspondence, 'ref' | 'direction' | 'dateReceived' | 'recipient' | 'subject' | 'type' | 'priority' | 'security' | 'status'>;
  function corr(partial: CorrInput): Correspondence {
    const c: Correspondence = {
      id: uid('cr'), orgId, archived: false,
      notes: '', attachments: [], responseRequired: false,
      ...partial,
    } as Correspondence;
    correspondence.push(c);
    return c;
  }

  const c_housingInvite = corr({
    ref: nextRef('IN', 'ADM'), direction: 'incoming', externalRef: 'FMH/GEN/2026/118',
    dateReceived: d(-24, 10), dateOfLetter: d(-26, 9), sender: 'Arc. Bello Danladi', senderOrg: 'Federal Ministry of Housing',
    recipient: 'Executive Director', subject: 'Invitation to the National Housing Stakeholders Dialogue',
    type: 'Invitation', departmentId: 'dep_adm', assignedTo: 'u_3', priority: 'Urgent', security: 'Confidential',
    responseRequired: true, responseDeadline: d(-20, 17), responseStatus: 'Accepted', status: 'Responded',
    notes: 'Ministry requests the Foundation\u2019s participation and a position paper on community-led housing.',
    attachments: ['doc_invite_scan'], matterId: 'm_housing',
    ocrText: 'FEDERAL MINISTRY OF HOUSING — Office of the Permanent Secretary. Invitation to the National Housing Stakeholders Dialogue. The Ministry cordially invites the Executive Director of Cortexa Demo Foundation to the National Housing Stakeholders Dialogue holding at the Transcorp Hilton, Abuja. Reference FMH/GEN/2026/118. Kindly confirm participation.',
  });
  corr({
    ref: nextRef('IN', 'ADM'), direction: 'incoming', externalRef: 'FME/GEN/2026/0451',
    dateReceived: d(-9, 11), dateOfLetter: d(-11, 9), sender: 'Mrs. R. Okafor', senderOrg: 'Federal Ministry of Education',
    recipient: 'Programmes Manager', subject: 'Request for partnership data on teacher deployment',
    type: 'Request', departmentId: 'dep_prg', assignedTo: 'u_5', priority: 'Important', security: 'Internal',
    responseRequired: true, responseDeadline: d(2, 17), status: 'In Progress',
    notes: 'Requires consolidated deployment figures from all partner schools.',
    attachments: ['doc_edu_letter'], matterId: 'm_teacher',
    ocrText: 'FEDERAL MINISTRY OF EDUCATION — Request for partnership data on teacher deployment. The Ministry requests updated data on teacher deployment across partner schools for the national dashboard.',
  });
  corr({
    ref: nextRef('IN', 'FIN'), direction: 'incoming', externalRef: 'WTF/GR/2026/77',
    dateReceived: d(-3, 9), dateOfLetter: d(-5, 9), sender: 'Ms. Laura Whitfield', senderOrg: 'World Trust Foundation',
    recipient: 'Finance Manager', subject: 'Grant renewal — due-diligence questionnaire',
    type: 'Request', departmentId: 'dep_fin', assignedTo: 'u_6', priority: 'Urgent', security: 'Confidential',
    responseRequired: true, responseDeadline: d(-1, 17), status: 'Awaiting Response',
    notes: 'Questionnaire covers governance, finance and safeguarding. Legal input required on annex C.',
    attachments: ['doc_ddq'], matterId: 'm_grant',
  });
  corr({
    ref: nextRef('IN', 'PRG'), direction: 'incoming', externalRef: 'GAC/PER/2026/12',
    dateReceived: d(-16, 12), dateOfLetter: d(-17, 10), sender: 'Area Council Secretary', senderOrg: 'Gwagwalada Area Council',
    recipient: 'Programme Officer', subject: 'Permit approval for mobile clinic outreach',
    type: 'Government Communication', departmentId: 'dep_prg', assignedTo: 'u_10', priority: 'Important', security: 'Internal',
    responseRequired: false, status: 'Registered', attachments: ['doc_permit'], matterId: 'm_health',
  });
  corr({
    ref: nextRef('IN', 'COM'), direction: 'incoming', externalRef: 'STV/PSH/2026/31',
    dateReceived: d(-26, 15), dateOfLetter: d(-27, 9), sender: 'Mr. Dayo Okonjo', senderOrg: 'Sunrise TV',
    recipient: 'Communications Lead', subject: 'Proposal for monthly public-interest segment',
    type: 'Proposal', departmentId: 'dep_com', assignedTo: 'u_7', priority: 'Routine', security: 'Internal',
    responseRequired: true, responseDeadline: d(-19, 17), responseStatus: 'Accepted', status: 'Responded',
    attachments: ['doc_stv_proposal'], matterId: 'm_media',
  });
  corr({
    ref: nextRef('IN', 'ADM'), direction: 'incoming', externalRef: 'NYC/COM/2026/88',
    dateReceived: d(-6, 10), dateOfLetter: d(-7, 9), sender: 'Comr. Sadiq Bala', senderOrg: 'Kano Youth Council',
    recipient: 'Executive Director', subject: 'Complaint regarding volunteer stipend delays',
    type: 'Complaint', departmentId: 'dep_hrs', assignedTo: 'u_8', priority: 'Urgent', security: 'Confidential',
    responseRequired: true, responseDeadline: d(1, 17), status: 'Assigned',
    notes: 'Escalated to HR for verification of payment records before response.',
    attachments: [], matterId: 'm_volunteer',
  });
  corr({
    ref: nextRef('IN', 'ADM'), direction: 'incoming', externalRef: 'LSB/INV/2026/204',
    dateReceived: d(-4, 9), dateOfLetter: d(-5, 9), sender: 'Dr. (Mrs.) F. Adesina', senderOrg: 'Lagos State Schools Board',
    recipient: 'Executive Director', subject: 'Invitation to education partners roundtable, Lagos',
    type: 'Invitation', departmentId: 'dep_adm', assignedTo: 'u_3', priority: 'Important', security: 'Internal',
    responseRequired: true, responseDeadline: d(3, 17), responseStatus: 'Pending', status: 'Pending Review',
    notes: 'Clashes with the Gwagwalada outreach — delegation may be required.',
    attachments: ['doc_lsb_invite'],
  });
  corr({
    ref: nextRef('IN', 'FIN'), direction: 'incoming', externalRef: 'UB/CR/2026/555',
    dateReceived: d(-13, 14), dateOfLetter: d(-14, 9), sender: 'Corporate Banking Desk', senderOrg: 'Unity Bank PLC',
    recipient: 'Finance Manager', subject: 'Annual credit facility review — documentation required',
    type: 'Notice', departmentId: 'dep_fin', assignedTo: 'u_12', priority: 'Important', security: 'Confidential',
    responseRequired: true, responseDeadline: d(6, 17), status: 'In Progress', attachments: ['doc_bank_notice'],
  });
  corr({
    ref: nextRef('IN', 'HRS'), direction: 'incoming', externalRef: '',
    dateReceived: d(-2, 16), dateOfLetter: d(-2, 10), sender: 'Mr. J. Okpara', senderOrg: 'Independent Applicant',
    recipient: 'HR Manager', subject: 'Application — Programme Coordinator position',
    type: 'Application', departmentId: 'dep_hrs', assignedTo: 'u_14', priority: 'Routine', security: 'Internal',
    responseRequired: false, status: 'Registered', attachments: ['doc_cv_scan'],
  });
  corr({
    ref: nextRef('IN', 'PRG'), direction: 'incoming', externalRef: 'WAHN/CIR/2026/9',
    dateReceived: d(-19, 9), dateOfLetter: d(-20, 9), sender: 'Secretariat', senderOrg: 'West Africa Health Network',
    recipient: 'All Partner Organisations', subject: 'Circular: regional health data reporting standards',
    type: 'Circular', departmentId: 'dep_prg', priority: 'Routine', security: 'Public',
    responseRequired: false, status: 'Closed', attachments: ['doc_circular_health'], matterId: 'm_health',
  });
  /* outgoing */
  corr({
    ref: nextRef('OUT', 'ADM'), direction: 'outgoing',
    dateReceived: d(-2, 15), dateOfLetter: d(-2, 12), recipient: 'The Permanent Secretary', recipientOrg: 'Federal Ministry of Housing',
    subject: 'Confirmation of participation — National Housing Stakeholders Dialogue',
    type: 'Letter', departmentId: 'dep_adm', authorId: 'u_2', approverId: 'u_3', assignedTo: 'u_2',
    priority: 'Urgent', security: 'Confidential', responseRequired: false, status: 'Responded',
    dispatchMethod: 'Email', dispatchDate: d(-2, 16), deliveryStatus: 'Delivered',
    relatedCorrId: c_housingInvite.id, matterId: 'm_housing',
    notes: 'Confirmed ED\u2019s participation; position paper attached.',
    attachments: ['doc_position_paper'],
  });
  corr({
    ref: nextRef('OUT', 'PRG'), direction: 'outgoing',
    dateReceived: d(-33, 10), dateOfLetter: d(-33, 9), recipient: 'Heads of Partner Schools', recipientOrg: 'Partner Schools Network',
    subject: 'Recruitment circular — 120 teachers for 2026/27 session',
    type: 'Circular', departmentId: 'dep_prg', authorId: 'u_5', approverId: 'u_1', assignedTo: 'u_11',
    priority: 'Important', security: 'Internal', responseRequired: false, status: 'Closed',
    dispatchMethod: 'Email', dispatchDate: d(-33, 11), deliveryStatus: 'Delivered',
    matterId: 'm_teacher', notes: 'Acknowledgements received from 41 of 46 schools.', attachments: ['doc_recruitment_circular'],
  });
  corr({
    ref: nextRef('OUT', 'FIN'), direction: 'outgoing',
    dateReceived: d(-14, 16), dateOfLetter: d(-14, 15), recipient: 'Grants Desk', recipientOrg: 'World Trust Foundation',
    subject: 'Submission of grant renewal proposal',
    type: 'Proposal', departmentId: 'dep_fin', authorId: 'u_6', approverId: 'u_1', assignedTo: 'u_6',
    priority: 'Urgent', security: 'Confidential', responseRequired: false, status: 'Closed',
    dispatchMethod: 'Courier', dispatchDate: d(-14, 17), deliveryStatus: 'Delivered',
    matterId: 'm_grant', notes: 'Hard copy + digital submission confirmed received.', attachments: ['doc_grant_proposal'],
  });
  corr({
    ref: nextRef('OUT', 'FIN'), direction: 'outgoing',
    dateReceived: d(-12, 13), dateOfLetter: d(-12, 11), recipient: 'Managing Director', recipientOrg: 'Meridian Supplies Ltd',
    subject: 'Letter of award — office equipment procurement lot 2',
    type: 'Letter', departmentId: 'dep_fin', authorId: 'u_17', approverId: 'u_6', assignedTo: 'u_17',
    priority: 'Important', security: 'Confidential', responseRequired: true, responseDeadline: d(4, 17), status: 'Awaiting Response',
    dispatchMethod: 'Hand Delivery', dispatchDate: d(-12, 14), deliveryStatus: 'Delivered',
    matterId: 'm_procure', notes: 'Vendor to confirm delivery schedule within 5 working days.', attachments: ['doc_award_letter'],
  });
  corr({
    ref: nextRef('OUT', 'COM'), direction: 'outgoing',
    dateReceived: d(-6, 9), dateOfLetter: d(-6, 9), recipient: 'Head of Content', recipientOrg: 'Sunrise TV',
    subject: 'Executed partnership agreement — counter-signed copy',
    type: 'Contract', departmentId: 'dep_com', authorId: 'u_7', approverId: 'u_1', assignedTo: 'u_13',
    priority: 'Routine', security: 'Internal', responseRequired: false, status: 'Closed',
    dispatchMethod: 'Email', dispatchDate: d(-6, 10), deliveryStatus: 'Delivered',
    matterId: 'm_media', attachments: ['doc_stv_agreement'],
  });
  corr({
    ref: nextRef('OUT', 'ADM'), direction: 'outgoing',
    dateReceived: d(0, 9), dateOfLetter: d(0, 9), recipient: 'The Registrar', recipientOrg: 'National Board Registry',
    subject: 'Quarterly compliance return — Q3',
    type: 'Report', departmentId: 'dep_adm', authorId: 'u_2', approverId: 'u_1', assignedTo: 'u_2',
    priority: 'Important', security: 'Internal', responseRequired: false, status: 'In Progress',
    dispatchMethod: 'Physical Delivery', deliveryStatus: 'Draft', notes: 'Awaiting executive sign-off before dispatch.', attachments: ['doc_compliance_q3'],
  });
  /* received today — fresh inbox for the secretary */
  corr({
    ref: nextRef('IN', 'ADM'), direction: 'incoming', externalRef: 'NMA/INV/2026/130',
    dateReceived: d(0, 8, 40), dateOfLetter: d(-1, 9), sender: 'Prof. A. Yusuf', senderOrg: 'Nigerian Medical Association',
    recipient: 'Executive Director', subject: 'Invitation to signatory ceremony — community health compact',
    type: 'Invitation', departmentId: 'dep_prg', priority: 'Important', security: 'Internal',
    responseRequired: true, responseDeadline: d(5, 17), responseStatus: 'Pending', status: 'Received',
    notes: 'Received at front desk 08:40 — pending registration review.', attachments: ['doc_nma_invite'],
  });
  corr({
    ref: nextRef('IN', 'FIN'), direction: 'incoming', externalRef: 'FIRS/TAX/2026/3021',
    dateReceived: d(0, 9, 20), dateOfLetter: d(-2, 9), sender: 'Tax Station Manager', senderOrg: 'Federal Inland Revenue Service',
    recipient: 'Finance Manager', subject: 'Notice of annual tax clearance review',
    type: 'Notice', departmentId: 'dep_fin', assignedTo: 'u_6', priority: 'Urgent', security: 'Confidential',
    responseRequired: true, responseDeadline: d(9, 17), status: 'Registered',
    notes: 'Requires audited statements for the last two years.', attachments: [],
  });
  corr({
    ref: nextRef('IN', 'COM'), direction: 'incoming',
    dateReceived: d(-8, 11), dateOfLetter: d(-8, 9), sender: 'Editorial Desk', senderOrg: 'The Civic Herald',
    recipient: 'Communications Lead', subject: 'Interview request on the teacher recruitment programme',
    type: 'Request', departmentId: 'dep_com', assignedTo: 'u_7', priority: 'Routine', security: 'Public',
    responseRequired: true, responseDeadline: d(-1, 17), status: 'Awaiting Response',
    notes: 'Proposed 30-minute interview with the Programmes Manager.', attachments: [], matterId: 'm_teacher',
  });

  /* generated correspondence to reach 50+ */
  const genSenders: [string, string, CorrType, Priority, string, number][] = [
    ['Federal Ministry of Education', 'Mrs. K. Danladi', 'Request', 'Important', 'Responded', -45],
    ['National Youth Council', 'Comr. E. Osei', 'Invitation', 'Routine', 'Closed', -60],
    ['Zenith Trust Bank', 'Corporate Desk', 'Notice', 'Important', 'Closed', -72],
    ['Abuja Chamber of Commerce', 'Secretariat', 'Invitation', 'Routine', 'Responded', -51],
    ['Ministry of Budget & Planning', 'Desk Officer', 'Government Communication', 'Important', 'Closed', -80],
    ['Rivers State Education Board', 'Dr. P. Briggs', 'Request', 'Routine', 'Responded', -48],
    ['HealthLink Alliance', 'Programme Desk', 'Proposal', 'Important', 'In Progress', -22],
    ['Catholic Diocese of Kaduna', 'Education Office', 'Request', 'Routine', 'Registered', -28],
    ['Nigerian Bar Association', 'Events Committee', 'Invitation', 'Routine', 'Pending Review', -5],
    ['Delta Communities Trust', 'Mr. O. Esezi', 'Complaint', 'Important', 'Assigned', -11],
    ['Federal Ministry of Women Affairs', 'Directorate', 'Circular', 'Routine', 'Closed', -90],
    ['GreenGrid Energy PLC', 'Partnerships', 'Proposal', 'Important', 'Pending Review', -7],
    ['Kaduna Polytechnic', 'Registrar', 'Request', 'Routine', 'Responded', -38],
    ['UN Habitat Nigeria', 'Country Office', 'Invitation', 'Urgent', 'Awaiting Response', -3],
    ['Book Aid Foundation', 'Logistics Desk', 'Notice', 'Routine', 'Closed', -66],
    ['Anambra Schools Authority', 'Planning Unit', 'Request', 'Important', 'In Progress', -17],
    ['MicroEnsure Ltd', 'Claims Desk', 'Notice', 'Routine', 'Registered', -15],
    ['Sokoto Youth Forum', 'Chairman', 'Invitation', 'Routine', 'Assigned', -25],
    ['Federal Road Safety Corps', 'Public Affairs', 'Circular', 'Routine', 'Closed', -95],
    ['Harbourview Legal', 'Mr. T. Cole', 'Letter', 'Important', 'Pending Review', -2],
    ['Teachers Registration Council', 'Registrar', 'Notice', 'Important', 'Responded', -34],
    ['Plateau Heritage Foundation', 'Programme Officer', 'Proposal', 'Routine', 'Received', -1],
    ['ECOWAS Health Desk', 'Secretariat', 'Circular', 'Routine', 'Closed', -84],
    ['Lagos Business School', 'Executive Education', 'Invitation', 'Routine', 'Declined' as unknown as CorrStatus, -29],
    ['National Bureau of Statistics', 'Data Desk', 'Request', 'Important', 'In Progress', -20],
    ['Community Water Project', 'Site Manager', 'Report', 'Routine', 'Registered', -23],
    ['Open Society Initiative', 'Grants Unit', 'Request', 'Urgent', 'Awaiting Response', -4],
    ['Ogun State Health Board', 'Director', 'Invitation', 'Routine', 'Responded', -42],
    ['SafeSpace Alliance', 'Coordinator', 'Letter', 'Routine', 'Closed', -57],
    ['Federal Ministry of Labour', 'Inspectorate', 'Notice', 'Important', 'Assigned', -10],
    ['Chad Basin NGO Forum', 'Convenor', 'Invitation', 'Routine', 'Registered', -6],
    ['Nigeria Education Fund', 'Partnerships', 'Proposal', 'Important', 'In Progress', -14],
    ['Cross River Tourism Board', 'Events Desk', 'Invitation', 'Routine', 'Closed', -63],
    ['Meridian Supplies Ltd', 'Account Officer', 'Letter', 'Important', 'Awaiting Response', -8],
  ];
  const genSubjects: Record<CorrType, string> = {
    Letter: 'Correspondence on ongoing programme coordination',
    Invitation: 'Invitation to quarterly partners consultation',
    Memo: 'Internal note on registry process improvements',
    Circular: 'Circular on updated reporting templates',
    Complaint: 'Feedback regarding field visit scheduling',
    Request: 'Request for programme participation data',
    Proposal: 'Partnership proposal for joint community project',
    Application: 'Application for the graduate internship cohort',
    Report: 'Quarterly activity report submission',
    Contract: 'Service agreement for review and signature',
    Notice: 'Statutory notice for annual records update',
    'Government Communication': 'Official communication on compliance requirements',
    Other: 'General correspondence for registry attention',
  };
  const genDept = ['dep_adm', 'dep_prg', 'dep_fin', 'dep_com', 'dep_hrs'];
  const genAssign = ['u_5', 'u_6', 'u_7', 'u_8', 'u_10', 'u_11', 'u_14', 'u_15'];
  genSenders.forEach(([senderOrg, sender, type, priority, status, off], i) => {
    corr({
      ref: nextRef('IN', depts[i % 5].code), direction: 'incoming',
      externalRef: `${senderOrg.split(' ')[0].slice(0, 3).toUpperCase()}/GEN/${YEAR}/${100 + i}`,
      dateReceived: d(off, 9 + (i % 6)), dateOfLetter: d(off - 1, 9),
      sender, senderOrg, recipient: 'The Secretariat',
      subject: genSubjects[type], type, departmentId: genDept[i % 5],
      assignedTo: status === 'Received' ? undefined : genAssign[i % genAssign.length],
      priority, security: i % 9 === 0 ? 'Confidential' : i % 4 === 0 ? 'Public' : 'Internal',
      responseRequired: i % 3 === 0, responseDeadline: i % 3 === 0 ? d(off + 14, 17) : undefined,
      status: status === 'Declined' ? 'Closed' : (status as CorrStatus),
      notes: '', attachments: [],
      archived: off < -75,
    });
  });

  /* ── documents (30) ── */
  const documents: DocumentRecord[] = [];
  function doc(partial: Omit<DocumentRecord, 'id' | 'orgId' | 'archived'> & { id?: string; archived?: boolean }): DocumentRecord {
    const r: DocumentRecord = { id: uid('doc'), orgId, archived: partial.archived ?? false, ...partial } as DocumentRecord;
    documents.push(r);
    return r;
  }
  const v = (version: string, authorId: string, at: string, note: string, fileName: string, sizeKb: number) =>
    ({ version, authorId, at, note, fileName, sizeKb });

  const d_policy = doc({
    fileNumber: nextRef('DOC', 'HRS'), title: 'Staff Handbook 2026 (Working Draft)', category: 'Policy',
    departmentId: 'dep_hrs', ownerId: 'u_8', security: 'Internal', status: 'In Review',
    fileName: 'staff-handbook-2026-v0.3.docx', sizeKb: 412, mime: 'application/docx', ocr: false, matterId: 'm_handbook',
    retention: 'Active', createdAt: d(-18, 10), updatedAt: d(-2, 12),
    versions: [
      v('0.1', 'u_14', d(-18, 10), 'Initial consolidation from 2023 handbook', 'staff-handbook-2026-v0.1.docx', 380),
      v('0.2', 'u_8', d(-10, 9), 'Leave policy rewritten; remote-work clause added', 'staff-handbook-2026-v0.2.docx', 398),
      v('0.3', 'u_14', d(-2, 12), 'Legal comments on code of conduct incorporated', 'staff-handbook-2026-v0.3.docx', 412),
    ],
    body: 'CORTEXA DEMO FOUNDATION — STAFF HANDBOOK 2026. Chapter 1: Code of Conduct. All staff shall act with integrity, impartiality and accountability... Chapter 4: Leave Policy. Annual leave of 20 working days... Chapter 7: Remote Work. Eligible roles may work remotely up to two days per week with supervisor approval.',
  });
  doc({
    fileNumber: nextRef('DOC', 'PRG'), title: 'Briefing Note — Housing Policy Dialogue', category: 'Briefing',
    departmentId: 'dep_prg', ownerId: 'u_10', security: 'Confidential', status: 'Approved',
    fileName: 'briefing-housing-dialogue.pdf', sizeKb: 268, mime: 'application/pdf', ocr: false, matterId: 'm_housing',
    retention: 'Active', createdAt: d(-21, 10), updatedAt: d(-18, 15),
    versions: [v('1.0', 'u_10', d(-21, 10), 'Draft briefing', 'briefing-housing-dialogue.pdf', 240), v('1.1', 'u_5', d(-18, 15), 'Executive edits before approval', 'briefing-housing-dialogue.pdf', 268)],
    body: 'BRIEFING NOTE — National Housing Stakeholders Dialogue. Context: The Federal Ministry of Housing is convening partners to finalise the affordable housing framework. Position: The Foundation supports community-led delivery models with ring-fenced infrastructure funds. Asks: inclusion of NGO delivery partners in the implementation committee.',
  });
  doc({
    fileNumber: nextRef('DOC', 'PRG'), title: 'Teacher Recruitment — Shortlist Report', category: 'Report',
    departmentId: 'dep_prg', ownerId: 'u_5', security: 'Confidential', status: 'Approved',
    fileName: 'teacher-shortlist-report.pdf', sizeKb: 890, mime: 'application/pdf', ocr: false, matterId: 'm_teacher',
    retention: 'Active', createdAt: d(-19, 14), updatedAt: d(-19, 14),
    versions: [v('1.0', 'u_5', d(-19, 14), 'Final shortlist after panel review', 'teacher-shortlist-report.pdf', 890)],
    body: 'Shortlist of 180 candidates across 6 subjects. Recommendation: proceed to interviews for 150 candidates.',
  });
  doc({
    fileNumber: nextRef('DOC', 'FIN'), title: 'Grant Renewal Proposal — World Trust Foundation', category: 'Report',
    departmentId: 'dep_fin', ownerId: 'u_6', security: 'Highly Confidential', status: 'Approved',
    fileName: 'wtf-renewal-proposal-final.pdf', sizeKb: 1560, mime: 'application/pdf', ocr: false, matterId: 'm_grant',
    retention: 'Active', createdAt: d(-15, 9), updatedAt: d(-14, 15),
    versions: [
      v('1.0', 'u_12', d(-30, 10), 'Budget annexes drafted', 'wtf-renewal-proposal-draft1.pdf', 1204),
      v('2.0', 'u_6', d(-16, 11), 'Narrative strengthened; logframe revised', 'wtf-renewal-proposal-draft2.pdf', 1410),
      v('3.0', 'u_6', d(-14, 15), 'Executive sign-off version', 'wtf-renewal-proposal-final.pdf', 1560),
    ],
    body: 'Renewal proposal for the 2027 core programme grant of USD 240,000 covering teacher development, community health and institutional strengthening.',
  });
  const d_inviteScan = doc({
    id: undefined as unknown as string,
    fileNumber: nextRef('DOC', 'ADM'), title: 'Scan — FMH Invitation (FMH/GEN/2026/118)', category: 'Scan',
    departmentId: 'dep_adm', ownerId: 'u_2', security: 'Confidential', status: 'Approved',
    fileName: 'scan-fmh-invitation.pdf', sizeKb: 720, mime: 'application/pdf', ocr: true, matterId: 'm_housing',
    retention: 'Active', createdAt: d(-24, 10, 20), updatedAt: d(-24, 10, 20),
    versions: [v('1.0', 'u_2', d(-24, 10, 20), 'Front-desk scan registered', 'scan-fmh-invitation.pdf', 720)],
    body: 'FEDERAL MINISTRY OF HOUSING — Office of the Permanent Secretary. Invitation to the National Housing Stakeholders Dialogue holding at the Transcorp Hilton, Abuja. The Ministry requests the participation of the Executive Director and a position paper on community-led housing. Reference FMH/GEN/2026/118.',
  });
  d_inviteScan.id = 'doc_invite_scan';
  doc({
    fileNumber: nextRef('DOC', 'ADM'), title: 'MoU Draft — Federal Ministry of Housing (Redline)', category: 'Legal',
    departmentId: 'dep_adm', ownerId: 'u_1', security: 'Highly Confidential', status: 'In Review',
    fileName: 'mou-fmh-redline-v2.docx', sizeKb: 344, mime: 'application/docx', ocr: false, matterId: 'm_mou',
    retention: 'Active', createdAt: d(-12, 10, 40), updatedAt: d(-6, 12),
    versions: [v('1.0', 'u_1', d(-12, 10, 40), 'Ministry draft received', 'mou-fmh-draft.docx', 320), v('2.0', 'u_1', d(-6, 12), 'Counsel redlines incorporated', 'mou-fmh-redline-v2.docx', 344)],
    body: 'MEMORANDUM OF UNDERSTANDING between the Federal Ministry of Housing and Cortexa Demo Foundation for joint research on affordable housing delivery. Clause 4 (data sharing) redlined to require mutual consent...',
  });
  doc({
    fileNumber: nextRef('DOC', 'PRG'), title: 'Minutes — Internal Alignment Meeting (Housing)', category: 'Minutes',
    departmentId: 'dep_prg', ownerId: 'u_2', security: 'Internal', status: 'Circulated',
    fileName: 'minutes-housing-alignment.pdf', sizeKb: 156, mime: 'application/pdf', ocr: false, matterId: 'm_housing',
    retention: 'Active', createdAt: d(-7, 12), updatedAt: d(-7, 12),
    versions: [v('1.0', 'u_2', d(-7, 12), 'Minutes approved by chair', 'minutes-housing-alignment.pdf', 156)],
    body: 'MINUTES — Internal alignment meeting on the housing policy engagement. Decisions: (1) ED to lead delegation; (2) position paper to be finalised; (3) follow-up with Ministry on implementation committee seat.',
  });
  doc({
    fileNumber: nextRef('DOC', 'PRG'), title: 'Outreach Report — Gwagwalada Mobile Clinic (Draft)', category: 'Report',
    departmentId: 'dep_prg', ownerId: 'u_10', security: 'Internal', status: 'In Review',
    fileName: 'gwagwalada-outreach-report-draft.docx', sizeKb: 512, mime: 'application/docx', ocr: false, matterId: 'm_health',
    retention: 'Active', createdAt: d(-4, 17, 10), updatedAt: d(-4, 17, 10),
    versions: [v('0.1', 'u_10', d(-4, 17, 10), 'First draft from field notes', 'gwagwalada-outreach-report-draft.docx', 512)],
    body: 'Mobile clinic outreach served 342 patients across 3 days. Key outcomes: 58 referrals, 1,120 ITN nets distributed.',
  });
  doc({
    fileNumber: nextRef('DOC', 'COM'), title: 'Sunrise TV Partnership Agreement (Executed)', category: 'Contract',
    departmentId: 'dep_com', ownerId: 'u_7', security: 'Internal', status: 'Approved',
    fileName: 'sunrise-tv-agreement-executed.pdf', sizeKb: 980, mime: 'application/pdf', ocr: false, matterId: 'm_media',
    retention: 'Active', createdAt: d(-6, 10, 30), updatedAt: d(-6, 10, 30),
    versions: [v('1.0', 'u_7', d(-6, 10, 30), 'Executed copy scanned after signature', 'sunrise-tv-agreement-executed.pdf', 980)],
    body: 'Partnership agreement for a monthly public-interest segment. Term: 12 months. Airtime: second Saturday, 19:00.',
  });
  doc({
    fileNumber: nextRef('DOC', 'FIN'), title: 'Q3 Compliance Return (Draft)', category: 'Report',
    departmentId: 'dep_adm', ownerId: 'u_2', security: 'Internal', status: 'Draft',
    fileName: 'compliance-return-q3.xlsx', sizeKb: 220, mime: 'application/xlsx', ocr: false,
    retention: 'Active', createdAt: d(-1, 15), updatedAt: d(0, 8, 50),
    versions: [v('0.1', 'u_2', d(-1, 15), 'Template populated', 'compliance-return-q3.xlsx', 210), v('0.2', 'u_2', d(0, 8, 50), 'Figures verified with Finance', 'compliance-return-q3.xlsx', 220)],
    body: 'Quarterly compliance return covering governance filings, staff changes and statutory payments for Q3.',
  });
  doc({
    fileNumber: nextRef('DOC', 'FIN'), title: 'Annual Financial Statements 2025 (Audited)', category: 'Financial',
    departmentId: 'dep_fin', ownerId: 'u_6', security: 'Highly Confidential', status: 'Approved',
    fileName: 'audited-statements-2025.pdf', sizeKb: 2140, mime: 'application/pdf', ocr: false,
    retention: 'Active', createdAt: d(-60, 10), updatedAt: d(-60, 10),
    versions: [v('1.0', 'u_6', d(-60, 10), 'Audited copy from external auditors', 'audited-statements-2025.pdf', 2140)],
    body: 'Audited financial statements for the year ended 31 December 2025. Unqualified opinion.',
  });
  doc({
    fileNumber: nextRef('DOC', 'PRG'), title: 'Scan — Permit Approval, Gwagwalada Area Council', category: 'Scan',
    departmentId: 'dep_prg', ownerId: 'u_2', security: 'Internal', status: 'Approved',
    fileName: 'scan-permit-gwagwalada.pdf', sizeKb: 640, mime: 'application/pdf', ocr: true, matterId: 'm_health',
    retention: 'Active', createdAt: d(-16, 12, 30), updatedAt: d(-16, 12, 30),
    versions: [v('1.0', 'u_2', d(-16, 12, 30), 'Permit scanned on receipt', 'scan-permit-gwagwalada.pdf', 640)],
    body: 'GWAGWALADA AREA COUNCIL — Permit for mobile clinic outreach approved for the period requested. Conditions: notification of council health officer 48 hours before commencement.',
  });
  doc({
    fileNumber: nextRef('DOC', 'COM'), title: 'Annual Report 2025 — Final Layout', category: 'Report',
    departmentId: 'dep_com', ownerId: 'u_13', security: 'Internal', status: 'In Review',
    fileName: 'annual-report-2025-layout.pdf', sizeKb: 3400, mime: 'application/pdf', ocr: false, matterId: 'm_annual',
    retention: 'Active', createdAt: d(-8, 9, 20), updatedAt: d(-8, 9, 20),
    versions: [v('1.0', 'u_13', d(-20, 14), 'Design draft', 'annual-report-2025-design.pdf', 3100), v('2.0', 'u_13', d(-8, 9, 20), 'Final layout for approval', 'annual-report-2025-layout.pdf', 3400)],
    body: 'Annual report covering programme outcomes across education, health and institutional strengthening.',
  });
  doc({
    fileNumber: nextRef('DOC', 'HRS'), title: 'Volunteer Policy — Benchmark Review', category: 'Report',
    departmentId: 'dep_hrs', ownerId: 'u_14', security: 'Internal', status: 'Draft',
    fileName: 'volunteer-policy-benchmark.pdf', sizeKb: 388, mime: 'application/pdf', ocr: false, matterId: 'm_volunteer',
    retention: 'Active', createdAt: d(-5, 16, 20), updatedAt: d(-5, 16, 20),
    versions: [v('1.0', 'u_14', d(-5, 16, 20), 'Benchmark findings from 4 NGOs', 'volunteer-policy-benchmark.pdf', 388)],
    body: 'Benchmark review of volunteer management practice: onboarding, insurance cover, stipends and recognition schemes.',
  });
  /* generated docs to 30 */
  const genDocs: [string, DocCategory, string, SecurityLevel, number, boolean][] = [
    ['Procurement Bid Evaluation Report', 'Report', 'dep_fin', 'Confidential', -27, false],
    ['Partner Schools Directory 2026', 'Form', 'dep_prg', 'Public', -50, false],
    ['Board Meeting Minutes — June', 'Minutes', 'dep_adm', 'Confidential', -65, false],
    ['Safeguarding Policy (Current)', 'Policy', 'dep_hrs', 'Internal', -120, false],
    ['Media Coverage Summary — Q2', 'Communication', 'dep_com', 'Public', -58, false],
    ['Vehicle Logbook Extracts', 'Form', 'dep_adm', 'Internal', -33, true],
    ['Donor Reporting Calendar', 'Form', 'dep_fin', 'Internal', -44, false],
    ['Health Outreach Roster — Volunteers', 'Form', 'dep_prg', 'Internal', -15, false],
    ['ICT Asset Register', 'Form', 'dep_adm', 'Internal', -70, true],
    ['Legal Opinion — Employment Matter', 'Legal', 'dep_hrs', 'Highly Confidential', -26, false],
    ['Press Release — Recruitment Milestone', 'Communication', 'dep_com', 'Public', -9, false],
    ['Budget Utilisation Statement Q2', 'Financial', 'dep_fin', 'Confidential', -39, false],
    ['Training Needs Assessment', 'Report', 'dep_hrs', 'Internal', -52, false],
    ['Scan — Utility Clearance Certificate', 'Scan', 'dep_adm', 'Internal', -88, true],
    ['Community Feedback Digest', 'Report', 'dep_prg', 'Public', -21, false],
    ['Insurance Certificate 2026', 'Legal', 'dep_fin', 'Confidential', -102, true],
  ];
  genDocs.forEach(([title, category, dept, security, off, ocr], i) => {
    const ext = ocr ? 'pdf' : ['docx', 'xlsx', 'pdf'][i % 3];
    const size = 120 + ((i * 97) % 900);
    doc({
      fileNumber: nextRef('DOC', depts[i % 5].code), title: title as string, category: category as DocCategory,
      departmentId: dept, ownerId: genAssign[i % genAssign.length], security: security as SecurityLevel,
      status: off < -80 ? 'Archived' : ['Approved', 'Circulated', 'In Review'][i % 3] as DocumentRecord['status'],
      fileName: `${(title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.${ext}`,
      sizeKb: size, mime: `application/${ext}`, ocr: ocr as boolean,
      retention: off < -80 ? 'Archived' : 'Active', createdAt: d(off, 10), updatedAt: d(off, 10),
      versions: [v('1.0', genAssign[i % genAssign.length], d(off, 10), 'Registered copy', `file-${i}.${ext}`, size)],
      body: ocr ? `Scanned record: ${title}. Extracted by OCR — reference details captured into the registry for search.` : undefined,
      archived: off < -80,
    });
  });

  /* ── meetings (15) ── */
  const meetings: Meeting[] = [];
  function mtg(p: Omit<Meeting, 'id' | 'orgId' | 'archived'> & { archived?: boolean }): Meeting {
    const m: Meeting = { id: uid('mt'), orgId, archived: p.archived ?? false, ...p } as Meeting;
    meetings.push(m);
    return m;
  }
  const mtgHousing = mtg({
    ref: nextRef('MTG', 'ADM'), title: 'National Housing Stakeholders Dialogue', date: dateOnly(5),
    startTime: '10:00', endTime: '13:00', venue: 'Transcorp Hilton, Abuja', organiserId: 'u_3',
    participantIds: ['u_3', 'u_1', 'u_5'], externalOrgs: ['Federal Ministry of Housing', 'UN Habitat Nigeria'],
    description: 'National dialogue on the affordable housing framework. ED presents the Foundation\u2019s position.',
    agenda: [
      { id: uid('ag'), order: 1, text: 'Opening remarks — Honourable Minister' },
      { id: uid('ag'), order: 2, text: 'Framework presentation by Ministry technical team' },
      { id: uid('ag'), order: 3, text: 'Partner positions — ED presents Foundation note' },
      { id: uid('ag'), order: 4, text: 'Implementation committee nominations' },
    ],
    status: 'Confirmed', isInvitation: true, response: 'Accepted',
    relatedCorrId: c_housingInvite.id, matterId: 'm_housing',
  });
  mtg({
    ref: nextRef('MTG', 'ADM'), title: 'Executive Briefing — Weekly', date: dateOnly(0), startTime: '09:00', endTime: '09:45',
    venue: 'Boardroom', organiserId: 'u_2', participantIds: ['u_1', 'u_2', 'u_3', 'u_9'], externalOrgs: [],
    description: 'Weekly briefing: correspondence received, deadlines and executive decisions required.',
    agenda: [
      { id: uid('ag'), order: 1, text: 'Registry summary — correspondence received' },
      { id: uid('ag'), order: 2, text: 'Pending approvals' },
      { id: uid('ag'), order: 3, text: 'Deadlines this week' },
    ],
    status: 'Confirmed', isInvitation: false, response: 'Accepted',
  });
  mtg({
    ref: nextRef('MTG', 'PRG'), title: 'Education Partners Roundtable', date: dateOnly(3), startTime: '11:00', endTime: '13:30',
    venue: 'Lagos State Schools Board', virtualLink: 'https://meet.example.edu/roundtable', organiserId: 'u_3',
    participantIds: ['u_3', 'u_5'], externalOrgs: ['Lagos State Schools Board'],
    description: 'Roundtable on teacher deployment data and the 2026/27 session plan.',
    agenda: [
      { id: uid('ag'), order: 1, text: 'Deployment data review' },
      { id: uid('ag'), order: 2, text: 'Session planning' },
    ],
    status: 'Scheduled', isInvitation: true, response: 'Pending',
    relatedCorrId: correspondence[6].id,
  });
  mtg({
    ref: nextRef('MTG', 'FIN'), title: 'Grant Due-Diligence War Room', date: dateOnly(1), startTime: '14:00', endTime: '16:00',
    venue: 'Finance Conference Room', organiserId: 'u_6', participantIds: ['u_6', 'u_12', 'u_1', 'u_17'], externalOrgs: [],
    description: 'Complete the World Trust Foundation due-diligence questionnaire before deadline.',
    agenda: [
      { id: uid('ag'), order: 1, text: 'Governance annex' },
      { id: uid('ag'), order: 2, text: 'Finance annex with audited statements' },
      { id: uid('ag'), order: 3, text: 'Safeguarding annex' },
    ],
    status: 'Confirmed', isInvitation: false, response: 'Accepted', matterId: 'm_grant',
  });
  mtg({
    ref: nextRef('MTG', 'PRG'), title: 'Health Compact Signatory Ceremony', date: dateOnly(7), startTime: '10:00', endTime: '12:00',
    venue: 'NMA National Secretariat, Abuja', organiserId: 'u_3', participantIds: ['u_3', 'u_10'],
    externalOrgs: ['Nigerian Medical Association', 'West Africa Health Network'],
    description: 'Signatory ceremony for the community health compact.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Signing ceremony' }, { id: uid('ag'), order: 2, text: 'Press briefing' }],
    status: 'Scheduled', isInvitation: true, response: 'Pending', relatedCorrId: correspondence[16].id, matterId: 'm_health',
  });
  mtg({
    ref: nextRef('MTG', 'HRS'), title: 'Handbook Revision Committee', date: dateOnly(2), startTime: '15:00', endTime: '16:30',
    venue: 'HR Meeting Room', organiserId: 'u_8', participantIds: ['u_8', 'u_14', 'u_9'], externalOrgs: [],
    description: 'Review legal comments and close out the handbook working draft.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Legal comments walkthrough' }, { id: uid('ag'), order: 2, text: 'Final edits' }],
    status: 'Confirmed', isInvitation: false, response: 'Accepted', matterId: 'm_handbook',
  });
  mtg({
    ref: nextRef('MTG', 'COM'), title: 'Annual Report — Print Proof Review', date: dateOnly(4), startTime: '11:30', endTime: '12:30',
    venue: 'Communications Studio', organiserId: 'u_13', participantIds: ['u_13', 'u_7', 'u_20'], externalOrgs: ['Printcraft Vendors'],
    description: 'Review print proofs before final production run.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Proof review' }, { id: uid('ag'), order: 2, text: 'Production sign-off' }],
    status: 'Scheduled', isInvitation: false, response: 'Accepted', matterId: 'm_annual',
  });
  mtg({
    ref: nextRef('MTG', 'ADM'), title: 'Board Sub-Committee — Governance', date: dateOnly(9), startTime: '16:00', endTime: '17:30',
    venue: 'Virtual', virtualLink: 'https://meet.example.org/gov-42', organiserId: 'u_3',
    participantIds: ['u_3', 'u_1', 'u_19'], externalOrgs: [],
    description: 'Quarterly governance sub-committee.',
    agenda: [{ id: uid('ag'), order: 1, text: 'MoU register review' }, { id: uid('ag'), order: 2, text: 'Policy pipeline' }],
    status: 'Scheduled', isInvitation: false, response: 'Accepted', matterId: 'm_mou',
  });
  mtg({
    ref: nextRef('MTG', 'PRG'), title: 'Outreach Debrief — Gwagwalada', date: dateOnly(-2), startTime: '10:00', endTime: '11:30',
    venue: 'Programmes Room', organiserId: 'u_5', participantIds: ['u_5', 'u_10', 'u_11', 'u_16'], externalOrgs: [],
    description: 'Debrief of the mobile clinic outreach; lessons and final report inputs.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Field report' }, { id: uid('ag'), order: 2, text: 'Lessons learned' }],
    status: 'Completed', isInvitation: false, response: 'Accepted', matterId: 'm_health', minutesDocId: documents.find((x) => x.title.includes('Gwagwalada'))?.id,
  });
  mtg({
    ref: nextRef('MTG', 'PRG'), title: 'Shortlist Review Panel', date: dateOnly(-20), startTime: '09:30', endTime: '12:00',
    venue: 'Boardroom', organiserId: 'u_5', participantIds: ['u_5', 'u_10', 'u_11'], externalOrgs: [],
    description: 'Panel review of teacher recruitment applications.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Applications review' }],
    status: 'Completed', isInvitation: false, response: 'Accepted', matterId: 'm_teacher',
    minutesDocId: documents.find((x) => x.title.includes('Shortlist'))?.id,
  });
  mtg({
    ref: nextRef('MTG', 'FIN'), title: 'Budget Defence — Grant Renewal', date: dateOnly(-30), startTime: '14:00', endTime: '16:00',
    venue: 'Finance Conference Room', organiserId: 'u_6', participantIds: ['u_6', 'u_12', 'u_1'], externalOrgs: [],
    description: 'Defence of the renewal budget before submission.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Budget lines review' }],
    status: 'Completed', isInvitation: false, response: 'Accepted', matterId: 'm_grant',
  });
  mtg({
    ref: nextRef('MTG', 'FIN'), title: 'Bid Evaluation Committee', date: dateOnly(-28), startTime: '11:00', endTime: '13:00',
    venue: 'Finance Conference Room', organiserId: 'u_6', participantIds: ['u_6', 'u_17', 'u_9'], externalOrgs: [],
    description: 'Evaluation of bids for office equipment procurement.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Technical evaluation' }, { id: uid('ag'), order: 2, text: 'Financial evaluation' }],
    status: 'Completed', isInvitation: false, response: 'Accepted', matterId: 'm_procure',
    minutesDocId: documents.find((x) => x.title.includes('Bid Evaluation'))?.id,
  });
  mtg({
    ref: nextRef('MTG', 'COM'), title: 'Content Calendar Sync — Sunrise TV', date: dateOnly(-16), startTime: '15:00', endTime: '16:00',
    venue: 'Sunrise TV Studios', organiserId: 'u_7', participantIds: ['u_7', 'u_13'], externalOrgs: ['Sunrise TV'],
    description: 'Agreement of the 12-month content calendar.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Calendar agreement' }],
    status: 'Completed', isInvitation: false, response: 'Accepted', matterId: 'm_media',
  });
  mtg({
    ref: nextRef('MTG', 'ADM'), title: 'Partners Consultation — Eastern Region', date: dateOnly(-4), startTime: '10:00', endTime: '12:00',
    venue: 'Enugu', organiserId: 'u_1', participantIds: ['u_1'], externalOrgs: ['Eastern Partners Forum'],
    description: 'Regional partners consultation — postponed by host.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Regional workplan' }],
    status: 'Rescheduled', isInvitation: true, response: 'Rescheduled',
  });
  mtg({
    ref: nextRef('MTG', 'HRS'), title: 'Welfare Committee Sitting', date: dateOnly(6), startTime: '12:30', endTime: '13:30',
    venue: 'HR Meeting Room', organiserId: 'u_8', participantIds: ['u_8', 'u_14'], externalOrgs: [],
    description: 'Monthly welfare committee.',
    agenda: [{ id: uid('ag'), order: 1, text: 'Staff welfare cases' }],
    status: 'Scheduled', isInvitation: false, response: 'Accepted',
  });
  void mtgHousing;

  /* ── tasks (25) ── */
  const tasks: TaskItem[] = [];
  function task(p: Omit<TaskItem, 'id' | 'orgId' | 'ref' | 'archived'> & { archived?: boolean }): TaskItem {
    const t: TaskItem = { id: uid('tsk'), orgId, ref: nextRef('TSK', 'GEN'), archived: p.archived ?? false, ...p } as TaskItem;
    tasks.push(t);
    return t;
  }
  task({
    title: 'Prepare briefing note on housing proposal', description: 'Consolidate position on community-led delivery ahead of the stakeholders dialogue.',
    assigneeId: 'u_5', createdById: 'u_3', departmentId: 'dep_prg', priority: 'Urgent',
    dueDate: d(-2, 17), status: 'Completed', relatedType: 'matter', relatedId: 'm_housing', completedAt: d(-3, 16), createdAt: d(-20, 9),
  });
  task({
    title: 'Complete grant due-diligence questionnaire', description: 'Return the WTF questionnaire with governance, finance and safeguarding annexes.',
    assigneeId: 'u_6', createdById: 'u_1', departmentId: 'dep_fin', priority: 'Urgent',
    dueDate: d(-1, 17), status: 'In Progress', relatedType: 'correspondence', relatedId: correspondence[2].id, createdAt: d(-3, 10),
  });
  task({
    title: 'Verify volunteer stipend payment records', description: 'Cross-check payment records for Kano volunteers before responding to the complaint.',
    assigneeId: 'u_8', createdById: 'u_1', departmentId: 'dep_hrs', priority: 'Urgent',
    dueDate: d(0, 15), status: 'In Progress', relatedType: 'correspondence', relatedId: correspondence[5].id, createdAt: d(-6, 11),
  });
  task({
    title: 'Consolidate teacher deployment figures', description: 'Figures required for the Federal Ministry of Education response.',
    assigneeId: 'u_11', createdById: 'u_5', departmentId: 'dep_prg', priority: 'Important',
    dueDate: d(1, 12), status: 'In Progress', relatedType: 'correspondence', relatedId: correspondence[1].id, createdAt: d(-8, 10),
  });
  task({
    title: 'Respond to The Civic Herald interview request', description: 'Schedule and confirm the 30-minute interview with the Programmes Manager.',
    assigneeId: 'u_7', createdById: 'u_2', departmentId: 'dep_com', priority: 'Routine',
    dueDate: d(-1, 17), status: 'Pending', relatedType: 'correspondence', relatedId: correspondence[18].id, createdAt: d(-8, 12),
  });
  task({
    title: 'Dispatch offer letters — recruitment batch 1', description: '48 offer letters to be dispatched with contracts attached.',
    assigneeId: 'u_10', createdById: 'u_5', departmentId: 'dep_prg', priority: 'Important',
    dueDate: d(2, 17), status: 'In Progress', relatedType: 'matter', relatedId: 'm_teacher', createdAt: d(-5, 9),
  });
  task({
    title: 'Obtain executive sign-off on Q3 compliance return', description: 'Circulate final figures to ED for sign-off before physical dispatch.',
    assigneeId: 'u_2', createdById: 'u_1', departmentId: 'dep_adm', priority: 'Important',
    dueDate: d(0, 12), status: 'Not Started', relatedType: 'document', relatedId: documents.find((x) => x.title.includes('Q3 Compliance'))?.id, createdAt: d(-1, 16),
  });
  task({
    title: 'File MoU clean draft for signature', description: 'Prepare signature copies of the clean MoU draft for ED and the Ministry.',
    assigneeId: 'u_15', createdById: 'u_1', departmentId: 'dep_adm', priority: 'Important',
    dueDate: d(3, 12), status: 'Not Started', relatedType: 'matter', relatedId: 'm_mou', createdAt: d(-1, 17, 15),
  });
  task({
    title: 'Submit annual tax clearance documents', description: 'Compile audited statements for the FIRS review.',
    assigneeId: 'u_12', createdById: 'u_6', departmentId: 'dep_fin', priority: 'Urgent',
    dueDate: d(8, 17), status: 'Not Started', relatedType: 'correspondence', relatedId: correspondence[17].id, createdAt: d(0, 9, 45),
  });
  task({
    title: 'Confirm NMA signatory ceremony delegation', description: 'Confirm ED attendance and prepare signing folder.',
    assigneeId: 'u_2', createdById: 'u_3', departmentId: 'dep_adm', priority: 'Important',
    dueDate: d(4, 12), status: 'Not Started', relatedType: 'meeting', relatedId: meetings[4].id, createdAt: d(0, 9),
  });
  task({
    title: 'Publish outreach report for partners', description: 'Final edits, approval and distribution of the Gwagwalada outreach report.',
    assigneeId: 'u_10', createdById: 'u_5', departmentId: 'dep_prg', priority: 'Routine',
    dueDate: d(6, 17), status: 'In Progress', relatedType: 'document', relatedId: documents.find((x) => x.title.includes('Outreach Report'))?.id, createdAt: d(-4, 17, 30),
  });
  task({
    title: 'Update partner schools directory', description: 'Annual refresh of the directory ahead of the new session.',
    assigneeId: 'u_16', createdById: 'u_5', departmentId: 'dep_prg', priority: 'Routine',
    dueDate: d(12, 17), status: 'Not Started', relatedType: 'matter', relatedId: 'm_teacher', createdAt: d(-10, 10),
  });
  /* generated tasks */
  const genTasks: [string, string, string, TaskStatus, number][] = [
    ['Reconcile Q2 budget utilisation figures', 'u_12', 'dep_fin', 'Completed', -12],
    ['Draft press release for recruitment milestone', 'u_13', 'dep_com', 'Completed', -9],
    ['Renew vehicle insurance certificate', 'u_15', 'dep_adm', 'Completed', -20],
    ['Schedule handbook committee follow-up', 'u_14', 'dep_hrs', 'Completed', -3],
    ['Digitise 2024 correspondence register', 'u_4', 'dep_adm', 'In Progress', 10],
    ['Compile volunteer hours for Q3', 'u_14', 'dep_hrs', 'Not Started', 9],
    ['Prepare board pack — governance sub-committee', 'u_2', 'dep_adm', 'Not Started', 8],
    ['Request quotations for annual report printing', 'u_13', 'dep_com', 'In Progress', 5],
    ['Archive procurement file after award', 'u_17', 'dep_fin', 'Completed', -11],
    ['Update website programme pages', 'u_20', 'dep_com', 'Pending', 4],
    ['Conduct stock-take of IT assets', 'u_18', 'dep_adm', 'Not Started', 15],
    ['Send acknowledgement letters — new registrations', 'u_4', 'dep_adm', 'Completed', -2],
    ['Book venue for end-of-year partners forum', 'u_2', 'dep_adm', 'Not Started', 20],
  ];
  genTasks.forEach(([title, assignee, dept, status, off], i) => {
    task({
      title: title as string, description: 'Operational task generated from departmental workplans.',
      assigneeId: assignee, createdById: 'u_1', departmentId: dept,
      priority: (['Routine', 'Important', 'Routine', 'Important', 'Important', 'Routine', 'Important', 'Routine', 'Routine', 'Routine', 'Routine', 'Routine', 'Important'][i] as Priority),
      dueDate: d(off, 17), status: status as TaskStatus,
      completedAt: (status as TaskStatus) === 'Completed' ? d(off - 1, 16) : undefined,
      createdAt: d(off - 7, 9),
    });
  });

  /* ── approvals ── */
  const approvals: ApprovalRecord[] = [
    {
      id: 'apr_1', orgId, recordType: 'document', recordId: d_policy.id, title: 'Staff Handbook 2026 (Working Draft)',
      requestedById: 'u_8', currentStep: 1, overall: 'Pending', createdAt: d(-2, 13),
      chain: [
        { role: 'Department Head', userId: 'u_8', state: 'Approved', decidedAt: d(-2, 12, 40), comment: 'Legal comments incorporated.' },
        { role: 'Executive', state: 'Pending' },
        { role: 'Organisation Admin', state: 'Pending' },
      ],
    },
    {
      id: 'apr_2', orgId, recordType: 'document', recordId: documents.find((x) => x.title.includes('Annual Report'))!.id, title: 'Annual Report 2025 — Final Layout',
      requestedById: 'u_13', currentStep: 0, overall: 'Pending', createdAt: d(-8, 9, 40),
      chain: [
        { role: 'Department Head', state: 'Pending' },
        { role: 'Executive', state: 'Pending' },
      ],
    },
    {
      id: 'apr_3', orgId, recordType: 'document', recordId: documents.find((x) => x.title.includes('Q3 Compliance'))!.id, title: 'Q3 Compliance Return (Draft)',
      requestedById: 'u_2', currentStep: 0, overall: 'Pending', createdAt: d(-1, 15, 30),
      chain: [{ role: 'Department Head', state: 'Pending' }, { role: 'Organisation Admin', state: 'Pending' }],
    },
    {
      id: 'apr_4', orgId, recordType: 'document', recordId: documents.find((x) => x.title.includes('MoU Draft'))!.id, title: 'MoU — Federal Ministry of Housing (Redline)',
      requestedById: 'u_1', currentStep: 1, overall: 'Changes Requested', createdAt: d(-6, 12, 10),
      chain: [
        { role: 'Department Head', userId: 'u_9', state: 'Approved', decidedAt: d(-6, 14), comment: 'Administration concurs.' },
        { role: 'Executive', userId: 'u_3', state: 'Changes Requested', decidedAt: d(-5, 10), comment: 'Tighten clause 4 on data sharing before Ministry circulation.' },
      ],
    },
    {
      id: 'apr_5', orgId, recordType: 'document', recordId: documents.find((x) => x.title.includes('Sunrise TV'))!.id, title: 'Sunrise TV Partnership Agreement (Executed)',
      requestedById: 'u_7', currentStep: 2, overall: 'Approved', createdAt: d(-7, 9),
      chain: [
        { role: 'Department Head', userId: 'u_7', state: 'Approved', decidedAt: d(-7, 10) },
        { role: 'Executive', userId: 'u_3', state: 'Approved', decidedAt: d(-7, 12) },
        { role: 'Organisation Admin', userId: 'u_1', state: 'Approved', decidedAt: d(-6, 9), comment: 'Approved for execution.' },
      ],
    },
  ];

  /* ── emails ── */
  const emails: EmailRecord[] = [
    {
      id: 'em_1', orgId, from: 'Protocol Office — Federal Ministry of Housing', fromEmail: 'protocol@fmh.example.gov',
      subject: 'Invitation to National Housing Dialogue — reminder and programme', receivedAt: d(-20, 8, 50),
      body: 'Dear Executive Director, further to our invitation FMH/GEN/2026/118, please find attached the final programme for the National Housing Stakeholders Dialogue. Kindly confirm your delegation by close of business.',
      attachments: ['programme-housing-dialogue.pdf'], registeredCorrId: c_housingInvite.id,
    },
    {
      id: 'em_2', orgId, from: 'Grants Desk — World Trust Foundation', fromEmail: 'grants@worldtrust.example.org',
      subject: 'Acknowledgement — grant renewal proposal received', receivedAt: d(-13, 17, 20),
      body: 'Thank you for submitting your renewal proposal. Our review panel will revert within six weeks. The due-diligence questionnaire follows under separate cover.',
      attachments: [], registeredCorrId: correspondence[12].id,
    },
    {
      id: 'em_3', orgId, from: 'Events — Nigerian Medical Association', fromEmail: 'events@nma.example.org',
      subject: 'Invitation: signatory ceremony — community health compact', receivedAt: d(-1, 18, 5),
      body: 'The NMA invites the Executive Director to the signatory ceremony of the community health compact at the National Secretariat. Kindly confirm participation.',
      attachments: ['compact-ceremony-note.pdf'],
    },
    {
      id: 'em_4', orgId, from: 'Editorial — The Civic Herald', fromEmail: 'editorial@civicherald.example.ng',
      subject: 'Interview request — teacher recruitment programme', receivedAt: d(-8, 10, 45),
      body: 'We are profiling education partnerships and would like a 30-minute interview with your Programmes Manager this month.',
      attachments: [], registeredCorrId: correspondence[18].id,
    },
    {
      id: 'em_5', orgId, from: 'Corporate Banking — Unity Bank PLC', fromEmail: 'corporate@unitybank.example.com',
      subject: 'Credit facility review — documentation checklist', receivedAt: d(-13, 9, 15),
      body: 'Please find the documentation checklist for your annual credit facility review. Kindly provide items within ten working days.',
      attachments: ['facility-checklist.xlsx'], registeredCorrId: correspondence[7].id,
    },
  ];

  /* ── contacts ── */
  const contacts: Contact[] = [
    { id: 'ct_1', orgId, name: 'Arc. Bello Danladi', position: 'Director, Partnerships', organisation: 'Federal Ministry of Housing', email: 'b.danladi@fmh.example.gov', phone: '+234 803 111 2201', address: 'Ministries, Abuja', website: 'fmh.example.gov', notes: 'Primary counterpart on the housing engagement.', tags: ['government', 'housing'] },
    { id: 'ct_2', orgId, name: 'Mrs. R. Okafor', position: 'Chief Education Officer', organisation: 'Federal Ministry of Education', email: 'r.okafor@fme.example.gov', phone: '+234 805 222 8810', address: 'Federal Secretariat, Abuja', website: '', notes: 'Handles deployment data requests.', tags: ['government', 'education'] },
    { id: 'ct_3', orgId, name: 'Ms. Laura Whitfield', position: 'Senior Grants Officer', organisation: 'World Trust Foundation', email: 'l.whitfield@worldtrust.example.org', phone: '+44 20 7946 0958', address: 'London, United Kingdom', website: 'worldtrust.example.org', notes: 'Manages our core grant renewal.', tags: ['donor'] },
    { id: 'ct_4', orgId, name: 'Prof. A. Yusuf', position: 'Chairman', organisation: 'Nigerian Medical Association', email: 'chairman@nma.example.org', phone: '+234 802 445 7789', address: 'NMA Secretariat, Abuja', website: '', notes: '', tags: ['health', 'partner'] },
    { id: 'ct_5', orgId, name: 'Mr. Dayo Okonjo', position: 'Head of Content', organisation: 'Sunrise TV', email: 'd.okonjo@sunrisetv.example.ng', phone: '+234 809 771 2040', address: 'Victoria Island, Lagos', website: 'sunrisetv.example.ng', notes: 'Partnership segment coordinator.', tags: ['media'] },
    { id: 'ct_6', orgId, name: 'Dr. (Mrs.) F. Adesina', position: 'Chairman', organisation: 'Lagos State Schools Board', email: 'chairman@lssb.example.ng', phone: '+234 803 900 1123', address: 'Alausa, Lagos', website: '', notes: '', tags: ['education', 'government'] },
    { id: 'ct_7', orgId, name: 'Comr. Sadiq Bala', position: 'Secretary', organisation: 'Kano Youth Council', email: 'secretary@kyc.example.ng', phone: '+234 806 334 5511', address: 'Kano', website: '', notes: 'Raised the volunteer stipend complaint.', tags: ['youth'] },
    { id: 'ct_8', orgId, name: 'Mr. T. Cole', position: 'Principal Partner', organisation: 'Harbourview Legal', email: 't.cole@harbourview.example.ng', phone: '+234 802 887 4402', address: 'Marina, Lagos', website: 'harbourview.example.ng', notes: 'External counsel for the MoU.', tags: ['legal'] },
    { id: 'ct_9', orgId, name: 'Ms. N. Ezeani', position: 'Account Officer', organisation: 'Meridian Supplies Ltd', email: 'accounts@meridian.example.ng', phone: '+234 805 610 0034', address: 'Wuse II, Abuja', website: '', notes: 'Awarded vendor — lot 2.', tags: ['vendor'] },
    { id: 'ct_10', orgId, name: 'Mr. E. Osei', position: 'Programme Director', organisation: 'National Youth Council', email: 'e.osei@nyc.example.ng', phone: '+234 803 415 9920', address: 'Abuja', website: '', notes: '', tags: ['youth', 'partner'] },
    { id: 'ct_11', orgId, name: 'Mrs. K. Danladi', position: 'Desk Officer', organisation: 'Federal Ministry of Education', email: 'k.danladi@fme.example.gov', phone: '+234 806 220 7745', address: 'Federal Secretariat, Abuja', website: '', notes: '', tags: ['government', 'education'] },
    { id: 'ct_12', orgId, name: 'Dr. P. Briggs', position: 'Programme Lead', organisation: 'Rivers State Education Board', email: 'p.briggs@rseb.example.ng', phone: '+234 809 118 6620', address: 'Port Harcourt', website: '', notes: '', tags: ['education'] },
    { id: 'ct_13', orgId, name: 'Ms. H. Country', position: 'Country Representative', organisation: 'UN Habitat Nigeria', email: 'habitat-ng@un.example.org', phone: '+234 803 555 0107', address: 'UN House, Abuja', website: 'unhabitat.example.org', notes: 'Invited us to the urban policy forum.', tags: ['partner', 'housing'] },
    { id: 'ct_14', orgId, name: 'Mr. O. Esezi', position: 'Trustee', organisation: 'Delta Communities Trust', email: 'o.esezi@dct.example.ng', phone: '+234 805 903 2280', address: 'Asaba', website: '', notes: 'Fielded a scheduling complaint in Q3.', tags: ['community'] },
  ];

  /* ── notifications ── */
  const notifications: NotificationItem[] = [
    { id: uid('nt'), orgId, userId: 'u_3', category: 'Approvals', title: 'Approval requested', body: 'Staff Handbook 2026 is awaiting your executive approval.', at: d(-2, 13, 5), read: false, link: { name: 'desk-executive' } },
    { id: uid('nt'), orgId, userId: 'u_3', category: 'Meetings', title: 'Meeting confirmed', body: 'National Housing Stakeholders Dialogue — Transcorp Hilton, 10:00 AM.', at: d(-20, 10), read: false, link: { name: 'meetings' } },
    { id: uid('nt'), orgId, userId: 'u_2', category: 'Correspondence', title: 'New correspondence received', body: 'NMA signatory ceremony invitation received at front desk.', at: d(0, 8, 42), read: false, link: { name: 'correspondence' } },
    { id: uid('nt'), orgId, userId: 'u_2', category: 'Deadlines', title: 'Deadline today', body: 'Q3 compliance return requires executive sign-off today.', at: d(0, 8), read: false, link: { name: 'tasks' } },
    { id: uid('nt'), orgId, userId: 'u_6', category: 'Deadlines', title: 'OVERDUE: response required', body: 'World Trust Foundation due-diligence questionnaire is past its deadline.', at: d(0, 7, 50), read: false, link: { name: 'correspondence' } },
    { id: uid('nt'), orgId, userId: 'u_1', category: 'Approvals', title: 'Changes requested', body: 'Dr. Eze requested changes on the MoU redline (clause 4).', at: d(-5, 10, 10), read: false, link: { name: 'documents' } },
    { id: uid('nt'), orgId, userId: 'u_5', category: 'Tasks', title: 'Task due tomorrow', body: 'Consolidate teacher deployment figures for FME response.', at: d(0, 8, 10), read: false, link: { name: 'tasks' } },
    { id: uid('nt'), orgId, userId: 'u_8', category: 'Deadlines', title: 'Action required today', body: 'Volunteer stipend verification is due today before complaint response.', at: d(0, 8, 15), read: false, link: { name: 'tasks' } },
    { id: uid('nt'), orgId, userId: 'u_4', category: 'System', title: 'Archive schedule', body: '12 records enter the destruction-review window next month.', at: d(-1, 9), read: true, link: { name: 'archive' } },
    { id: uid('nt'), orgId, userId: 'u_3', category: 'Correspondence', title: 'Invitation pending response', body: 'Lagos State Schools Board roundtable — response due in 3 days.', at: d(-4, 9, 30), read: true, link: { name: 'correspondence' } },
    { id: uid('nt'), orgId, userId: 'u_2', category: 'Meetings', title: 'Meeting tomorrow', body: 'Grant Due-Diligence War Room, 2:00 PM — Finance Conference Room.', at: d(0, 8, 20), read: false, link: { name: 'calendar' } },
    { id: uid('nt'), orgId, userId: 'u_1', category: 'Tasks', title: 'Delegated task completed', body: 'Briefing note on the housing proposal was completed by Hauwa Bello.', at: d(-3, 16, 10), read: true, link: { name: 'tasks' } },
  ];

  /* ── audit ── */
  const audit: AuditEntry[] = [];
  const A = (off: number, hr: number, userId: string, action: string, recordType: string, target: string, recordId?: string) => {
    const u = users.find((x) => x.id === userId)!;
    audit.push({ id: uid('au'), orgId, at: d(off, hr), userId, userName: u.name, action, recordType, target, recordId, result: 'success' });
  };
  A(0, 9, 'u_2', 'Registered incoming correspondence', 'correspondence', 'FIRS — Notice of annual tax clearance review', correspondence[17].id);
  A(0, 8, 'u_2', 'Uploaded scanned document', 'document', 'Scan — FMH Invitation (FMH/GEN/2026/118)', 'doc_invite_scan');
  A(0, 8, 'u_2', 'User signed in', 'session', 'Folake Adeyemi signed in', 'u_2');
  A(-1, 17, 'u_1', 'Delegated task', 'task', 'File MoU clean draft for signature → Chika Nwosu');
  A(-1, 15, 'u_2', 'Requested approval', 'approval', 'Q3 Compliance Return (Draft)', 'apr_3');
  A(-2, 16, 'u_2', 'Dispatched outgoing correspondence', 'correspondence', 'Confirmation of participation — National Housing Dialogue');
  A(-2, 12, 'u_8', 'Approved (step 1 of 3)', 'approval', 'Staff Handbook 2026 (Working Draft)', 'apr_1');
  A(-3, 16, 'u_5', 'Completed task', 'task', 'Prepare briefing note on housing proposal');
  A(-4, 17, 'u_10', 'Uploaded document', 'document', 'Outreach Report — Gwagwalada Mobile Clinic (Draft)');
  A(-5, 10, 'u_3', 'Requested changes (approval)', 'approval', 'MoU — Federal Ministry of Housing (Redline)', 'apr_4');
  A(-6, 10, 'u_7', 'Uploaded executed contract', 'document', 'Sunrise TV Partnership Agreement (Executed)');
  A(-6, 9, 'u_1', 'Approved (final step)', 'approval', 'Sunrise TV Partnership Agreement', 'apr_5');
  A(-7, 12, 'u_2', 'Circulated minutes', 'document', 'Minutes — Internal Alignment Meeting (Housing)');
  A(-8, 9, 'u_13', 'Requested approval', 'approval', 'Annual Report 2025 — Final Layout', 'apr_2');
  A(-12, 14, 'u_17', 'Dispatched award letter', 'correspondence', 'Letter of award — Meridian Supplies Ltd');
  A(-14, 17, 'u_6', 'Dispatched grant proposal', 'correspondence', 'Submission of grant renewal proposal');
  A(-18, 15, 'u_5', 'Uploaded new version (1.1)', 'document', 'Briefing Note — Housing Policy Dialogue');
  A(-24, 10, 'u_2', 'Registered invitation', 'correspondence', 'Invitation — National Housing Stakeholders Dialogue', c_housingInvite.id);
  A(-30, 14, 'u_6', 'Created meeting', 'meeting', 'Budget Defence — Grant Renewal');
  A(-40, 10, 'u_1', 'Created matter', 'matter', 'Teacher Recruitment Programme', 'm_teacher');

  /* ── comments ── */
  const comments: CommentItem[] = [
    { id: uid('cm'), orgId, targetType: 'correspondence', targetId: correspondence[2].id, userId: 'u_6', text: 'Legal review of annex C booked with Harbourview for tomorrow.', at: d(-2, 15) },
    { id: uid('cm'), orgId, targetType: 'correspondence', targetId: correspondence[5].id, userId: 'u_8', text: 'Payment records for Kano cohort located; verification ongoing.', at: d(-1, 11) },
    { id: uid('cm'), orgId, targetType: 'document', targetId: d_policy.id, userId: 'u_3', text: 'Please also align the remote-work clause with the board directive.', at: d(-2, 14) },
    { id: uid('cm'), orgId, targetType: 'matter', targetId: 'm_housing', userId: 'u_1', text: 'Keep the Ministry protocol office copied on all dispatches.', at: d(-6, 9) },
    { id: uid('cm'), orgId, targetType: 'document', targetId: documents.find((x) => x.title.includes('MoU Draft'))!.id, userId: 'u_3', text: 'Clause 4 must require mutual consent before any data exchange.', at: d(-5, 10, 5) },
    { id: uid('cm'), orgId, targetType: 'task', targetId: tasks[1].id, userId: 'u_6', text: 'Finance annex drafted; governance annex in progress.', at: d(-1, 12) },
    { id: uid('cm'), orgId, targetType: 'correspondence', targetId: c_housingInvite.id, userId: 'u_3', text: 'Accepted — delegation confirmed with protocol.', at: d(-20, 11) },
    { id: uid('cm'), orgId, targetType: 'matter', targetId: 'm_grant', userId: 'u_12', text: 'Audited statements attached from the records vault.', at: d(-3, 12) },
  ];

  /* security domain — seeded login history gives the security page life */
  const nowMs = Date.now();
  audit.unshift(
    { id: uid('au'), orgId, at: d(-1, 8, 45), userId: 'u_2', userName: 'Fatima Suleiman', action: 'User signed in', recordType: 'security', target: 'Chrome · Windows', result: 'success' },
    { id: uid('au'), orgId, at: d(-1, 7, 12), userId: 'unknown', userName: 'Unknown', action: 'Failed sign-in attempt (wrong password)', recordType: 'security', target: 'staff@cortexafoundation.demo', result: 'denied' },
    { id: uid('au'), orgId, at: d(-2, 17, 30), userId: 'u_1', userName: 'Adaeze Okafor', action: 'User signed in', recordType: 'security', target: 'Safari · macOS', result: 'success' },
  );

  return {
    version: SEED_VERSION,
    session: { userId: null, sessionId: null },
    orgs: [org],
    users,
    departments: depts,
    contacts,
    correspondence,
    documents,
    matters,
    meetings,
    tasks,
    approvals,
    emails,
    notifications,
    audit,
    comments,
    counters,
    pendingSignups: [],
    sessions: [
      { id: 'sess_seed_1', userId: 'u_2', createdAt: nowMs - 2 * 86400000, lastSeen: nowMs - 3600000, device: 'Chrome · Windows', ip: '105.112.34.18' },
      { id: 'sess_seed_2', userId: 'u_1', createdAt: nowMs - 86400000, lastSeen: nowMs - 7200000, device: 'Safari · macOS', ip: '105.112.34.18' },
      { id: 'sess_seed_3', userId: 'u_3', createdAt: nowMs - 5 * 86400000, lastSeen: nowMs - 4 * 86400000, device: deviceLabel(), ip: '41.184.22.7' },
    ],
    security: { loginAttempts: {}, otp: {}, lastCodeEcho: {} },

    /* ── finance & operations domain ── */
    budgets: mkBudgets(orgId),
    finance: mkFinance(orgId),
    vendors: mkVendors(orgId),
    invoices: mkInvoices(orgId),
    announcements: mkAnnouncements(orgId),
    assets: mkAssets(orgId),
  };
}

/* ── finance seed builders ───────────────────────────────────────────── */
const YEAR = new Date().getFullYear();

function mkBudgets(orgId: string): DB['budgets'] {
  const B = (id: string, departmentId: string | undefined, category: string, allocated: number): DB['budgets'][0] =>
    ({ id, orgId, year: YEAR, departmentId, category, allocated });
  return [
    B('bdg_1', 'dep_adm', 'Administration', 4500000),
    B('bdg_2', 'dep_prg', 'Programme Delivery', 12000000),
    B('bdg_3', 'dep_fin', 'Finance & Audit', 2500000),
    B('bdg_4', 'dep_com', 'Communications', 3000000),
    B('bdg_5', 'dep_hrs', 'Human Resources', 5000000),
    B('bdg_6', undefined, 'Travel & Logistics', 1800000),
    B('bdg_7', undefined, 'Equipment & ICT', 3200000),
  ];
}

function mkFinance(orgId: string): DB['finance'] {
  const yr = YEAR;
  const T = (id: string, kind: 'income' | 'expenditure', date: string, party: string, description: string, amount: number,
    category: string, status: DB['finance'][0]['status'], departmentId?: string, budgetId?: string, extra?: Partial<DB['finance'][0]>): DB['finance'][0] => ({
    id, orgId, ref: `${kind === 'income' ? 'INC' : 'EXP'}/${yr}/${id.split('_')[1]}`, kind, date, party, description, amount,
    currency: 'NGN', departmentId, category, budgetId, status, createdAt: d(-30), ...extra,
  });
  return [
    T('fin_1', 'income', dateOnly(-75), 'Ford Foundation', 'Programme grant — housing policy engagement', 25000000, 'Grant', 'Paid', 'dep_prg', 'bdg_2', { approvedById: 'u_1', paidById: 'u_6' }),
    T('fin_2', 'income', dateOnly(-40), 'Membership Dues', 'Annual membership renewal (12 members)', 1200000, 'Membership', 'Paid', 'dep_fin', 'bdg_3', { approvedById: 'u_6', paidById: 'u_6' }),
    T('fin_3', 'income', dateOnly(-12), 'Training Services', 'Records management workshop fees', 850000, 'Service income', 'Approved', 'dep_prg', undefined, { approvedById: 'u_6' }),
    T('fin_4', 'income', dateOnly(-3), 'UN Habitat Nigeria', 'Co-funding for national housing dialogue', 5000000, 'Project funding', 'Pending Approval', 'dep_prg', 'bdg_2', { requestedById: 'u_10' }),

    T('fin_5', 'expenditure', dateOnly(-60), 'Meridian Supplies Ltd', 'Office stationery & toner — Q1', 480000, 'Office Supplies', 'Paid', 'dep_adm', 'bdg_1', { approvedById: 'u_1', paidById: 'u_6', requestedById: 'u_15' }),
    T('fin_6', 'expenditure', dateOnly(-45), 'Printcraft Vendors', 'Annual report design & printing', 1450000, 'Communications', 'Paid', 'dep_com', 'bdg_4', { approvedById: 'u_1', paidById: 'u_6', requestedById: 'u_13' }),
    T('fin_7', 'expenditure', dateOnly(-25), 'Transcorp Hilton', 'National housing stakeholder meeting venue', 2200000, 'Events & Venues', 'Approved', 'dep_prg', 'bdg_2', { approvedById: 'u_1', requestedById: 'u_5' }),
    T('fin_8', 'expenditure', dateOnly(-18), 'Gwagwalada Logistics', 'Mobile clinic outreach transport', 620000, 'Travel & Logistics', 'Paid', 'dep_prg', 'bdg_6', { approvedById: 'u_3', paidById: 'u_6', requestedById: 'u_10' }),
    T('fin_9', 'expenditure', dateOnly(-10), 'TechHub Nigeria', 'Laptop procurement (2 units)', 1800000, 'Equipment & ICT', 'Pending Approval', 'dep_adm', 'bdg_7', { requestedById: 'u_18' }),
    T('fin_10', 'expenditure', dateOnly(-6), 'Staff Welfare', 'Team capacity-building workshop', 350000, 'Training', 'Submitted', 'dep_hrs', 'bdg_5', { requestedById: 'u_14' }),
    T('fin_11', 'expenditure', dateOnly(-2), 'Petty Cash Reimbursement', 'Courier & dispatch expenses', 85000, 'Office Supplies', 'Approved', 'dep_adm', 'bdg_1', { approvedById: 'u_2', requestedById: 'u_2' }),
  ];
}

function mkVendors(orgId: string): DB['vendors'] {
  const V = (id: string, name: string, category: string, contactPerson: string, email: string, phone: string, status: 'Active' | 'Inactive' = 'Active', notes?: string): DB['vendors'][0] =>
    ({ id, orgId, name, category, contactPerson, email, phone, address: 'Abuja, Nigeria', status, notes, createdAt: d(-120) });
  return [
    V('vnd_1', 'Meridian Supplies Ltd', 'Office Supplies', 'Chinedu Eze', 'sales@meridiansupplies.demo', '+234 803 555 0101', 'Active', 'Preferred stationery vendor — 5% bulk discount.'),
    V('vnd_2', 'Printcraft Vendors', 'Printing & Design', 'Amina Yusuf', 'hello@printcraft.demo', '+234 805 555 0102', 'Active', 'Handles annual report and branded collateral.'),
    V('vnd_3', 'TechHub Nigeria', 'ICT Equipment', 'Tunde Bakare', 'b2b@techhub.demo', '+234 809 555 0103', 'Active', 'Warranty partner for laptops and peripherals.'),
    V('vnd_4', 'Transcorp Hilton', 'Events & Venues', 'Events Desk', 'events@transcorphilton.demo', '+234 700 555 0104', 'Active', 'Conference facilities for stakeholder meetings.'),
    V('vnd_5', 'Gwagwalada Logistics', 'Transport & Logistics', 'Musa Ibrahim', 'ops@gwaglogistics.demo', '+234 806 555 0105', 'Active', 'Field transport for programme outreach.'),
    V('vnd_6', 'Lexis Counsel LLP', 'Legal Services', 'Barr. Ngozi Umeh', 'chambers@lexiscounsel.demo', '+234 802 555 0106', 'Inactive', 'Engaged on retainer for contract review (2025).'),
  ];
}

function mkInvoices(orgId: string): DB['invoices'] {
  const yr = YEAR;
  const I = (id: string, ref: string, vendorId: string, date: string, dueDate: string, amount: number, status: DB['invoices'][0]['status'], expenseId?: string): DB['invoices'][0] =>
    ({ id, orgId, ref, vendorId, date, dueDate, amount, currency: 'NGN', status, expenseId, createdAt: d(-20) });
  return [
    I('inv_1', `INV/${yr}/001`, 'vnd_1', dateOnly(-58), dateOnly(-28), 480000, 'Paid', 'fin_5'),
    I('inv_2', `INV/${yr}/002`, 'vnd_2', dateOnly(-44), dateOnly(-14), 1450000, 'Paid', 'fin_6'),
    I('inv_3', `INV/${yr}/003`, 'vnd_4', dateOnly(-24), dateOnly(6), 2200000, 'Approved', 'fin_7'),
    I('inv_4', `INV/${yr}/004`, 'vnd_3', dateOnly(-9), dateOnly(21), 1800000, 'Under Review', 'fin_9'),
    I('inv_5', `INV/${yr}/005`, 'vnd_5', dateOnly(-16), dateOnly(14), 620000, 'Disputed'),
  ];
}

function mkAnnouncements(orgId: string): DB['announcements'] {
  return [
    { id: 'ann_1', orgId, title: 'National Housing Stakeholders Meeting', body: 'All programme staff are invited to the stakeholder engagement at Transcorp Hilton. Please confirm attendance with the secretariat.', priority: 'Important', createdBy: 'u_1', createdAt: d(-5) },
    { id: 'ann_2', orgId, title: 'Quarterly Budget Review', body: 'Department heads should submit Q2 budget utilisation reports to Finance by the end of the week.', priority: 'Urgent', targetDepartmentId: 'dep_fin', createdBy: 'u_6', createdAt: d(-2), expiresAt: dateOnly(5) },
    { id: 'ann_3', orgId, title: 'Records Digitisation Drive', body: 'The records vault migration continues this month. Prioritise scanning of 2024 correspondence for the archive.', priority: 'Routine', createdBy: 'u_4', createdAt: d(-8), expiresAt: dateOnly(20) },
  ];
}

function mkAssets(orgId: string): DB['assets'] {
  const A = (id: string, assetCode: string, name: string, category: string, status: DB['assets'][0]['status'], cost: number, departmentId?: string, assignedToId?: string, location?: string): DB['assets'][0] =>
    ({ id, orgId, assetCode, name, category, status, cost, departmentId, assignedToId, location, serial: `SN-${id.split('_')[1].toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`, purchaseDate: dateOnly(-200), condition: 'Good', createdAt: d(-200) });
  return [
    A('ast_1', 'ICT/LAP/2026/001', 'Dell Latitude 7440', 'Computer', 'Assigned', 1150000, 'dep_adm', 'u_2', 'Admin Office'),
    A('ast_2', 'ICT/LAP/2026/002', 'HP EliteBook 840', 'Computer', 'Assigned', 980000, 'dep_prg', 'u_10', 'Programmes Room'),
    A('ast_3', 'ICT/PRJ/2026/001', 'Epson EB-X51 Projector', 'Presentation', 'Available', 420000, 'dep_com', undefined, 'Store Room B'),
    A('ast_4', 'ICT/CAM/2026/001', 'Canon EOS R50 Camera', 'Camera', 'Assigned', 890000, 'dep_com', 'u_13', 'Communications Studio'),
    A('ast_5', 'FUR/DSK/2026/010', 'Executive Desk Set', 'Furniture', 'Available', 350000, 'dep_adm', undefined, 'Store Room A'),
    A('ast_6', 'VEH/CAR/2026/001', 'Toyota Hilux (ABJ-234-CF)', 'Vehicle', 'Assigned', 28500000, 'dep_adm', 'u_15', 'Motor Pool'),
    A('ast_7', 'ICT/PRT/2026/002', 'HP LaserJet Pro MFP', 'Printer', 'Under Repair', 310000, 'dep_fin', undefined, 'Finance Office'),
    A('ast_8', 'ICT/PHN/2026/003', 'Samsung Galaxy A54', 'Phone', 'Retired', 285000, 'dep_hrs', undefined, 'Store Room A'),
  ];
}
