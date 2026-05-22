/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Matter from 'matter-js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Plus, 
  Layers, 
  Zap, 
  Play, 
  Settings, 
  Monitor, 
  Grid, 
  Trash2, 
  ChevronRight,
  MousePointer2,
  Box,
  Palette,
  Maximize,
  Undo2,
  Save,
  FolderOpen,
  MousePointer,
  Square,
  Activity,
  FileCode,
  Layout,
  Columns,
  Eye,
  EyeOff,
  Keyboard,
  Mouse,
  User as UserIcon,
  LogOut,
  Image as ImageIcon,
  Upload,
  Cloud,
  Type,
  FileArchive,
  Database,
  Search,
  Copy,
  Hash,
  Download,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  Home,
  FileText,
  Clock,
  MoreVertical,
  X,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Folder,
  Split,
  RotateCcw,
  Maximize2,
  Grid2X2,
} from 'lucide-react';
import { GameObject, GameEvent, GameProject, ObjectType, ConditionType, ActionType, GameFrame, GameCondition, GameAction, ProjectExtension, ProgrammingLanguage, ProjectLibraryAsset, ProjectAssetKind, ProjectAssetEditorState, CustomShapeDefinition, CustomShapePoint } from './types/game.ts';
import { encodeToWavBase64, generateSamples, SYNTH_PRESETS, type SynthParams } from './utils/retroSynth.ts';
import { TEMPLATES_SHOWCASE } from './data/templates.ts';
import { MessageSquare, Bot, Sparkles, Package, Unlock } from 'lucide-react';

// Add Local Project Interface
interface ProjectMeta {
  id: string;
  name: string;
  fileName: string;
  updatedAt: string;
  format?: 'zip' | 'json';
}

type LocalLibraryAsset = {
  id: string;
  name: string;
  type: ProjectAssetKind;
  src: string;
  previewClassName?: string;
  iconSrc?: string;
};

const BUILTIN_LIBRARY: Record<'images' | 'sounds', LocalLibraryAsset[]> = {
  images: [
    { id: 'banana', name: 'Banana', type: 'image', src: '/Assets/images/banana.png' },
    { id: 'orange', name: 'Orange', type: 'image', src: '/Assets/images/orange.png' },
    { id: 'apple', name: 'Apple', type: 'image', src: '/Assets/images/apple.png' }
  ],
  sounds: [
    { id: 'spring', name: 'Spring', type: 'sound', src: '/Assets/sounds/spring.mp3' },
    { id: 'police-siren', name: 'Police Siren', type: 'sound', src: '/Assets/sounds/police_siren.mp3' },
    { id: 'eating-crock', name: 'Eating Crock', type: 'sound', src: '/Assets/sounds/eating_crock.mp3' }
  ]
};

const CODE_EXTENSION_CARDS = [
  {
    id: 'javascript',
    title: 'Program with JavaScript',
    subtitle: 'Scripts, runtime hooks and object logic',
    icon: '/Assets/images/javascript.png',
    language: 'javascript' as const,
    accent: 'bg-slate-900 text-white',
    description: 'Create code extensions that can be saved inside the project and executed by the engine runtime.'
  },
  {
    id: 'python',
    title: 'Add Code with Python',
    subtitle: 'Import tools, logic and portable project scripts',
    icon: '/Assets/images/python.png',
    language: 'python' as const,
    accent: 'bg-amber-500 text-black',
    description: 'Write and store Python extensions for complex projects and export workflows.'
  }
] as const;

const SCRATCH_EXTENSION_CARD = {
  id: 'scratch',
  title: 'Scratch Event Mode',
  subtitle: 'Blocks, loops and conditions',
  icon: '/Assets/images/scratch-logo.png',
  accent: 'bg-white text-slate-900',
  description: 'Switch the Event Editor to a Scratch-inspired block workspace while keeping the rest of ABCstudio original.'
} as const;

type ShapeOption = {
  id: string;
  name: string;
  clipPath: string;
  borderRadius?: string;
};

const BASE_SHAPES: ShapeOption[] = [
  { id: 'square', name: 'Square', clipPath: 'inset(0% 0% 0% 0%)' },
  { id: 'rectangle', name: 'Rectangle', clipPath: 'inset(0% 0% 0% 0%)' },
  { id: 'rounded-square', name: 'Rounded Square', clipPath: 'inset(0% 0% 0% 0%)', borderRadius: '24%' },
  { id: 'circle', name: 'Circle', clipPath: 'circle(50% at 50% 50%)' },
  { id: 'oval', name: 'Oval', clipPath: 'ellipse(50% 42% at 50% 50%)' },
  { id: 'triangle-up', name: 'Triangle Up', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { id: 'triangle-down', name: 'Triangle Down', clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' },
  { id: 'triangle-left', name: 'Triangle Left', clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)' },
  { id: 'triangle-right', name: 'Triangle Right', clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)' },
  { id: 'diamond', name: 'Diamond', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { id: 'rhombus', name: 'Rhomboid', clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' },
  { id: 'pentagon', name: 'Pentagon', clipPath: 'polygon(50% 0%, 95% 35%, 78% 100%, 22% 100%, 5% 35%)' },
  { id: 'hexagon', name: 'Hexagon', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  { id: 'octagon', name: 'Octagon', clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' },
  { id: 'star-5', name: 'Star', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { id: 'star-6', name: 'Star 6', clipPath: 'polygon(50% 0%, 61% 28%, 93% 25%, 72% 50%, 93% 75%, 61% 72%, 50% 100%, 39% 72%, 7% 75%, 28% 50%, 7% 25%, 39% 28%)' },
  { id: 'star-8', name: 'Star 8', clipPath: 'polygon(50% 0%, 61% 20%, 82% 0%, 80% 28%, 100% 50%, 80% 72%, 82% 100%, 61% 80%, 50% 100%, 39% 80%, 18% 100%, 20% 72%, 0% 50%, 20% 28%, 18% 0%, 39% 20%)' },
  { id: 'heart', name: 'Heart', clipPath: 'polygon(50% 88%, 10% 45%, 20% 15%, 50% 30%, 80% 15%, 90% 45%)' },
  { id: 'teardrop', name: 'Teardrop', clipPath: 'path("M50 0 C75 0 100 30 100 58 C100 83 78 100 50 100 C22 100 0 83 0 58 C0 30 25 0 50 0 Z")' },
  { id: 'pill', name: 'Pill', clipPath: 'inset(0% 0% 0% 0% round 999px)' },
  { id: 'capsule', name: 'Capsule', clipPath: 'inset(0% 0% 0% 0% round 48%)' }
];

const SHAPE_LIBRARY: ShapeOption[] = [
  ...BASE_SHAPES,
  ...BASE_SHAPES.flatMap(shape => [
    { ...shape, id: `${shape.id}-soft`, name: `${shape.name} Soft` },
    { ...shape, id: `${shape.id}-bold`, name: `${shape.name} Bold` }
  ]).slice(0, 50 - BASE_SHAPES.length)
];

const getShapeClipPath = (shapeId?: string) => SHAPE_LIBRARY.find(shape => shape.id === shapeId)?.clipPath;

const SHAPE_LIBRARY_SECTIONS: { title: string; description: string; ids: string[] }[] = [
  {
    title: 'Essentials',
    description: 'Core building blocks for clean gameplay UI.',
    ids: ['square', 'rounded-square', 'rectangle', 'circle', 'oval', 'pill', 'capsule']
  },
  {
    title: 'Geometry',
    description: 'Sharp shapes, angular forms, and strong silhouettes.',
    ids: ['triangle-up', 'triangle-down', 'triangle-left', 'triangle-right', 'diamond', 'rhombus', 'pentagon', 'hexagon', 'octagon']
  },
  {
    title: 'Emblems',
    description: 'Useful for special objects, pickups, and callouts.',
    ids: ['star-5', 'star-6', 'star-8', 'heart', 'teardrop']
  }
];

const getAssetKindFromFile = (file: File): ProjectAssetKind => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'sound';
  if (['glb', 'gltf', 'obj', 'fbx', 'stl', 'dae', '3ds', 'blend'].includes(ext)) {
    throw new Error('Unsupported asset type.');
  }
  return 'image';
};

const getAssetPreviewLabel = (kind: ProjectAssetKind) => {
  switch (kind) {
    case 'sound':
      return 'SND';
    default:
      return 'IMG';
  }
};

const EXTENSION_PRESETS: { id: string; name: string; language: ProgrammingLanguage; code: string }[] = [
  {
    id: 'js-starter',
    name: 'JavaScript Extension',
    language: 'javascript',
    code: `function onStart(runtime) {\n  console.log('JavaScript extension loaded', runtime);\n}\n\nfunction onFrame(runtime) {\n  // Runs every frame if you need it.\n}`
  },
  {
    id: 'py-starter',
    name: 'Python Extension',
    language: 'python',
    code: `def on_start(runtime):\n    print('Python extension loaded', runtime)`
  }
];

// Firebase initialization
const firebaseConfigFromEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId
};

const app = initializeApp(firebaseConfigFromEnv);
export const db = getFirestore(app, firebaseConfigFromEnv.firestoreDatabaseId);
export const auth = getAuth();

// Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Initial dummy project
const INITIAL_PROJECT: GameProject = {
  id: 'project-1',
  name: 'ABCstudio Demo',
  frames: [
    {
      id: 'frame-1',
      name: 'Lesson 1: Movements',
      objects: [
        {
          id: 'obj-1',
          name: 'Player',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          rotation: 0,
          color: '#3b82f6',
          type: 'active',
          opacity: 1,
          zIndex: 1,
          alterableValues: [],
          isVisible: true,
          movement: { type: 'eight_directions', speed: 8, acceleration: 1, deceleration: 1 }
        },
        {
          id: 'obj-2',
          name: 'Bouncer',
          x: 400,
          y: 300,
          width: 30,
          height: 30,
          rotation: 0,
          color: '#ef4444',
          type: 'active',
          opacity: 1,
          zIndex: 2,
          alterableValues: [],
          isVisible: true,
          movement: { type: 'bouncing_ball', speed: 12, acceleration: 1, deceleration: 1 }
        },
        {
          id: 'obj-3',
          name: 'Physics Box',
          x: 150,
          y: 150,
          width: 50,
          height: 50,
          rotation: 0,
          color: '#10b981',
          type: 'active',
          opacity: 1,
          zIndex: 3,
          alterableValues: [],
          isVisible: true,
          movement: { 
            type: 'static', 
            speed: 0, 
            acceleration: 0, 
            deceleration: 0,
            physics: {
              enabled: true,
              bodyType: 'rectangle',
              isStatic: false,
              density: 0.001,
              friction: 0.1,
              restitution: 0,
              frictionAir: 0.01
            }
          }
        }
      ],
      events: [
        {
          id: 'event-1',
          name: 'Collision Check',
          conditions: [
            { type: 'collision', targetId: 'obj-1', params: { targetId2: 'obj-2' } }
          ],
          actions: [
            { id: 'act-1', type: 'change_color', targetId: 'obj-1', params: { color: '#fbbf24' } },
            { id: 'act-2', type: 'play_sound', targetId: 'obj-1', params: { valueName: 'https://www.soundjay.com/buttons/sounds/button-1.mp3' } }
          ],
          enabled: true
        }
      ],
      backgroundColor: '#f8fafc',
      width: 800,
      height: 600
    }
  ],
  currentFrameIndex: 0,
  globalEvents: [],
  globalValues: [{ id: 'gv1', name: 'Lives', value: 3 }],
  extensions: [],
  libraryAssets: [],
  customShapes: [],
  settings: {
    width: 800,
    height: 600,
    windowTitle: 'ABCstudio Runtime',
    fps: 60
  }
};

type Tab = 'stage' | 'events' | 'library' | 'play' | 'storyboard' | 'grid' | 'assets' | 'home';

const getShapeStyle = (shapeType?: string, customShape?: CustomShapeDefinition | null): React.CSSProperties => {
  if (customShape?.points?.length) {
    if (hasCurvedCustomShape(customShape)) {
      const pathData = buildCurvedCustomShapePath(customShape.points);
      return { clipPath: `path("${pathData}")` as React.CSSProperties['clipPath'] };
    }
    const clipPath = `polygon(${customShape.points.map(point => `${point.x}% ${point.y}%`).join(', ')})`;
    return { clipPath: clipPath as React.CSSProperties['clipPath'] };
  }

  const shapeId = normalizeShapeId(shapeType);
  const clipPath = SHAPE_LIBRARY.find(shape => shape.id === shapeId)?.clipPath;
  if (!clipPath) return {};
  return { clipPath: clipPath as React.CSSProperties['clipPath'] };
};

export default function App() {
  const makeUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const getNextAvailableName = (prefix: string, existingNames: string[]) => {
    const taken = new Set(existingNames.map(name => name.trim().toLowerCase()));
    let index = 1;
    while (taken.has(`${prefix}${index}`.toLowerCase())) index += 1;
    return `${prefix}${index}`;
  };

  const createInitialProject = (uniqueIds = false): GameProject => ({
    id: uniqueIds ? makeUniqueId('p') : 'project-1',
    name: 'Project Unnamed 1',
    frames: [
      {
        id: uniqueIds ? makeUniqueId('frame') : 'frame-1',
        name: 'Back Unnamed 1',
        objects: [],
        events: [],
        backgroundColor: '#f8fafc',
        width: 800,
        height: 600
      }
    ],
    currentFrameIndex: 0,
    globalEvents: [],
    globalValues: [{ id: 'gv1', name: 'Score', value: 0 }],
    extensions: [],
    libraryAssets: [],
    customShapes: [],
    settings: {
      width: 800,
      height: 600,
      windowTitle: 'ABCstudio Game',
      fps: 60
    }
  });

  const [project, setProject] = useState<GameProject>(() => createInitialProject(false));
  const [history, setHistory] = useState<{ past: GameProject[], future: GameProject[] }>({ past: [], future: [] });
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activePropTab, setActivePropTab] = useState<number>(0);
  
  const [localProjects, setLocalProjects] = useState<ProjectMeta[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const [isProjectPersisted, setIsProjectPersisted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; kind: 'project' | 'frame' } | null>(null);
  const [deletedProjectBackup, setDeletedProjectBackup] = useState<{
    id: string;
    name: string;
    project: GameProject;
    assets: any[];
  } | null>(null);
  const workspaceInitializedRef = useRef(false);

  const getSelectedObjects = () => currentFrame.objects.filter(o => selectedObjectIds.includes(o.id));
  
  const getMixedValue = <T extends keyof GameObject>(field: T): any => {
    const objs = getSelectedObjects();
    if (objs.length === 0) return undefined;
    const first = objs[0][field];
    const isMixed = !objs.every(o => JSON.stringify(o[field]) === JSON.stringify(first));
    return isMixed ? 'mixed' : first;
  };
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const selectedObjectId = selectedObjectIds.length === 1 ? selectedObjectIds[0] : null;
  const setSelectedObjectId = (id: string | null) => {
    setSelectedObjectIds(id ? [id] : []);
  };
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panInitialOffset, setPanInitialOffset] = useState({ x: 0, y: 0 });
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [frameClipboard, setFrameClipboard] = useState<GameFrame | null>(null);
  const [objectClipboard, setObjectClipboard] = useState<GameObject | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [zipProcessing, setZipProcessing] = useState<{ active: boolean, type: 'import' | 'export' | 'save' | null }>({ active: false, type: null });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [userAssets, setUserAssets] = useState<any[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<ProjectLibraryAsset[]>([]);
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
  const [selectedLibraryAssetId, setSelectedLibraryAssetId] = useState<string | null>(null);
  const [assetInspectorTab, setAssetInspectorTab] = useState<'extension' | 'image' | 'sound'>('extension');

  // Retro Sound FX Synthesizer states
  const [showRetroSynthModal, setShowRetroSynthModal] = useState(false);
  const [retroSynthWaveType, setRetroSynthWaveType] = useState<'square' | 'sine' | 'triangle' | 'sawtooth' | 'noise'>('square');
  const [retroSynthBaseFreq, setRetroSynthBaseFreq] = useState<number>(440);
  const [retroSynthFreqLimit, setRetroSynthFreqLimit] = useState<number>(440);
  const [retroSynthPitchSlide, setRetroSynthPitchSlide] = useState<number>(0);
  const [retroSynthAttack, setRetroSynthAttack] = useState<number>(0.02);
  const [retroSynthSustain, setRetroSynthSustain] = useState<number>(0.1);
  const [retroSynthDecay, setRetroSynthDecay] = useState<number>(0.15);
  const [retroSynthSustainVol, setRetroSynthSustainVol] = useState<number>(0.4);
  const [retroSynthVibratoDepth, setRetroSynthVibratoDepth] = useState<number>(0);
  const [retroSynthVibratoSpeed, setRetroSynthVibratoSpeed] = useState<number>(0);
  const [retroSynthLpfCutoff, setRetroSynthLpfCutoff] = useState<number>(20000);
  const [retroSoundName, setRetroSoundName] = useState('retro_laser');

  // Hub and Showcase states
  const [hubTab, setHubTab] = useState<'projects' | 'templates'>('projects');

  // Custom project creation modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [createProjectNameInput, setCreateProjectNameInput] = useState('');
  const [createProjectWidth, setCreateProjectWidth] = useState(800);
  const [createProjectHeight, setCreateProjectHeight] = useState(600);
  const [createProjectFps, setCreateProjectFps] = useState(60);
  const [createProjectTemplateId, setCreateProjectTemplateId] = useState<'empty' | 'physics-balls' | 'retro-clicker'>('empty');

  const PROJECT_NAME_PREFIXES = ['Galaxy', 'Gravity', 'Delta', 'Cyber', 'Neon', 'Aether', 'Quantum', 'Voxel', 'Bouncy', 'Retro', 'Mega', 'Hyper', 'Sonic', 'Cosmic', 'Astro', 'Pixel', 'Vector', 'Omega'];
  const PROJECT_NAME_SUFFIXES = ['Sandbox', 'Blaster', 'Climber', 'Chaser', 'Jump', 'Simulation', 'Odyssey', 'Engine', 'Cruiser', 'Quest', 'Frenzy', 'Dash', 'Cascade', 'Arena', 'Arcade', 'Breaker', 'Orbit'];

  const generateRandomProjectName = () => {
    const pre = PROJECT_NAME_PREFIXES[Math.floor(Math.random() * PROJECT_NAME_PREFIXES.length)];
    const suf = PROJECT_NAME_SUFFIXES[Math.floor(Math.random() * PROJECT_NAME_SUFFIXES.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    return `${pre} ${suf} ${num}`;
  };

  // Copilot Chat Assistant states
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<{ sender: 'user' | 'assistant', text: string }[]>(() => [
    { sender: 'assistant', text: 'Hey there! I am your ABCstudio AI Copilot. I can help you write clean runtime extensions, answer questions about game events, configure Matter-js physical bodies, or build logic actions. Try typing: "Write an onFrame event loop to rotate objects with an active movement"!' }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [shapePickerMode, setShapePickerMode] = useState<'library' | 'custom'>('library');
  const [shapePickerTargetId, setShapePickerTargetId] = useState<string | null>(null);
  const [customShapeDraft, setCustomShapeDraft] = useState<{
    name: string;
    points: CustomShapePoint[];
    fill: string;
    libraryId?: string;
  } | null>(null);
  const [shapeBuilderSearch, setShapeBuilderSearch] = useState('');
  const [shapeBuilderTool, setShapeBuilderTool] = useState<'select' | 'reshape' | 'add' | 'delete' | 'transform'>('reshape');
  const [selectedShapePointIndices, setSelectedShapePointIndices] = useState<number[]>([]);
  const [editorSnapToGrid, setEditorSnapToGrid] = useState(true);
  const [editorGridSize, setEditorGridSize] = useState(5);
  const [editorSymmetryX, setEditorSymmetryX] = useState(false);
  const [editorSymmetryY, setEditorSymmetryY] = useState(false);
  const [editorShowGrid, setEditorShowGrid] = useState(true);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [boxSelectEnd, setBoxSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const shapePreviewRef = useRef<HTMLDivElement | null>(null);
  const [draggingShapePointIndex, setDraggingShapePointIndex] = useState<number | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [initialDragPoints, setInitialDragPoints] = useState<CustomShapePoint[]>([]);
  const [draggingShapeHandle, setDraggingShapeHandle] = useState<{ pointIndex: number; handle: 'in' | 'out' } | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'condition' | 'action' | 'action_else' | 'settings' | null;
    eventId: string | null;
    targetId: string | null;
  }>({ type: null, eventId: null, targetId: null });
  const [settings, setSettings] = useState({
    theme: 'light' as 'light' | 'dark',
    autoSaveInterval: 60, 
    autoSaveEnabled: true
  });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'object' | 'frame' | 'globalValue' | 'variable' | 'canvas' | 'sidebar' | 'event' | 'project', data: any } | null>(null);
  const [renameModal, setRenameModal] = useState<{
    id: string;
    type: 'project' | 'object' | 'frame';
    name: string;
    isOpen: boolean;
  }>({ id: '', type: 'project', name: '', isOpen: false });

  const handleContextMenu = (e: React.MouseEvent, type: 'object' | 'frame' | 'globalValue' | 'variable' | 'canvas' | 'sidebar' | 'event', data: any = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, data });
  };

  // Auto-save effect
  useEffect(() => {
    if (!settings.autoSaveEnabled) return;
    if (!isProjectPersisted) return;
    
    const interval = setInterval(() => {
      saveToLocal(project, true);
    }, settings.autoSaveInterval * 1000);
    
    return () => clearInterval(interval);
  }, [settings.autoSaveInterval, settings.autoSaveEnabled, project, isProjectPersisted]);

  useEffect(() => {
    if (workspaceInitializedRef.current || loadingProjects || !projectsHydrated) return;
    if (localProjects.length === 0) {
      startFreshProject();
      setIsProjectPersisted(false);
      workspaceInitializedRef.current = true;
      return;
    }

    void loadLocalProject(localProjects[0].id);
    setIsProjectPersisted(true);
    workspaceInitializedRef.current = true;
  }, [localProjects, loadingProjects, projectsHydrated]);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input/textarea/select/contenteditable
      const target = e.target as HTMLElement;
      if (
        target && 
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 's') {
          e.preventDefault();
          saveToLocal();
        }
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
        if (e.key === 'd' && selectedObjectId) {
          e.preventDefault();
          duplicateObject(selectedObjectId);
        }
      } else {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId) {
          e.preventDefault();
          deleteObject(selectedObjectId);
        }
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, history, currentUser, settings]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync user profile
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString()
          });
        } else {
          await setDoc(userRef, {
            displayName: user.displayName,
            photoURL: user.photoURL,
          }, { merge: true });
        }
        
        loadUserAssets(user.uid);
      } else {
        setUserAssets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      handleFirestoreError(error, OperationType.GET, 'auth');
      setSaveMessage("Sign-in failed. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      startFreshProject();
      setUserAssets([]);
      setActiveTab('home');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Local Storage API
  const fetchLocalProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setLocalProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoadingProjects(false);
      setProjectsHydrated(true);
    }
  };

  const loadLocalProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeGameProject((data.project ?? data) as GameProject);
        setProject(normalized);
        setLibraryAssets(Array.isArray(normalized.libraryAssets) ? normalized.libraryAssets : []);
        setUserAssets(Array.isArray(data.assets) ? data.assets : []);
        setActiveTab('stage');
        setHistory({ past: [], future: [] });
        setIsProjectPersisted(true);
      } else {
        alert("Project not found on server.");
      }
    } catch (error) {
      alert("Failed to load project");
    }
  };

  const startFreshProject = () => {
    const newProj = createInitialProject(false);
    setProject(newProj);
    setLibraryAssets([]);
    setUserAssets([]);
    setIsProjectPersisted(false);
    return newProj;
  };

  const createNewProject = () => {
    const newProj = createInitialProject(true);
    setProject(newProj);
    setLibraryAssets([]);
    setUserAssets([]);
    setIsProjectPersisted(false);
    return newProj;
  };

  const createNewProjectCustom = (name: string, width: number, height: number, fps: number, template: 'empty' | 'physics-balls' | 'retro-clicker') => {
    const baseProj = createInitialProject(true);
    let frames = baseProj.frames.map(frame => ({
      ...frame,
      width: width || 800,
      height: height || 600,
      objects: [] as GameObject[],
      events: [] as GameEvent[]
    }));

    let globalValues = [{ id: 'gv1', name: 'Score', value: 0 }];

    if (template === 'physics-balls') {
      globalValues = [{ id: 'gv-bounces', name: 'Bounces Counter', value: 0 }];
      frames = [
        {
          id: makeUniqueId('frame'),
          name: 'Sandbox Arena',
          backgroundColor: '#111827',
          width: width || 800,
          height: height || 600,
          objects: [
            {
              id: 'obj-floor',
              name: 'Solid Floor',
              x: (width || 800) / 2,
              y: (height || 600) - 20,
              width: (width || 800) - 40,
              height: 30,
              rotation: 0,
              color: '#374151',
              type: 'backdrop',
              opacity: 1,
              zIndex: 1,
              isVisible: true,
              alterableValues: [],
              movement: {
                type: 'static',
                speed: 0,
                acceleration: 0,
                deceleration: 0,
                physics: {
                  enabled: true,
                  bodyType: 'rectangle',
                  isStatic: true,
                  density: 1,
                  friction: 0.1,
                  restitution: 0.8,
                  frictionAir: 0.01,
                  preset: 'static'
                }
              }
            },
            {
              id: 'obj-ball-1',
              name: 'Elastic Ball',
              x: (width || 800) / 2,
              y: 100,
              width: 50,
              height: 50,
              rotation: 0,
              color: '#10b981',
              type: 'active',
              opacity: 1,
              zIndex: 2,
              isVisible: true,
              shapeType: 'circle',
              alterableValues: [],
              movement: {
                type: 'bouncing_ball',
                speed: 0,
                acceleration: 0,
                deceleration: 0,
                physics: {
                  enabled: true,
                  bodyType: 'circle',
                  isStatic: false,
                  density: 1.5,
                  friction: 0.05,
                  restitution: 0.9,
                  frictionAir: 0.005,
                  preset: 'bouncy'
                }
              }
            }
          ],
          events: []
        }
      ];
    } else if (template === 'retro-clicker') {
      frames = [
        {
          id: makeUniqueId('frame'),
          name: 'Clicker Stage',
          backgroundColor: '#0f172a',
          width: width || 800,
          height: height || 600,
          objects: [
            {
              id: 'obj-target',
              name: 'Target Button',
              x: (width || 800) / 2,
              y: (height || 600) / 2,
              width: 120,
              height: 120,
              rotation: 0,
              color: '#6366f1',
              type: 'active',
              opacity: 1,
              zIndex: 1,
              isVisible: true,
              shapeType: 'hexagon',
              alterableValues: [],
              movement: {
                type: 'static',
                speed: 0,
                acceleration: 0,
                deceleration: 0,
                physics: {
                  enabled: false,
                  bodyType: 'rectangle',
                  isStatic: true,
                  density: 1,
                  friction: 0.1,
                  restitution: 0,
                  frictionAir: 0.01,
                  preset: 'static'
                }
              }
            }
          ],
          events: [
            {
              id: 'ev-click',
              name: 'Click on Target',
              enabled: true,
              conditions: [
                {
                  type: 'mouse_click',
                  targetId: 'obj-target',
                  params: {}
                }
              ],
              actions: [
                {
                  id: 'act-add-score',
                  type: 'add_global_value',
                  targetId: 'gv1',
                  params: { valueName: 'Score', value: 1 }
                },
                {
                  id: 'act-sfx',
                  type: 'play_sound',
                  targetId: 'obj-target',
                  params: { valueName: 'https://www.soundjay.com/buttons/sounds/button-1.mp3' }
                }
              ]
            }
          ]
        }
      ];
    }

    const newProj: GameProject = {
      id: makeUniqueId('p'),
      name: name.trim() || 'My Crafted Engine',
      settings: {
        width: width || 800,
        height: height || 600,
        fps: fps || 60,
        windowTitle: name.trim() || 'ABCstudio Game'
      },
      currentFrameIndex: 0,
      globalEvents: [],
      globalValues,
      extensions: [],
      libraryAssets: [],
      customShapes: [],
      frames
    };

    setProject(newProj);
    setLibraryAssets([]);
    setUserAssets([]);
    setIsProjectPersisted(false);
    return newProj;
  };

  const triggerNewProjectFlow = () => {
    setCreateProjectNameInput(generateRandomProjectName());
    setCreateProjectWidth(800);
    setCreateProjectHeight(600);
    setCreateProjectFps(60);
    setCreateProjectTemplateId('empty');
    setShowCreateProjectModal(true);
  };

  const normalizeGameProject = (input: GameProject): GameProject => {
    const normalizeObject = (obj: any, index: number): GameObject => {
      const legacyPhysics = obj.physics;
      const movement = {
        type: obj.movement?.type || 'static',
        speed: obj.movement?.speed ?? 0,
        acceleration: obj.movement?.acceleration ?? 0,
        deceleration: obj.movement?.deceleration ?? 0,
        bounceIntensity: obj.movement?.bounceIntensity,
        gravity: obj.movement?.gravity,
        jumpStrength: obj.movement?.jumpStrength,
        physics: obj.movement?.physics || legacyPhysics ? {
          enabled: obj.movement?.physics?.enabled ?? legacyPhysics?.enabled ?? false,
          bodyType: obj.movement?.physics?.bodyType ?? legacyPhysics?.bodyType ?? 'rectangle',
          isStatic: obj.movement?.physics?.isStatic ?? legacyPhysics?.isStatic ?? false,
          density: obj.movement?.physics?.density ?? legacyPhysics?.density ?? 0.001,
          friction: obj.movement?.physics?.friction ?? legacyPhysics?.friction ?? 0.1,
          restitution: obj.movement?.physics?.restitution ?? legacyPhysics?.restitution ?? 0.15,
          frictionAir: obj.movement?.physics?.frictionAir ?? legacyPhysics?.frictionAir ?? 0.01,
          angularVelocity: obj.movement?.physics?.angularVelocity ?? legacyPhysics?.angularVelocity,
          force: obj.movement?.physics?.force ?? legacyPhysics?.force
        } : undefined
      };

      const { physics: _legacyPhysics, ...restMovement } = obj.movement || {};
      const { physics: _topLevelPhysics, type: _legacyType, ...rest } = obj;

      return {
        ...rest,
        name: String(rest.name || '').trim() || `Item_${index + 1}`,
        type: obj.type === 'physics' ? 'active' : obj.type,
        movement: { ...restMovement, ...movement }
      } as GameObject;
    };

    const normalizeFrame = (frame: any, index: number): GameFrame => ({
      ...frame,
      name: String(frame.name || '').trim() || `Back Unnamed ${index + 1}`,
      objects: Array.isArray(frame.objects) ? frame.objects.map((obj: any, objIndex: number) => normalizeObject(obj, objIndex)) : [],
      events: Array.isArray(frame.events) ? frame.events : [],
      backgroundColor: frame.backgroundColor || '#f8fafc',
      width: frame.width || input.settings?.width || 800,
      height: frame.height || input.settings?.height || 600
    });

    const fallbackFrame: GameFrame = {
      id: 'frame-1',
      name: 'Back Unnamed 1',
      objects: [],
      events: [],
      backgroundColor: '#f8fafc',
      width: input.settings?.width || 800,
      height: input.settings?.height || 600
    };

    const normalizedFrames = (Array.isArray(input.frames) && input.frames.length > 0
      ? input.frames
      : [fallbackFrame]
    ).map((frame, index) => normalizeFrame(frame, index));

    return {
      ...input,
      name: String(input.name || '').trim() || 'Project Unnamed 1',
      frames: normalizedFrames,
      extensions: Array.isArray(input.extensions)
        ? input.extensions.map((ext: any, index: number) => ({
          id: ext.id || `ext-${index}`,
          name: String(ext.name || '').trim() || `Extension ${index + 1}`,
          language: ext.language === 'python' ? 'python' : 'javascript',
          enabled: ext.enabled ?? true,
          code: String(ext.code ?? ''),
          kind: ext.kind === 'scratch' ? 'scratch' : 'code',
          sourceFileName: ext.sourceFileName
        }))
        : [],
      libraryAssets: Array.isArray(input.libraryAssets) ? input.libraryAssets : [],
      customShapes: Array.isArray(input.customShapes)
        ? input.customShapes.map((shape, index) => ({
          id: shape.id || `custom-shape-${index}`,
          name: shape.name || 'Custom Shape',
          kind: 'polygon' as const,
          fill: shape.fill,
          createdAt: shape.createdAt || new Date().toISOString(),
          points: Array.isArray(shape.points)
            ? shape.points.map(point => ({
              x: clampPercent(point.x),
              y: clampPercent(point.y),
              curve: point.curve,
              handleIn: point.handleIn ? { x: clampPercent(point.handleIn.x), y: clampPercent(point.handleIn.y) } : undefined,
              handleOut: point.handleOut ? { x: clampPercent(point.handleOut.x), y: clampPercent(point.handleOut.y) } : undefined
            }))
            : []
        }))
        : [],
      currentFrameIndex: Math.max(0, Math.min(input.currentFrameIndex || 0, normalizedFrames.length - 1))
    };
  };

  const PHYSICS_PRESETS = {
    static: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 1, restitution: 0, frictionAir: 0.02 },
    rigid: { bodyType: 'rectangle', isStatic: false, density: 0.005, friction: 0.8, restitution: 0.05, frictionAir: 0.01 },
    bouncy: { bodyType: 'circle', isStatic: false, density: 0.001, friction: 0.05, restitution: 0.85, frictionAir: 0.005 },
    slippery: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.01, restitution: 0.08, frictionAir: 0.001 },
    heavy: { bodyType: 'rectangle', isStatic: false, density: 0.02, friction: 0.5, restitution: 0.02, frictionAir: 0.02 },
    ice: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.001, restitution: 0.01, frictionAir: 0.0005 },
    ghost: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0, restitution: 0, frictionAir: 0, isSensor: true },
    trampoline: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 0.2, restitution: 1.1, frictionAir: 0 },
    pinball: { bodyType: 'circle', isStatic: false, density: 0.002, friction: 0.02, restitution: 0.95, frictionAir: 0.002 },
    floaty: { bodyType: 'circle', isStatic: false, density: 0.0005, friction: 0.03, restitution: 0.25, frictionAir: 0.08 }
  } as const;

  const applyPhysicsPreset = (movement: GameObject['movement'], preset: NonNullable<GameObject['movement']['physics']>['preset']): GameObject['movement'] => {
    if (!preset || preset === 'custom') {
      return {
        ...movement,
        physics: {
          enabled: true,
          preset: 'custom',
          bodyType: movement.physics?.bodyType || 'rectangle',
          isStatic: movement.physics?.isStatic ?? false,
          density: movement.physics?.density ?? 0.001,
          friction: movement.physics?.friction ?? 0.1,
          restitution: movement.physics?.restitution ?? 0.15,
          frictionAir: movement.physics?.frictionAir ?? 0.01,
          angularVelocity: movement.physics?.angularVelocity,
          force: movement.physics?.force
        }
      };
    }

    const presetConfig = PHYSICS_PRESETS[preset];
    return {
      ...movement,
      physics: {
        enabled: true,
        preset,
        bodyType: presetConfig.bodyType,
        isStatic: presetConfig.isStatic,
        density: presetConfig.density,
        friction: presetConfig.friction,
        restitution: presetConfig.restitution,
        frictionAir: presetConfig.frictionAir,
        angularVelocity: movement.physics?.angularVelocity,
        force: movement.physics?.force
      }
    };
  };

  const makeGroupId = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const getGroupMembers = (groupId?: string) => {
    if (!groupId) return [];
    return currentFrame.objects.filter(obj => obj.groupId === groupId);
  };

  const normalizeGroups = (objects: GameObject[]) => {
    const counts = objects.reduce<Record<string, number>>((acc, obj) => {
      if (!obj.groupId) return acc;
      acc[obj.groupId] = (acc[obj.groupId] || 0) + 1;
      return acc;
    }, {});

    return objects.map(obj => (
      obj.groupId && counts[obj.groupId] < 2 ? { ...obj, groupId: undefined } : obj
    ));
  };

  const groupSelectedObjects = () => {
    if (selectedObjectIds.length < 2) return;
    const groupId = makeGroupId();
    updateCurrentFrame({
      objects: currentFrame.objects.map(obj => (
        selectedObjectIds.includes(obj.id) ? { ...obj, groupId } : obj
      ))
    });
    setSelectedObjectIds(selectedObjectIds);
    saveToLocal(project, true);
  };

  const ungroupSelectedObjects = () => {
    const targetIds = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    if (targetIds.length === 0) return;
    updateCurrentFrame({
      objects: normalizeGroups(
        currentFrame.objects.map(obj => (
          targetIds.includes(obj.id) || (obj.groupId && targetIds.includes(currentFrame.objects.find(i => i.id === targetIds[0])?.groupId || ''))
            ? { ...obj, groupId: undefined }
            : obj
        ))
      )
    });
    saveToLocal(project, true);
  };

  const buildProjectBundle = (proj: GameProject = project) => ({
    project: proj,
    assets: userAssets,
    metadata: {
      engine: 'ABCDdeveloppement',
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      assetCount: userAssets.length
    }
  });

  const buildProjectZip = async (proj: GameProject = project, assets = userAssets) => {
    const zip = new JSZip();
    const manifest = {
      id: proj.id,
      name: proj.name,
      engine: 'ABCDdeveloppement',
      format: 'abcstudio-project-zip',
      schemaVersion: 1,
      assetCount: assets.length,
      savedAt: new Date().toISOString()
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('project/project.json', JSON.stringify(proj, null, 2));
    zip.file('assets/assets.json', JSON.stringify(assets, null, 2));
    zip.file('project/README.txt', [
      'ABCDdeveloppement Project Package',
      '',
      'This archive contains the full project data for local or portable use.',
      'Open project/project.json to inspect the scene, objects, events and settings.'
    ].join('\n'));

    return zip.generateAsync({ type: 'blob' });
  };

  const saveToLocal = async (proj: GameProject = project, isAuto = false) => {
    try {
      if (!isAuto) {
        setZipProcessing({ active: true, type: 'save' });
      }
      setIsSaving(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProjectBundle(proj))
      });
      if (res.ok) {
        if (!isAuto) {
          setSaveMessage("Project ZIP saved");
          setTimeout(() => setSaveMessage(null), 2000);
        }
        setIsProjectPersisted(true);
        fetchLocalProjects();
      }
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSaving(false);
      if (!isAuto) {
        setTimeout(() => setZipProcessing({ active: false, type: null }), 650);
      }
    }
  };

  const deleteLocalProject = async (projectIdToDelete: string) => {
    if (!projectIdToDelete) return;

    try {
      setLoadingProjects(true);
      let backup: { id: string; name: string; project: GameProject; assets: any[] } | null = null;
      if (project.id === projectIdToDelete) {
        backup = {
          id: project.id,
          name: project.name,
          project: JSON.parse(JSON.stringify(project)),
          assets: JSON.parse(JSON.stringify(userAssets))
        };
      } else {
        const resBackup = await fetch(`/api/projects/${encodeURIComponent(projectIdToDelete)}`);
        if (resBackup.ok) {
          const dataBackup = await resBackup.json();
          backup = {
            id: dataBackup.project?.id ?? dataBackup.id ?? projectIdToDelete,
            name: dataBackup.project?.name ?? dataBackup.name ?? 'Project Unnamed 1',
            project: normalizeGameProject((dataBackup.project ?? dataBackup) as GameProject),
            assets: Array.isArray(dataBackup.assets) ? dataBackup.assets : []
          };
        }
      }

      const res = await fetch(`/api/projects/${encodeURIComponent(projectIdToDelete)}`, { 
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSaveMessage("Project deleted");
        setTimeout(() => setSaveMessage(null), 2000);
        if (backup) setDeletedProjectBackup(backup);
        
        setLocalProjects(prev => prev.filter(p => p.id !== projectIdToDelete));
        
        if (project.id === projectIdToDelete) {
          startFreshProject();
          setHistory({ past: [], future: [] });
          setActiveTab('home');
          setSelectedObjectIds([]);
          setSelectionRect(null);
          setIsSelecting(false);
          setIsDragging(false);
          setIsPanning(false);
          setCanvasPan({ x: 0, y: 0 });
          setZoom(1);
          setUserAssets([]);
        }
      } else {
        alert("Could not delete: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      alert("Connection error while deleting.");
    } finally {
      setLoadingProjects(false);
      setContextMenu(null);
    }
  };

  const restoreDeletedProject = async () => {
    if (!deletedProjectBackup) return;

    try {
      const restoredProject = normalizeGameProject(deletedProjectBackup.project);
      setProject(restoredProject);
      setUserAssets(deletedProjectBackup.assets || []);
      setActiveTab('stage');
      setIsProjectPersisted(true);
      await saveToLocal(restoredProject, true);
      setDeletedProjectBackup(null);
      fetchLocalProjects();
    } catch (error) {
      console.error("Failed to restore deleted project", error);
      alert("Could not restore deleted project.");
    }
  };

  const requestDeleteProject = (id: string, name: string) => {
    setDeleteConfirm({ id, name, kind: 'project' });
  };

  const requestDeleteFrame = (frameId: string, name: string) => {
    setDeleteConfirm({ id: frameId, name, kind: 'frame' });
  };

  const renameLocalProject = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        fetchLocalProjects();
        if (project.id === id) setProject(prev => ({ ...prev, name: newName }));
      } else {
        const errorData = await res.json();
        alert(`Rename failed: ${errorData.error}`);
      }
    } catch (error) {
      alert("Rename failed");
    }
  };

  const duplicateLocalProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchLocalProjects();
      } else {
        const errorData = await res.json();
        alert(`Duplicate failed: ${errorData.error}`);
      }
    } catch (error) {
      alert("Duplicate failed");
    }
  };

  useEffect(() => {
    fetchLocalProjects();
  }, []);

  const loadUserAssets = async (uid: string) => {
    const q = query(collection(db, 'assets'), where('ownerId', '==', uid));
    try {
      const querySnapshot = await getDocs(q);
      const assets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserAssets(assets);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assets');
    }
  };

  const loadProject = (p: any) => {
    setProject(p.data);
    setActiveTab('stage');
  };

  const exportSourceToZip = async () => {
    const zip = new JSZip();
    const filesToInclude = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'src/main.tsx',
      'src/App.tsx',
      'src/index.css',
      'src/types/game.ts'
    ];

    try {
      setIsSaving(true);
      for (const filePath of filesToInclude) {
        const response = await fetch('/' + filePath);
        if (response.ok) {
          const content = await response.text();
          zip.file(filePath, content);
        }
      }
      
      // Add a dummy .env.example
      zip.file('.env.example', 'VITE_FIREBASE_API_KEY=\nVITE_FIREBASE_AUTH_DOMAIN=\n# Add other firebase config here if not using the json file');
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${project.name.replace(/\s+/g, '_')}_source.zip`);
      alert("Source code exported successfully! You can run this locally using 'npm install' and 'npm run dev'.");
    } catch (error) {
      console.error("Source export failed", error);
      alert("Failed to export source. Try using the export menu in the sidebar.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportProjectToZip = async () => {
    try {
      setZipProcessing({ active: true, type: 'export' });
      // Small artificial delay for UI feel and ensuring state is ready
      await new Promise(resolve => setTimeout(resolve, 800));

      const content = await buildProjectZip(project, userAssets);
      saveAs(content, `${project.name.replace(/\s+/g, '_')}.zip`);

      setSaveMessage("Project package exported");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Export failed", error);
      alert("Export failed. Please try again.");
    } finally {
      setZipProcessing({ active: false, type: null });
    }
  };

  const importProjectFromZip = async (file: File) => {
    try {
      setZipProcessing({ active: true, type: 'import' });
      // Small artificial delay for UI feel
      await new Promise(resolve => setTimeout(resolve, 1000));

      const zip = await JSZip.loadAsync(file);
      const projectFile = zip.file('project/project.json') || zip.file('project.abc') || zip.file('project.json');
      const assetsFile = zip.file('assets/assets.json');

      if (!projectFile) {
        throw new Error("Invalid project file: project/project.json not found in ZIP.");
      }

      const content = await projectFile.async('string');
      const importedData = JSON.parse(content);
      const importedAssets = assetsFile ? JSON.parse(await assetsFile.async('string')) : [];
      
      if (!importedData.frames) {
        throw new Error("Invalid project data structure.");
      }

      const { appAssets, assets, exportTimestamp, version, ...projectOnly } = importedData;

      setUserAssets(Array.isArray(importedAssets) ? importedAssets : (Array.isArray(assets) ? assets : (Array.isArray(appAssets) ? appAssets : [])));
      const normalized = normalizeGameProject(projectOnly as GameProject);
      setProject(normalized);
      setLibraryAssets(Array.isArray(normalized.libraryAssets) ? normalized.libraryAssets : []);
      setActiveTab('stage');
      setHistory({ past: [], future: [] });
      setIsProjectPersisted(false);
      setSaveMessage("Project package imported");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Import failed", error);
      alert(error instanceof Error ? error.message : "Failed to import project ZIP.");
    } finally {
      setZipProcessing({ active: false, type: null });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFrame = project.frames[project.currentFrameIndex] || project.frames[0];
  
  const selectedObject = useMemo(() => 
    currentFrame.objects.find(o => o.id === selectedObjectId),
    [currentFrame.objects, selectedObjectId]
  );

  const selectedObjects = useMemo(() =>
    currentFrame.objects.filter(o => selectedObjectIds.includes(o.id)),
    [currentFrame.objects, selectedObjectIds]
  );
  const selectedExtension = useMemo(
    () => (project.extensions || []).find(ext => ext.id === selectedExtensionId) || null,
    [project.extensions, selectedExtensionId]
  );
  const scratchExtensionEnabled = useMemo(
    () => (project.extensions || []).some(ext => ext.kind === 'scratch' && ext.enabled),
    [project.extensions]
  );
  useEffect(() => {
    if (scratchExtensionEnabled && activeTab === 'grid') {
      setActiveTab('events');
    } else if (!scratchExtensionEnabled && activeTab === 'events') {
      setActiveTab('grid');
    }
  }, [scratchExtensionEnabled, activeTab]);
  const selectedProjectLibraryAsset = useMemo(
    () => (project.libraryAssets || []).find(asset => asset.id === selectedLibraryAssetId) || null,
    [project.libraryAssets, selectedLibraryAssetId]
  );
  const shapeBuilderTarget = useMemo(
    () => (shapePickerTargetId ? currentFrame.objects.find(obj => obj.id === shapePickerTargetId) || null : null),
    [currentFrame.objects, shapePickerTargetId]
  );
  const filteredShapeLibrary = useMemo(() => {
    const query = shapeBuilderSearch.trim().toLowerCase();
    if (!query) return SHAPE_LIBRARY;
    return SHAPE_LIBRARY.filter(shape => `${shape.name} ${shape.id}`.toLowerCase().includes(query));
  }, [shapeBuilderSearch]);
  const customShapeLibrary = useMemo(() => project.customShapes || [], [project.customShapes]);
  const filteredCustomShapeLibrary = useMemo(() => {
    const query = shapeBuilderSearch.trim().toLowerCase();
    if (!query) return customShapeLibrary;
    return customShapeLibrary.filter(shape => `${shape.name} ${shape.id || ''}`.toLowerCase().includes(query));
  }, [customShapeLibrary, shapeBuilderSearch]);

  const customFrameObjects = useMemo(() =>
    currentFrame.objects.filter(obj => Boolean(obj.sourceAssetId || obj.shapeType || obj.imageUrl)),
    [currentFrame.objects]
  );
  const standardFrameObjects = useMemo(() =>
    currentFrame.objects.filter(obj => !Boolean(obj.sourceAssetId || obj.shapeType || obj.imageUrl)),
    [currentFrame.objects]
  );

  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

  const hasCustomShapeCurves = (customShape?: CustomShapeDefinition | null) => Boolean(customShape?.points?.some(point => point.curve === 'smooth' || point.handleIn || point.handleOut));

  const getCustomShapePathData = (points: CustomShapePoint[]) => {
    if (points.length < 2) return '';
    const first = points[0];
    let path = `M ${first.x} ${first.y}`;
    for (let index = 1; index < points.length; index += 1) {
      const prev = points[index - 1];
      const current = points[index];
      const prevOut = prev.handleOut || prev.handleIn || prev;
      const currentIn = current.handleIn || current.handleOut || current;
      const hasCurve = prev.curve === 'smooth' || current.curve === 'smooth' || prev.handleOut || current.handleIn || prev.handleIn || current.handleOut;
      if (hasCurve) {
        path += ` C ${prevOut.x} ${prevOut.y}, ${currentIn.x} ${currentIn.y}, ${current.x} ${current.y}`;
      } else {
        path += ` L ${current.x} ${current.y}`;
      }
    }
    const last = points[points.length - 1];
    const lastOut = last.handleOut || last.handleIn || last;
    const firstIn = first.handleIn || first.handleOut || first;
    const closeCurve = last.curve === 'smooth' || first.curve === 'smooth' || last.handleOut || first.handleIn || last.handleIn || first.handleOut;
    if (closeCurve) {
      path += ` C ${lastOut.x} ${lastOut.y}, ${firstIn.x} ${firstIn.y}, ${first.x} ${first.y} Z`;
    } else {
      path += ' Z';
    }
    return path;
  };

  const buildShapeSvgPoints = (shapeType?: string, customShape?: CustomShapeDefinition | null) => {
    if (customShape?.points?.length) {
      return customShape.points.map(point => `${point.x},${point.y}`).join(' ');
    }
    switch (normalizeShapeId(shapeType)) {
      case 'circle':
        return '50,4 62,8 73,14 83,24 92,36 96,50 92,64 83,76 73,86 62,92 50,96 38,92 27,86 17,76 8,64 4,50 8,36 17,24 27,14 38,8';
      case 'oval':
        return '50,4 64,7 77,15 87,27 94,41 96,50 94,59 87,73 77,85 64,93 50,96 36,93 23,85 13,73 6,59 4,50 6,41 13,27 23,15 36,7';
      case 'triangle-up':
        return '50,4 96,96 4,96';
      case 'triangle-down':
        return '4,4 96,4 50,96';
      case 'triangle-left':
        return '4,50 96,4 96,96';
      case 'triangle-right':
        return '4,4 96,50 4,96';
      case 'diamond':
      case 'rhombus':
        return '50,4 96,50 50,96 4,50';
      case 'pentagon':
        return '50,4 96,38 79,96 21,96 4,38';
      case 'hexagon':
        return '28,4 72,4 96,50 72,96 28,96 4,50';
      case 'octagon':
        return '30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30';
      case 'star-5':
        return '50,4 61,35 96,35 68,57 79,95 50,73 21,95 32,57 4,35 39,35';
      case 'star-6':
        return '50,4 61,27 89,20 79,46 96,70 67,69 50,96 33,69 4,70 21,46 11,20 39,27';
      case 'star-8':
        return '50,4 60,22 78,4 76,28 96,50 76,72 78,96 60,78 50,96 40,78 22,96 24,72 4,50 24,28 22,4 40,22';
      case 'heart':
        return '50,88 10,45 20,15 50,30 80,15 90,45';
      case 'teardrop':
        return '50,4 75,4 96,31 96,58 77,96 50,96 23,96 4,83 4,58 4,31 25,4';
      default:
        return '2,2 98,2 98,98 2,98';
    }
  };

  const getPointsFromClipPath = (clipPath: string): CustomShapePoint[] => {
    if (clipPath.includes('polygon(')) {
      const start = clipPath.indexOf('polygon(') + 8;
      const end = clipPath.lastIndexOf(')');
      const content = clipPath.substring(start, end);
      return content.split(',').map(pair => {
        const parts = pair.trim().split(/\s+/);
        return {
          x: parseFloat(parts[0]),
          y: parseFloat(parts[1]),
          curve: 'corner' as const
        };
      });
    }
    if (clipPath.includes('circle(')) {
      return [
        { x: 50, y: 0, curve: 'smooth' }, { x: 85, y: 15, curve: 'smooth' },
        { x: 100, y: 50, curve: 'smooth' }, { x: 85, y: 85, curve: 'smooth' },
        { x: 50, y: 100, curve: 'smooth' }, { x: 15, y: 85, curve: 'smooth' },
        { x: 0, y: 50, curve: 'smooth' }, { x: 15, y: 15, curve: 'smooth' }
      ];
    }
    if (clipPath.includes('ellipse(')) {
      return [
        { x: 50, y: 0, curve: 'smooth' }, { x: 100, y: 50, curve: 'smooth' },
        { x: 50, y: 100, curve: 'smooth' }, { x: 0, y: 50, curve: 'smooth' }
      ];
    }
    if (clipPath.includes('inset(')) {
      return [
        { x: 0, y: 0, curve: 'corner' }, { x: 100, y: 0, curve: 'corner' },
        { x: 100, y: 100, curve: 'corner' }, { x: 0, y: 100, curve: 'corner' }
      ];
    }
    return [
      { x: 50, y: 4, curve: 'corner' }, { x: 82, y: 18, curve: 'corner' },
      { x: 94, y: 52, curve: 'corner' }, { x: 74, y: 92, curve: 'corner' },
      { x: 26, y: 92, curve: 'corner' }, { x: 6, y: 52, curve: 'corner' }
    ];
  };

  const createDefaultCustomShapeDraft = (): { name: string; points: CustomShapePoint[]; fill: string; libraryId?: string } => ({
    name: `Shape ${((project.customShapes?.length || 0) + 1)}`,
    fill: '#3b82f6',
    points: [
      { x: 50, y: 4, curve: 'corner' },
      { x: 82, y: 18, curve: 'corner' },
      { x: 94, y: 52, curve: 'corner' },
      { x: 74, y: 92, curve: 'corner' },
      { x: 26, y: 92, curve: 'corner' },
      { x: 6, y: 52, curve: 'corner' },
      { x: 18, y: 18, curve: 'corner' }
    ]
  });

function hasCurvedCustomShape(customShape?: CustomShapeDefinition | null) {
  return Boolean(customShape?.points?.some(point => point.curve === 'smooth' || point.handleIn || point.handleOut));
}

const normalizeShapeId = (shapeType?: string) => (shapeType || '').replace(/-(soft|bold)$/, '');

function buildCurvedCustomShapePath(points: CustomShapePoint[]) {
  if (points.length < 2) return '';
  const first = points[0];
  let path = `M ${first.x} ${first.y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const prevOut = prev.handleOut || prev.handleIn || prev;
    const currentIn = current.handleIn || current.handleOut || current;
    const hasCurve = prev.curve === 'smooth' || current.curve === 'smooth' || prev.handleOut || current.handleIn || prev.handleIn || current.handleOut;
    path += hasCurve
      ? ` C ${prevOut.x} ${prevOut.y}, ${currentIn.x} ${currentIn.y}, ${current.x} ${current.y}`
      : ` L ${current.x} ${current.y}`;
  }
  const last = points[points.length - 1];
  const lastOut = last.handleOut || last.handleIn || last;
  const firstIn = first.handleIn || first.handleOut || first;
  const closeCurve = last.curve === 'smooth' || first.curve === 'smooth' || last.handleOut || first.handleIn || last.handleIn || first.handleOut;
  path += closeCurve
    ? ` C ${lastOut.x} ${lastOut.y}, ${firstIn.x} ${firstIn.y}, ${first.x} ${first.y} Z`
    : ' Z';
  return path;
}

const RUNTIME_PHYSICS_PRESETS = {
  static: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 1, restitution: 0, frictionAir: 0.02 },
  rigid: { bodyType: 'rectangle', isStatic: false, density: 0.005, friction: 0.8, restitution: 0.05, frictionAir: 0.01 },
  bouncy: { bodyType: 'circle', isStatic: false, density: 0.001, friction: 0.05, restitution: 0.85, frictionAir: 0.005 },
  slippery: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.01, restitution: 0.08, frictionAir: 0.001 },
  heavy: { bodyType: 'rectangle', isStatic: false, density: 0.02, friction: 0.5, restitution: 0.02, frictionAir: 0.02 },
  ice: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.001, restitution: 0.01, frictionAir: 0.0005 },
  ghost: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0, restitution: 0, frictionAir: 0, isSensor: true },
  trampoline: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 0.2, restitution: 1.1, frictionAir: 0 },
  pinball: { bodyType: 'circle', isStatic: false, density: 0.002, friction: 0.02, restitution: 0.95, frictionAir: 0.002 },
  floaty: { bodyType: 'circle', isStatic: false, density: 0.0005, friction: 0.03, restitution: 0.25, frictionAir: 0.08 }
} as const;

const getPhysicsConfig = (movement: GameObject['movement']) => {
  const physics = movement.physics;
  if (!physics?.enabled) return null;
  const preset = physics.preset && physics.preset !== 'custom' ? RUNTIME_PHYSICS_PRESETS[physics.preset] : null;
  return {
    enabled: true,
    bodyType: physics.bodyType,
    isStatic: physics.isStatic,
    density: physics.density,
    friction: physics.friction,
    restitution: physics.restitution,
    frictionAir: physics.frictionAir,
    isSensor: false,
    ...preset
  };
};



function ShapeSelectionOutline({ shapeType, customShape }: { shapeType?: string, customShape?: CustomShapeDefinition | null }) {
  const id = normalizeShapeId(shapeType);
  const common = {
    className: 'absolute inset-0 w-full h-full pointer-events-none',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none' as const
  };

  if (customShape?.points?.length) {
    const pathData = buildCurvedCustomShapePath(customShape.points);
    if (hasCurvedCustomShape(customShape)) {
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <path
            d={pathData}
            fill="none"
            stroke="rgba(37,99,235,0.98)"
            strokeWidth="4"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }
    return (
      <svg {...common} style={{ overflow: 'visible' }}>
        <polygon
          points={customShape.points.map(point => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="rgba(37,99,235,0.98)"
          strokeWidth="4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  switch (id) {
    case 'circle':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <ellipse cx="50" cy="50" rx="47" ry="47" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'oval':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <ellipse cx="50" cy="50" rx="48" ry="42" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'rounded-square':
    case 'pill':
    case 'capsule':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <rect x="2" y="2" width="96" height="96" rx={id === 'pill' || id === 'capsule' ? 48 : 24} ry={id === 'pill' || id === 'capsule' ? 48 : 24} fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'square':
    case 'rectangle':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'triangle-up':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 96,96 4,96" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'triangle-down':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="4,4 96,4 50,96" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'triangle-left':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="4,50 96,4 96,96" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'triangle-right':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="4,4 96,50 4,96" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'diamond':
    case 'rhombus':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 96,50 50,96 4,50" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'pentagon':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 96,38 79,96 21,96 4,38" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'hexagon':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="28,4 72,4 96,50 72,96 28,96 4,50" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'octagon':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'star-5':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 61,35 96,35 68,57 79,95 50,73 21,95 32,57 4,35 39,35" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'star-6':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 61,27 89,20 79,46 96,70 67,69 50,96 33,69 4,70 21,46 11,20 39,27" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'star-8':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <polygon points="50,4 60,22 78,4 76,28 96,50 76,72 78,96 60,78 50,96 40,78 22,96 24,72 4,50 24,28 22,4 40,22" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <path d="M50 88 L10 45 C4 29 12 10 30 10 C40 10 46 16 50 24 C54 16 60 10 70 10 C88 10 96 29 90 45 Z" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'teardrop':
      return (
        <svg {...common} style={{ overflow: 'visible' }}>
          <path d="M50 4 C75 4 96 31 96 58 C96 83 77 96 50 96 C23 96 4 83 4 58 C4 31 25 4 50 4 Z" fill="none" stroke="rgba(37,99,235,0.98)" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    default:
      return null;
  }
}

function ShapeLibraryCard({
  shape,
  onPick,
  selected = false,
  theme = 'light',
}: {
  shape: ShapeOption;
  onPick: () => void;
  selected?: boolean;
  theme?: 'light' | 'dark';
}) {
  return (
    <button
      onClick={onPick}
      className={`group rounded-[24px] border overflow-hidden text-left transition-all ${selected ? 'border-indigo-500 shadow-xl shadow-indigo-600/10 scale-[1.02] ring-2 ring-indigo-500/20' : theme === 'dark' ? 'border-slate-800 bg-slate-800/50 hover:-translate-y-1 hover:border-slate-700 hover:shadow-lg hover:shadow-black/20' : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg'}`}
    >
      <div className={`p-4 border-b ${selected ? (theme === 'dark' ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/30 border-slate-100') : (theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100')}`}>
        <div className={`relative mx-auto h-24 w-full max-w-[120px] rounded-[20px] border flex items-center justify-center overflow-hidden shadow-inner ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'}`}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, ${selected ? 'rgba(99,102,241,0.4)' : 'rgba(148,163,184,0.1)'}, transparent 70%)`
          }} />
          <div className="relative w-16 h-16 transition-transform group-hover:scale-110 duration-500">
            <div
              className={`absolute inset-1 rounded-[14px] shadow-lg ${selected ? 'shadow-indigo-500/50' : 'shadow-black/50'}`}
              style={{ ...getShapeStyle(shape.id), backgroundColor: selected ? '#6366f1' : theme === 'dark' ? '#334155' : '#475569' }}
            />
          </div>
        </div>
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="overflow-hidden">
          <div className={`text-[13px] font-black tracking-tight truncate ${selected ? 'text-indigo-400' : theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{shape.name}</div>
          <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{shape.id}</div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Zap className="w-2.5 h-2.5 text-white fill-current" />
          </div>
        )}
      </div>
    </button>
  );
}

function CustomShapeLibraryCard({
  shape,
  onPick,
  selected = false,
  theme = 'light',
}: {
  shape: CustomShapeDefinition;
  onPick: () => void;
  selected?: boolean;
  theme?: 'light' | 'dark';
}) {
  return (
    <button
      onClick={onPick}
      className={`group rounded-[22px] border overflow-hidden text-left transition-all ${selected ? 'border-indigo-500 shadow-xl shadow-indigo-600/10 scale-[1.02] ring-2 ring-indigo-500/20' : theme === 'dark' ? 'border-slate-800 bg-slate-800/50 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg'}`}
    >
      <div className={`p-3 border-b ${selected ? (theme === 'dark' ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/30 border-slate-100') : (theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-100')}`}>
        <div className={`relative mx-auto h-24 w-full max-w-[128px] rounded-[18px] border flex items-center justify-center overflow-hidden shadow-inner ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'}`}>
          <div className="relative w-14 h-14 transition-transform group-hover:rotate-12 duration-500" style={{ 
             clipPath: shape.points.length ? `polygon(${shape.points.map(point => `${point.x}% ${point.y}%`).join(', ')})` : undefined, 
             backgroundColor: selected ? '#6366f1' : theme === 'dark' ? '#334155' : '#475569',
             boxShadow: selected ? '0 0 20px rgba(99,102,241,0.5)' : 'none'
          }}>
          </div>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="overflow-hidden">
          <div className={`text-[13px] font-black tracking-tight truncate ${selected ? 'text-indigo-400' : theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{shape.name}</div>
          <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Custom Template</div>
        </div>
         {selected && (
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Zap className="w-2.5 h-2.5 text-white fill-current" />
          </div>
        )}
      </div>
    </button>
  );
}

function BlockRow({
  tone,
  icon,
  title,
  subtitle,
  onDelete,
  condition,
  action,
  objects = [],
  globalValues = [],
  onUpdate,
  theme = 'light',
}: {
  tone: 'amber' | 'emerald' | 'slate';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onDelete: () => void;
  condition?: any;
  action?: any;
  objects?: any[];
  globalValues?: any[];
  onUpdate?: (updates: any) => void;
  theme?: string;
}) {
  const tones = {
    amber: theme === 'dark' ? 'border-amber-950/45 bg-amber-950/20 text-amber-100' : 'border-amber-250 bg-amber-50/20 text-amber-900',
    emerald: theme === 'dark' ? 'border-emerald-950/45 bg-emerald-950/20 text-emerald-100' : 'border-emerald-250 bg-emerald-50/20 text-emerald-900',
    slate: theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
  } as const;

  const accent = {
    amber: 'text-amber-500 dark:text-amber-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    slate: 'text-slate-500 dark:text-slate-400'
  } as const;

  const SOUND_PRESETS = [
    { name: 'Beep Click', url: 'https://www.soundjay.com/buttons/sounds/button-1.mp3' },
    { name: 'Beep Action', url: 'https://www.soundjay.com/buttons/sounds/button-3.mp3' },
    { name: 'Soft Pop', url: 'https://www.soundjay.com/buttons/sounds/button-4.mp3' },
    { name: 'Laser Beam', url: 'https://www.soundjay.com/buttons/sounds/button-10.mp3' },
    { name: 'Level Up Bell', url: 'https://www.soundjay.com/misc/sounds/bell-ring-01.mp3' },
    { name: 'Retro Gameover Fail', url: 'https://www.soundjay.com/misc/sounds/fail-trumpet-01.mp3' },
  ];

  const handleParamChange = (field: string, value: any) => {
    if (!onUpdate) return;
    if (condition) {
      const updatedParams = { ...(condition.params || {}), [field]: value };
      onUpdate({ ...condition, params: updatedParams });
    } else if (action) {
      const updatedParams = { ...(action.params || {}), [field]: value };
      onUpdate({ ...action, params: updatedParams });
    }
  };

  const handleTargetChange = (targetId: string) => {
    if (!onUpdate) return;
    if (condition) {
      onUpdate({ ...condition, targetId });
    } else if (action) {
      onUpdate({ ...action, targetId });
    }
  };

  const playPreview = (url: string) => {
    if (!url) return;
    try {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  return (
    <div className={`flex flex-col gap-3 rounded-[24px] border p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${tones[tone]}`}>
      {/* Block Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100/50 dark:bg-slate-850 ${accent[tone]} backdrop-blur-sm shadow-inner shrink-0`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] opacity-90 truncate">{title}</div>
            <div className={`text-[9px] font-semibold opacity-60 mt-0.5 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</div>
          </div>
        </div>
        <button 
          type="button"
          onClick={onDelete} 
          className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all active:scale-90 shadow-sm shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block Inline Coding Form (Basic Logic Programming) */}
      <div className="space-y-3 pt-3 mt-1 border-t border-slate-200/50 dark:border-slate-800/40">
        {condition && (
          <div className="space-y-2.5 text-xs">
            {/* If collision - select targets */}
            {condition.type === 'collision' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Target Object</label>
                  <select
                    value={condition.targetId || ''}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">(Select Object)</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Collides With</label>
                  <select
                    value={condition.params?.targetId2 || ''}
                    onChange={(e) => handleParamChange('targetId2', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">(Select Target)</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* If Timer - input interval */}
            {condition.type === 'timer' && (
              <div className="flex items-center gap-2">
                <span className="font-bold whitespace-nowrap text-slate-500 dark:text-slate-400">Repeat Every</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={condition.params?.interval ?? 1}
                  onChange={(e) => handleParamChange('interval', parseFloat(e.target.value) || 1)}
                  className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 font-bold text-center"
                />
                <span className="font-bold text-slate-500 dark:text-slate-400">seconds</span>
              </div>
            )}

            {/* If Key Down - input keyboard */}
            {condition.type === 'key_down' && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Keyboard Key</label>
                <select
                  value={condition.params?.keyCode || 'ArrowRight'}
                  onChange={(e) => handleParamChange('keyCode', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="ArrowRight">Arrow Right</option>
                  <option value="ArrowLeft">Arrow Left</option>
                  <option value="ArrowUp">Arrow Up</option>
                  <option value="ArrowDown">Arrow Down</option>
                  <option value=" ">Spacebar</option>
                  <option value="Enter">Enter Key</option>
                  <option value="w">W Key (Up)</option>
                  <option value="a">A Key (Left)</option>
                  <option value="s">S Key (Down)</option>
                  <option value="d">D Key (Right)</option>
                  <option value="Escape">Escape Key</option>
                </select>
              </div>
            )}

            {/* If Screen Edge - select edge */}
            {condition.type === 'screen_edge' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Object</label>
                  <select
                    value={condition.targetId || ''}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">(Select Object)</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Screen Edge</label>
                  <select
                    value={condition.params?.edge || 'left'}
                    onChange={(e) => handleParamChange('edge', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="left">Left Edge</option>
                    <option value="right">Right Edge</option>
                    <option value="top">Top Edge</option>
                    <option value="bottom">Bottom Edge</option>
                  </select>
                </div>
              </div>
            )}

            {/* If Value Compare - choose variable, operator, target val */}
            {condition.type === 'value_compare' && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Global Value</label>
                    <select
                      value={condition.params?.valueName || 'Score'}
                      onChange={(e) => handleParamChange('valueName', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                    >
                      {globalValues.map(gv => (
                        <option key={gv.id} value={gv.name}>{gv.name}</option>
                      ))}
                      {globalValues.length === 0 && (
                        <option value="Score">Score (Default)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Operator</label>
                    <select
                      value={condition.params?.operator || '=='}
                      onChange={(e) => handleParamChange('operator', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="==">==</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Compare Target</label>
                  <input
                    type="number"
                    value={condition.params?.value ?? 0}
                    onChange={(e) => handleParamChange('value', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
            
            {/* If Mouse Click */}
            {condition.type === 'mouse_click' && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Click on Object</label>
                <select
                  value={condition.targetId || ''}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">(Select Object)</option>
                  {objects.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {action && (
          <div className="space-y-2.5 text-xs">
            {/* Object actions */}
            {['move_x', 'move_y', 'add_x', 'add_y', 'set_x', 'set_y', 'bounce', 'destroy', 'change_color', 'set_visible'].includes(action.type) && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Apply To Object</label>
                <select
                  value={action.targetId || ''}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">(Select Target)</option>
                  {objects.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Movement numeric properties */}
            {['move_x', 'move_y', 'add_x', 'add_y', 'set_x', 'set_y'].includes(action.type) && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Speed Amount (pixels)</label>
                <input
                  type="number"
                  value={action.params?.value ?? 5}
                  onChange={(e) => handleParamChange('value', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Color Palette Input */}
            {action.type === 'change_color' && (
              <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="font-bold text-slate-500 dark:text-slate-400">Palette Color</span>
                <input
                  type="color"
                  value={action.params?.color || '#ef4444'}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="w-8 h-8 rounded-lg outline-none cursor-pointer border-0 bg-transparent shrink-0"
                />
              </div>
            )}

            {/* Set visibility dropdown */}
            {action.type === 'set_visible' && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Visibility State</label>
                <select
                  value={action.params?.value ?? 1}
                  onChange={(e) => handleParamChange('value', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={1}>Show (Visible)</option>
                  <option value={0}>Hide (Invisible)</option>
                </select>
              </div>
            )}

            {/* Sound presetting dropdown */}
            {action.type === 'play_sound' && (
              <div className="space-y-1.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Sound FX Preset</label>
                  <select
                    value={action.params?.valueName || ''}
                    onChange={(e) => {
                      handleParamChange('valueName', e.target.value);
                      playPreview(e.target.value);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">(Custom Audio URL)</option>
                    {SOUND_PRESETS.map((snd) => (
                      <option key={snd.name} value={snd.url}>{snd.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Audio Source Link</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={action.params?.valueName || ''}
                      onChange={(e) => handleParamChange('valueName', e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-indigo-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => playPreview(action.params?.valueName || '')}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 rounded-lg font-black text-xs transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Increase / sub global value */}
            {['add_global_value', 'sub_global_value', 'set_global_value'].includes(action.type) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Global Value</label>
                  <select
                    value={action.params?.valueName || 'Score'}
                    onChange={(e) => handleParamChange('valueName', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-indigo-500 transition-colors"
                  >
                    {globalValues.map(gv => (
                      <option key={gv.id} value={gv.name}>{gv.name}</option>
                    ))}
                    {globalValues.length === 0 && (
                      <option value="Score">Score (Default)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider opacity-60 block mb-1">Change Value</label>
                  <input
                    type="number"
                    value={action.params?.value ?? 1}
                    onChange={(e) => handleParamChange('value', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

  const getCanvasOffset = () => ({
    x: (currentFrame.width || project.settings.width) / 2,
    y: (currentFrame.height || project.settings.height) / 2
  });

  const clampZoom = (value: number) => Math.max(0.1, Math.min(3, value));

  const zoomCanvasAt = (clientX: number, clientY: number, nextZoom: number) => {
    const stage = document.getElementById('stage-canvas');
    if (!stage) {
      setZoom(clampZoom(nextZoom));
      return;
    }

    const rect = stage.getBoundingClientRect();
    const clampedZoom = clampZoom(nextZoom);
    const frameLocalX = (clientX - rect.left) / zoom;
    const frameLocalY = (clientY - rect.top) / zoom;
    const nextPan = {
      x: clientX - rect.left - frameLocalX * clampedZoom,
      y: clientY - rect.top - frameLocalY * clampedZoom
    };

    setZoom(clampedZoom);
    setCanvasPan(nextPan);
  };

  const updateProject = (updates: Partial<GameProject>, skipHistory = false) => {
    if (!skipHistory) {
      setHistory(prev => ({
        past: [...prev.past.slice(-49), project], // Limit history to 50
        future: []
      }));
    }
    setProject(prev => ({ ...prev, ...updates }));
  };

  const undo = () => {
    if (deletedProjectBackup && activeTab === 'home') {
      void restoreDeletedProject();
      return;
    }
    if (history.past.length === 0) {
      if (deletedProjectBackup) {
        void restoreDeletedProject();
      }
      return;
    }
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);
    setHistory({
      past: newPast,
      future: [project, ...history.future]
    });
    setProject(previous);
  };

  const redo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    setHistory({
      past: [...history.past, project],
      future: newFuture
    });
    setProject(next);
  };

  const updateCurrentFrame = (updates: Partial<GameFrame>) => {
    updateProject({
      frames: project.frames.map((f, i) => i === project.currentFrameIndex ? { ...f, ...updates } : f)
    });
  };

  const fitToScreen = () => {
    const canvasArea = document.querySelector('.canvas-area');
    if (!canvasArea) return;
    const { width, height } = canvasArea.getBoundingClientRect();
    const padding = Math.max(96, Math.min(width, height) * 0.12);
    const availableWidth = Math.max(1, width - padding);
    const availableHeight = Math.max(1, height - padding);
    const scaleX = availableWidth / currentFrame.width;
    const scaleY = availableHeight / currentFrame.height;
    const nextZoom = Math.max(0.1, Math.min(Math.min(scaleX, scaleY), 2));
    const centeredPan = {
      x: (width - currentFrame.width * nextZoom) / 2,
      y: (height - currentFrame.height * nextZoom) / 2
    };
    setZoom(nextZoom);
    setCanvasPan(centeredPan);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input/textarea/select/contenteditable
      const target = e.target as HTMLElement;
      if (
        target && 
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      // Save - Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToLocal();
      }
      // Run - F5
      if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('play');
      }
      // Undo - Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Redo - Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0 && !editingTextId) {
          const newObjects = currentFrame.objects.filter(o => !selectedObjectIds.includes(o.id));
          updateCurrentFrame({ objects: newObjects });
          setSelectedObjectIds([]);
        }
      }
      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && activeTab === 'stage') {
        e.preventDefault();
        setSelectedObjectIds(currentFrame.objects.map(o => o.id));
      }
      // Fit to screen - Ctrl+0
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToScreen();
      }
      // Duplicate - Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && activeTab === 'stage') {
        e.preventDefault();
        if (selectedObjectIds.length > 0) {
          const newObjs: GameObject[] = [];
          selectedObjectIds.forEach(id => {
            const original = currentFrame.objects.find(o => o.id === id);
            if (original) {
              const copy = { 
                ...original, 
                id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                x: original.x + 10,
                y: original.y + 10,
                name: `${original.name} (Copy)`
              };
              newObjs.push(copy);
            }
          });
          updateCurrentFrame({ objects: [...currentFrame.objects, ...newObjs] });
          setSelectedObjectIds(newObjs.map(o => o.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, selectedObjectIds, activeTab, editingTextId]);

  const addObject = (type: ObjectType = 'active') => {
    const nextName = getNextAvailableName('Item_', currentFrame.objects.map(obj => obj.name));
    const newObj: GameObject = {
      id: `obj-${Date.now()}`,
      name: nextName,
      x: 0,
      y: 0,
      width: type === 'string' ? 120 : 50,
      height: type === 'string' ? 30 : 50,
      rotation: 0,
      color: type === 'string' ? '#1e293b' : '#' + Math.floor(Math.random()*16777215).toString(16),
      type,
      opacity: 1,
      zIndex: currentFrame.objects.length + 1,
      shapeType: type === 'string' ? 'rectangle' : 'square',
      alterableValues: [],
      isVisible: true,
      textConfig: type === 'string' ? { text: 'Double click to edit', fontSize: 16, fontFamily: 'Inter', textAlign: 'left' } : undefined,
      movement: {
        type: 'static',
        speed: 0,
        acceleration: 0,
        deceleration: 0
      }
    };
    updateCurrentFrame({
      objects: [...currentFrame.objects, newObj]
    });
    setSelectedObjectIds([newObj.id]);
    return newObj.id;
  };

  const blobToDataUrl = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load asset: ${url}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const importLibraryImage = async (asset: LocalLibraryAsset) => {
    const dataUrl = await blobToDataUrl(asset.src);
    const newObj: GameObject = {
      id: `obj-${Date.now()}`,
      name: asset.name,
      x: 0,
      y: 0,
      width: 96,
      height: 96,
      rotation: 0,
      color: '#ffffff',
      imageUrl: dataUrl,
      type: 'active',
      opacity: 1,
      zIndex: currentFrame.objects.length + 1,
      shapeType: 'custom',
      alterableValues: [],
      isVisible: true,
      movement: {
        type: 'static',
        speed: 0,
        acceleration: 0,
        deceleration: 0
      }
    };
    updateCurrentFrame({ objects: [...currentFrame.objects, newObj] });
    setSelectedObjectIds([newObj.id]);
    setActiveTab('stage');
  };

  const importLibraryAssetToFrame = async (asset: ProjectLibraryAsset | LocalLibraryAsset) => {
    const isLocal = 'src' in asset;
    const sourceUrl = isLocal ? await blobToDataUrl(asset.src) : asset.sourceUrl;
    const kind = isLocal ? asset.type : asset.kind;
    const name = asset.name;

    if (kind === 'sound') {
      setSaveMessage(`${name} is stored in the project library`);
      setTimeout(() => setSaveMessage(null), 1800);
      return;
    }

    const newObj: GameObject = {
      id: `obj-${Date.now()}`,
      name,
      x: 0,
      y: 0,
      width: 96,
      height: 96,
      rotation: 0,
      color: '#ffffff',
      imageUrl: kind === 'image' ? sourceUrl : undefined,
      sourceAssetId: !isLocal ? asset.id : undefined,
      shapeType: kind === 'image' ? 'custom' : undefined,
      type: 'active',
      opacity: 1,
      zIndex: currentFrame.objects.length + 1,
      alterableValues: [],
      isVisible: true,
      movement: {
        type: 'static',
        speed: 0,
        acceleration: 0,
        deceleration: 0
      }
    };

    updateCurrentFrame({ objects: [...currentFrame.objects, newObj] });
    setSelectedObjectIds([newObj.id]);
    setActiveTab('stage');
  };

  const assignLibraryImageToSelected = async (asset: LocalLibraryAsset | ProjectLibraryAsset) => {
    if (!selectedObjectId) return importLibraryAssetToFrame(asset);
    const dataUrl = 'src' in asset ? await blobToDataUrl(asset.src) : asset.sourceUrl;
    updateObject(selectedObjectId, { imageUrl: dataUrl, sourceAssetId: 'id' in asset ? asset.id : undefined, shapeType: 'custom' });
    setActiveTab('stage');
  };

  const importLibrarySound = async (asset: LocalLibraryAsset | ProjectLibraryAsset) => {
    const name = asset.name;
    setSaveMessage(`${name} is stored in the project library`);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const makeDefaultAssetEditorState = (kind: ProjectAssetKind): ProjectAssetEditorState => (
    kind === 'image'
      ? {
          image: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            grayscale: 0,
            hueRotate: 0,
            blur: 0,
            rotate: 0,
            flipX: false,
            flipY: false
          }
        }
      : {
          sound: {
            volume: 100,
            loop: false,
            playbackRate: 100,
            trimStart: 0,
            trimEnd: 100
          }
        }
  );

  const buildAssetRecord = async (asset: LocalLibraryAsset, kind: ProjectAssetKind): Promise<ProjectLibraryAsset> => {
    const sourceUrl = await blobToDataUrl(asset.src);
    return {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: asset.name,
      kind,
      sourceUrl,
      originalFileName: asset.src.split('/').pop(),
      createdAt: new Date().toISOString(),
      editorState: makeDefaultAssetEditorState(kind)
    };
  };

  const fileToDataUrl = async (file: File) => await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const importProjectLibraryFile = async (file: File) => {
    const kind = getAssetKindFromFile(file);
    const sourceUrl = await fileToDataUrl(file);
    const nextAsset: ProjectLibraryAsset = {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      kind,
      sourceUrl,
      originalFileName: file.name,
      createdAt: new Date().toISOString(),
      editorState: makeDefaultAssetEditorState(kind)
    };
    const nextAssets = [...(project.libraryAssets || []), nextAsset];
    updateProject({ libraryAssets: nextAssets });
    setLibraryAssets(nextAssets);
    setSelectedLibraryAssetId(nextAsset.id);
    setAssetInspectorTab(kind === 'sound' ? 'sound' : 'image');
    setActiveTab('assets');
    setSaveMessage(`${file.name} imported to Custom`);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const triggerRetroSynthPreview = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        alert("Web Audio API is not supported in this browser.");
        return;
      }
      const ctx = new AudioCtx();
      
      const p: SynthParams = {
        waveType: retroSynthWaveType,
        baseFrequency: retroSynthBaseFreq,
        frequencyLimit: retroSynthFreqLimit,
        pitchSlide: retroSynthPitchSlide,
        attackTime: retroSynthAttack,
        sustainTime: retroSynthSustain,
        decayTime: retroSynthDecay,
        sustainVolume: retroSynthSustainVol,
        vibratoDepth: retroSynthVibratoDepth,
        vibratoSpeed: retroSynthVibratoSpeed,
        lowPassCutoff: retroSynthLpfCutoff
      };
      
      const samples = generateSamples(p, ctx.sampleRate);
      const audioBuffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      audioBuffer.copyToChannel(samples, 0);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Preview synth error", err);
    }
  };

  const saveRetroSynthSound = () => {
    const p: SynthParams = {
      waveType: retroSynthWaveType,
      baseFrequency: retroSynthBaseFreq,
      frequencyLimit: retroSynthFreqLimit,
      pitchSlide: retroSynthPitchSlide,
      attackTime: retroSynthAttack,
      sustainTime: retroSynthSustain,
      decayTime: retroSynthDecay,
      sustainVolume: retroSynthSustainVol,
      vibratoDepth: retroSynthVibratoDepth,
      vibratoSpeed: retroSynthVibratoSpeed,
      lowPassCutoff: retroSynthLpfCutoff
    };
    
    const samples = generateSamples(p, 22050);
    const wavBase64 = encodeToWavBase64(samples, 22050);
    
    const name = retroSoundName.trim().replace(/\s+/g, '_') || 'retro_sfx';
    const nextAsset: ProjectLibraryAsset = {
      id: `sound-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      kind: 'sound',
      sourceUrl: wavBase64,
      originalFileName: `${name}.wav`,
      createdAt: new Date().toISOString(),
      editorState: makeDefaultAssetEditorState('sound')
    };
    
    const nextAssets = [...(project.libraryAssets || []), nextAsset];
    updateProject({ libraryAssets: nextAssets });
    setLibraryAssets(nextAssets);
    setSelectedLibraryAssetId(nextAsset.id);
    setAssetInspectorTab('sound');
    setShowRetroSynthModal(false);
    
    setSaveMessage(`Synthesized sound "${name}" added to Project Library`);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const applyRetroSynthPreset = (presetName: string) => {
    const p = SYNTH_PRESETS[presetName];
    if (!p) return;
    setRetroSynthWaveType(p.waveType);
    setRetroSynthBaseFreq(p.baseFrequency);
    setRetroSynthFreqLimit(p.frequencyLimit);
    setRetroSynthPitchSlide(p.pitchSlide);
    setRetroSynthAttack(p.attackTime);
    setRetroSynthSustain(p.sustainTime);
    setRetroSynthDecay(p.decayTime);
    setRetroSynthSustainVol(p.sustainVolume);
    setRetroSynthVibratoDepth(p.vibratoDepth);
    setRetroSynthVibratoSpeed(p.vibratoSpeed);
    setRetroSynthLpfCutoff(p.lowPassCutoff);
    setRetroSoundName(`retro_${presetName}_${Math.floor(Math.random() * 90 + 10)}`);
  };

  const triggerCopilotPrompt = async () => {
    if (!copilotInput.trim()) return;
    const userPrompt = copilotInput.trim();
    setCopilotHistory(prev => [...prev, { sender: 'user', text: userPrompt }]);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      // Build a clean active state as file context
      const fileContext = `Active Project: ${project.name}
Active Frame: ${currentFrame.name}
Active Assets Count: ${(project.libraryAssets || []).length}
Active Objects Count: ${currentFrame.objects.length}
Active Global Values: ${JSON.stringify(project.globalValues)}
Active Events: ${JSON.stringify(currentFrame.events.map(e => ({ id: e.id, name: e.name, conditionsCount: e.conditions.length, actionsCount: e.actions.length })))}
Current Extensions: ${JSON.stringify(project.extensions)}`;

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          fileContext,
          language: project.extensions?.[0]?.language || 'javascript',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with Copilot API.');
      }

      setCopilotHistory(prev => [...prev, { sender: 'assistant', text: data.text || "Sorry, I couldn't generate a solution." }]);
    } catch (error: any) {
      console.error("Copilot prompt error", error);
      setCopilotHistory(prev => [...prev, { sender: 'assistant', text: `⚠️ Error: ${error.message || 'Can not communicate with Gemini server. Please check your secrets and configurations.'}` }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const updateLibraryAsset = (assetId: string, updates: Partial<ProjectLibraryAsset>) => {
    const nextAssets = (project.libraryAssets || []).map(asset => asset.id === assetId ? { ...asset, ...updates } : asset);
    updateProject({ libraryAssets: nextAssets });
    setLibraryAssets(nextAssets);
  };

  const addLibraryAssetFromBuiltin = async (asset: LocalLibraryAsset) => {
    const existing = (project.libraryAssets || []).find(item => item.originalFileName === asset.src.split('/').pop() && item.name === asset.name);
    if (existing) {
      setSelectedLibraryAssetId(existing.id);
      setAssetInspectorTab(existing.kind === 'image' ? 'image' : 'sound');
      setActiveTab('assets');
      return;
    }

    const nextAsset = await buildAssetRecord(asset, asset.type);
    const nextAssets = [...(project.libraryAssets || []), nextAsset];
    updateProject({ libraryAssets: nextAssets });
    setLibraryAssets(nextAssets);
    setSelectedLibraryAssetId(nextAsset.id);
    setAssetInspectorTab(nextAsset.kind === 'image' ? 'image' : 'sound');
    setActiveTab('assets');
  };

  const openLibraryAsset = async (assetId: string) => {
    const asset = (project.libraryAssets || []).find(item => item.id === assetId);
    if (!asset) return;
    setSelectedLibraryAssetId(assetId);
    setAssetInspectorTab(asset.kind === 'sound' ? 'sound' : 'image');
    setActiveTab('assets');
  };

  const bakeImageAssetEdits = async (asset: ProjectLibraryAsset) => {
    if (asset.kind !== 'image') return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = asset.sourceUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not load image'));
    });

    const editor = asset.editorState?.image;
    const canvas = document.createElement('canvas');
    const rotate = editor?.rotate || 0;
    const flipX = editor?.flipX ? -1 : 1;
    const flipY = editor?.flipY ? -1 : 1;
    const swapSize = Math.abs(rotate % 180) === 90;
    canvas.width = swapSize ? img.height : img.width;
    canvas.height = swapSize ? img.width : img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipX, flipY);
    ctx.filter = `brightness(${editor?.brightness ?? 100}%) contrast(${editor?.contrast ?? 100}%) saturate(${editor?.saturation ?? 100}%) grayscale(${editor?.grayscale ?? 0}%) hue-rotate(${editor?.hueRotate ?? 0}deg) blur(${editor?.blur ?? 0}px)`;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const bakedUrl = canvas.toDataURL('image/png');
    updateLibraryAsset(asset.id, {
      sourceUrl: bakedUrl,
      editorState: makeDefaultAssetEditorState('image')
    });
    setSelectedLibraryAssetId(asset.id);
    setSaveMessage(`Applied edits to ${asset.name}`);
    setTimeout(() => setSaveMessage(null), 1800);
  };

  const previewImageStyles = (asset?: ProjectLibraryAsset): React.CSSProperties => {
    const editor = asset?.editorState?.image;
    return {
      filter: `brightness(${editor?.brightness ?? 100}%) contrast(${editor?.contrast ?? 100}%) saturate(${editor?.saturation ?? 100}%) grayscale(${editor?.grayscale ?? 0}%) hue-rotate(${editor?.hueRotate ?? 0}deg) blur(${editor?.blur ?? 0}px)`,
      transform: `rotate(${editor?.rotate ?? 0}deg) scaleX(${editor?.flipX ? -1 : 1}) scaleY(${editor?.flipY ? -1 : 1})`
    };
  };

  const addExtensionPreset = (language: ProgrammingLanguage) => {
    const preset = EXTENSION_PRESETS.find(item => item.language === language);
    if (!preset) return null;
    const nextExtension: ProjectExtension = {
      id: `ext-${Date.now()}`,
      name: preset.name,
      language: preset.language,
      enabled: true,
      code: preset.code,
      kind: 'code',
      sourceFileName: `${preset.language}-starter.${preset.language === 'javascript' ? 'js' : 'py'}`
    };
    const nextExtensions = [...(project.extensions || []), nextExtension];
    updateProject({ extensions: nextExtensions });
    setSelectedExtensionId(nextExtension.id);
    setActiveTab('assets');
    return nextExtension;
  };

  const addScratchExtensionPreset = () => {
    const nextExtension: ProjectExtension = {
      id: `ext-${Date.now()}`,
      name: 'Scratch Event Mode',
      language: 'javascript',
      enabled: true,
      code: '// Scratch Event Mode lives in the Event Editor.\n// This extension toggles the block workspace.',
      kind: 'scratch',
      sourceFileName: 'scratch-extension.json'
    };
    const nextExtensions = [...(project.extensions || []), nextExtension];
    updateProject({ extensions: nextExtensions });
    setSelectedExtensionId(nextExtension.id);
    setActiveTab('events');
    return nextExtension;
  };

  const importExtensionCode = async (file: File) => {
    const code = await file.text();
    const language: ProgrammingLanguage = file.name.endsWith('.py') ? 'python' : 'javascript';
    const nextExtension: ProjectExtension = {
      id: `ext-${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      language,
      enabled: true,
      code,
      kind: 'code',
      sourceFileName: file.name
    };
    updateProject({
      extensions: [...(project.extensions || []), nextExtension]
    });
    setSaveMessage(`Imported ${file.name}`);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const updateObject = (id: string, updates: Partial<GameObject>) => {
    updateObjects([id], updates);
  };

  const updateObjects = (ids: string[], updates: Partial<GameObject>) => {
    updateCurrentFrame({
      objects: currentFrame.objects.map(o => ids.includes(o.id) ? { ...o, ...updates } : o)
    });
  };

  const alignObjects = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedObjectIds.length < 2) return;
    
    const selectedObjects = currentFrame.objects.filter(o => selectedObjectIds.includes(o.id));
    if (selectedObjects.length < 2) return;

    let targetValue: number;

    switch (type) {
      case 'left':
        targetValue = Math.min(...selectedObjects.map(o => o.x - o.width / 2));
        const leftObjects = currentFrame.objects.map(o => 
          selectedObjectIds.includes(o.id) ? { ...o, x: targetValue + o.width / 2 } : o
        );
        updateCurrentFrame({ objects: leftObjects });
        break;
      case 'center':
        targetValue = selectedObjects.reduce((acc, o) => acc + o.x, 0) / selectedObjects.length;
        updateObjects(selectedObjectIds, { x: targetValue });
        break;
      case 'right':
        targetValue = Math.max(...selectedObjects.map(o => o.x + o.width / 2));
        const rightObjects = currentFrame.objects.map(o => 
          selectedObjectIds.includes(o.id) ? { ...o, x: targetValue - o.width / 2 } : o
        );
        updateCurrentFrame({ objects: rightObjects });
        break;
      case 'top':
        targetValue = Math.min(...selectedObjects.map(o => o.y - o.height / 2));
        const topObjects = currentFrame.objects.map(o => 
          selectedObjectIds.includes(o.id) ? { ...o, y: targetValue + o.height / 2 } : o
        );
        updateCurrentFrame({ objects: topObjects });
        break;
      case 'middle':
        targetValue = selectedObjects.reduce((acc, o) => acc + o.y, 0) / selectedObjects.length;
        updateObjects(selectedObjectIds, { y: targetValue });
        break;
      case 'bottom':
        targetValue = Math.max(...selectedObjects.map(o => o.y + o.height / 2));
        const bottomObjects = currentFrame.objects.map(o => 
          selectedObjectIds.includes(o.id) ? { ...o, y: targetValue - o.height / 2 } : o
        );
        updateCurrentFrame({ objects: bottomObjects });
        break;
    }
    saveToLocal(project, true);
  };

  const deleteObject = (ids: string | string[]) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    updateCurrentFrame({
      objects: normalizeGroups(currentFrame.objects.filter(o => !targetIds.includes(o.id))),
      events: currentFrame.events.filter(e => 
        !e.conditions.some(c => targetIds.includes(c.targetId!)) && 
        !e.actions.some(a => targetIds.includes(a.targetId))
      )
    });
    setSelectedObjectIds(prev => prev.filter(id => !targetIds.includes(id)));
    saveToLocal(project, true);
  };

  const duplicateObject = (ids: string | string[]) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    const newObjs: GameObject[] = [];
    const groupMap = new Map<string, string>();
    targetIds.forEach(id => {
      const original = currentFrame.objects.find(o => o.id === id);
      if (!original) return;
      const newObj: GameObject = {
        ...JSON.parse(JSON.stringify(original)),
        id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: `${original.name} (copy)`,
        x: original.x + 20,
        y: original.y + 20,
        groupId: original.groupId ? (groupMap.get(original.groupId) || (() => {
          const nextGroupId = makeGroupId();
          groupMap.set(original.groupId!, nextGroupId);
          return nextGroupId;
        })()) : original.groupId
      };
      newObjs.push(newObj);
    });
    
    if (newObjs.length > 0) {
      updateCurrentFrame({
        objects: normalizeGroups([...currentFrame.objects, ...newObjs])
      });
      setSelectedObjectIds(newObjs.map(o => o.id));
      saveToLocal(project, true);
    }
  };

  const copyFrame = (idx: number) => {
    setFrameClipboard(JSON.parse(JSON.stringify(project.frames[idx])));
  };

  const pasteFrame = () => {
    if (!frameClipboard) return;
    const newFrame = {
      ...JSON.parse(JSON.stringify(frameClipboard)),
      id: `frame-${Date.now()}`,
      name: `${frameClipboard.name} (paste)`
    };
    updateProject({
      frames: [...project.frames, newFrame]
    });
  };

  const addEvent = () => {
    const newEvent: GameEvent = {
      id: `event-${Date.now()}`,
      name: 'When Started',
      conditions: [{ type: 'at_start_of_frame' }],
      actions: [],
      elseActions: [],
      enabled: true
    };
    updateCurrentFrame({
      events: [...currentFrame.events, newEvent]
    });
  };

  const createEventFromBlock = (blockId: string) => {
    const now = Date.now();
    const baseEvent: GameEvent = {
      id: `event-${now}`,
      name: 'When Started',
      conditions: [],
      actions: [],
      elseActions: [],
      enabled: true
    };

    switch (blockId) {
      case 'when-started':
        baseEvent.name = 'When Started';
        baseEvent.conditions = [{ type: 'at_start_of_frame' }];
        break;
      case 'repeat':
        baseEvent.name = 'Repeat Every';
        baseEvent.conditions = [{ type: 'timer', params: { interval: 1 } }];
        break;
      case 'if-collision':
        baseEvent.name = 'If Collision';
        baseEvent.conditions = [{ type: 'collision', targetId: currentFrame.objects[0]?.id, params: { targetId2: currentFrame.objects[1]?.id } }];
        break;
      case 'if-key':
        baseEvent.name = 'If Key Pressed';
        baseEvent.conditions = [{ type: 'key_down', targetId: currentFrame.objects[0]?.id, params: { keyCode: 'ArrowRight' } }];
        break;
      case 'if-value':
        baseEvent.name = 'If Value Compare';
        baseEvent.conditions = [{ type: 'value_compare', targetId: currentFrame.objects[0]?.id, params: { valueName: project.globalValues[0]?.name || 'Score', operator: '>', value: 0 } }];
        break;
      case 'else':
        baseEvent.name = 'Else';
        baseEvent.conditions = [{ type: 'always' }];
        baseEvent.elseActions = [];
        break;
      default:
        baseEvent.name = 'New Event';
        baseEvent.conditions = [{ type: 'always' }];
        break;
    }

    updateCurrentFrame({ events: [...currentFrame.events, baseEvent] });
  };

  const appendActionToEvent = (eventId: string | null, targetId: string | null, actionType: ActionType, branch: 'actions' | 'elseActions' = 'actions') => {
    if (!eventId) return;
    const newAction: GameAction = {
      id: `act-${Date.now()}`,
      type: actionType,
      targetId: targetId || '',
      params: actionType === 'change_color'
        ? { color: '#ef4444' }
        : actionType === 'play_sound'
          ? { valueName: 'https://www.soundjay.com/buttons/sounds/button-3.mp3' }
          : { value: 1, valueName: 'Value 1' }
    };

    updateCurrentFrame({
      events: currentFrame.events.map(ev => ev.id === eventId
        ? { ...ev, [branch]: [...(ev[branch] || []), newAction] }
        : ev)
    });
  };

  const openShapePickerForTarget = (targetId: string | null, mode: 'library' | 'custom' = 'library') => {
    setShapePickerTargetId(targetId);
    setShapePickerMode(mode);
    setShapeBuilderTool('reshape');
    setSelectedShapePointIndices([]);
    if (mode === 'custom') {
      const source = targetId ? currentFrame.objects.find(obj => obj.id === targetId) : null;
      let initialPoints: CustomShapePoint[] = [];
      let initialName = source?.customShape?.name || source?.name || `Shape ${((project.customShapes?.length || 0) + 1)}`;
      let libraryId = source?.customShape?.id;

      if (source?.customShape?.points?.length) {
        initialPoints = source.customShape.points.map(point => ({ ...point }));
      } else if (source?.shapeType) {
        const clipPath = getShapeClipPath(source.shapeType) || 'inset(0%)';
        initialPoints = getPointsFromClipPath(clipPath);
      } else {
        initialPoints = createDefaultCustomShapeDraft().points;
      }

      setCustomShapeDraft({
        name: initialName,
        points: initialPoints,
        fill: source?.color || '#3b82f6',
        libraryId
      });
    }
    setShapePickerOpen(true);
  };

  const snapToEditorGrid = (val: number) => {
    if (!editorSnapToGrid) return Math.round(val * 10) / 10;
    return Math.round(val / editorGridSize) * editorGridSize;
  };

  const updateCustomShapePoint = (index: number, nextPoint: Partial<CustomShapePoint>) => {
    setCustomShapeDraft(prev => {
      if (!prev) return prev;
      const points = [...prev.points];
      const oldPoint = points[index];
      const updatedPoint = { 
        ...oldPoint, 
        ...nextPoint, 
        x: clampPercent(nextPoint.x !== undefined ? snapToEditorGrid(nextPoint.x) : oldPoint.x), 
        y: clampPercent(nextPoint.y !== undefined ? snapToEditorGrid(nextPoint.y) : oldPoint.y) 
      };
      points[index] = updatedPoint;

      // Symmetry Logic
      if (editorSymmetryX || editorSymmetryY) {
        const dx = updatedPoint.x - oldPoint.x;
        const dy = updatedPoint.y - oldPoint.y;

        if (editorSymmetryX) {
          const targetX = 100 - updatedPoint.x;
          const partnerIndex = points.findIndex((p, i) => i !== index && Math.abs(p.x - targetX) < 1 && Math.abs(p.y - updatedPoint.y) < 5);
          if (partnerIndex !== -1) {
             points[partnerIndex] = { ...points[partnerIndex], x: targetX, y: updatedPoint.y };
          }
        }
      }

      return { ...prev, points };
    });
  };

  const addCustomShapePoint = () => {
    setCustomShapeDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, { x: 50, y: 50, curve: 'corner' }]
      };
    });
  };

  const addCustomShapePointAt = (x: number, y: number) => {
    const snappedX = snapToEditorGrid(x);
    const snappedY = snapToEditorGrid(y);
    setCustomShapeDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, { x: clampPercent(snappedX), y: clampPercent(snappedY), curve: 'corner' }]
      };
    });
  };

  const removeCustomShapePoint = (index: number) => {
    setCustomShapeDraft(prev => {
      if (!prev || prev.points.length <= 3) return prev;
      return {
        ...prev,
        points: prev.points.filter((_, pointIndex) => pointIndex !== index)
      };
    });
  };

  const removeNearestCustomShapePointAt = (x: number, y: number) => {
    setCustomShapeDraft(prev => {
      if (!prev || prev.points.length <= 3) return prev;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      prev.points.forEach((point, index) => {
        const dx = point.x - x;
        const dy = point.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      return {
        ...prev,
        points: prev.points.filter((_, index) => index !== nearestIndex)
      };
    });
  };

  const updateCustomShapePointCurve = (index: number, curve: 'corner' | 'smooth') => {
    setCustomShapeDraft(prev => {
      if (!prev) return prev;
      const points = prev.points.map((point, pointIndex) => {
        if (pointIndex !== index) return point;
        const nextPoint = { ...point, curve };
        if (curve === 'smooth') {
          const prevPoint = prev.points[index - 1] || prev.points[prev.points.length - 1];
          const nextNeighbor = prev.points[index + 1] || prev.points[0];
          const leftDx = prevPoint ? (nextPoint.x - prevPoint.x) / 6 : 8;
          const leftDy = prevPoint ? (nextPoint.y - prevPoint.y) / 6 : 0;
          const rightDx = leftDx;
          const rightDy = leftDy;
          nextPoint.handleIn = { x: clampPercent(point.x - rightDx), y: clampPercent(point.y - rightDy) };
          nextPoint.handleOut = { x: clampPercent(point.x + rightDx), y: clampPercent(point.y + rightDy) };
        } else {
          delete nextPoint.handleIn;
          delete nextPoint.handleOut;
        }
        return nextPoint;
      });
      return { ...prev, points };
    });
  };

  const handleShapeCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!customShapeDraft || !shapePreviewRef.current) return;
    const rect = shapePreviewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

    if (shapeBuilderTool === 'add') {
      const edge = findNearestEdge(x, y);
      if (edge) {
         setCustomShapeDraft(prev => {
            if (!prev) return prev;
            const newPoints = [...prev.points];
            newPoints.splice(edge.index + 1, 0, { x: clampPercent(edge.x), y: clampPercent(edge.y), curve: 'corner' });
            return { ...prev, points: newPoints };
         });
         setSelectedShapePointIndices([edge.index + 1]);
      } else {
        addCustomShapePointAt(x, y);
        setSelectedShapePointIndices([customShapeDraft.points.length]);
      }
      return;
    }

    if (shapeBuilderTool === 'delete') {
      removeNearestCustomShapePointAt(x, y);
      setSelectedShapePointIndices([]);
      return;
    }

    if (shapeBuilderTool === 'select') {
      setIsBoxSelecting(true);
      setBoxSelectStart({ x, y });
      setBoxSelectEnd({ x, y });
      if (!event.shiftKey) setSelectedShapePointIndices([]);
      return;
    }

    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    customShapeDraft.points.forEach((point, index) => {
      const dx = point.x - x;
      const dy = point.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestDistance <= 6) {
      if (event.shiftKey) {
        setSelectedShapePointIndices(prev => 
          prev.includes(nearestIndex) ? prev.filter(i => i !== nearestIndex) : [...prev, nearestIndex]
        );
      } else {
        if (!selectedShapePointIndices.includes(nearestIndex)) {
           setSelectedShapePointIndices([nearestIndex]);
        }
      }
      startDraggingShapePoint(nearestIndex, x, y);
    } else {
      if (!event.shiftKey) setSelectedShapePointIndices([]);
    }
  };

  const startDraggingShapePoint = (index: number, mouseX: number, mouseY: number) => {
    if (!customShapeDraft) return;
    setDraggingShapePointIndex(index);
    setDragStartPoint({ x: mouseX, y: mouseY });
    setInitialDragPoints([...customShapeDraft.points]);
  };

  const startDraggingShapeHandle = (pointIndex: number, handle: 'in' | 'out') => {
    setDraggingShapeHandle({ pointIndex, handle });
    setDraggingShapePointIndex(null);
  };


  useEffect(() => {
    if (draggingShapePointIndex === null && !draggingShapeHandle && !isBoxSelecting) return;
    
    let initialPoints: CustomShapePoint[] = [];
    if (draggingShapePointIndex !== null && customShapeDraft) {
      initialPoints = [...customShapeDraft.points];
    }

    const updateFromPointer = (clientX: number, clientY: number) => {
      const rect = shapePreviewRef.current?.getBoundingClientRect();
      if (!rect || !customShapeDraft) return;
      const x = clampPercent(((clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((clientY - rect.top) / rect.height) * 100);
      
      if (isBoxSelecting) {
        setBoxSelectEnd({ x, y });
        // Selection logic: check which points are inside the drag box
        if (boxSelectStart) {
          const xmin = Math.min(boxSelectStart.x, x);
          const xmax = Math.max(boxSelectStart.x, x);
          const ymin = Math.min(boxSelectStart.y, y);
          const ymax = Math.max(boxSelectStart.y, y);
          
          const newIndices = customShapeDraft.points
            .map((p, i) => (p.x >= xmin && p.x <= xmax && p.y >= ymin && p.y <= ymax) ? i : -1)
            .filter(i => i !== -1);
          setSelectedShapePointIndices(newIndices);
        }
        return;
      }

      if (draggingShapeHandle) {
        setCustomShapeDraft(prev => {
          if (!prev) return prev;
          const points = prev.points.map((point, index) => {
            if (index !== draggingShapeHandle.pointIndex) return point;
            return {
              ...point,
              curve: 'smooth',
              [draggingShapeHandle.handle === 'in' ? 'handleIn' : 'handleOut']: { x, y }
            };
          });
          return { ...prev, points };
        });
        return;
      }

      if (draggingShapePointIndex !== null && dragStartPoint && initialDragPoints.length > 0) {
        const dx = x - dragStartPoint.x;
        const dy = y - dragStartPoint.y;

        if (dx === 0 && dy === 0) return;

        setCustomShapeDraft(prev => {
          if (!prev) return prev;
          const points = prev.points.map((p, i) => {
            if (selectedShapePointIndices.includes(i) || i === draggingShapePointIndex) {
              const initial = initialDragPoints[i];
              if (!initial) return p;
              return { 
                ...p, 
                x: clampPercent(snapToEditorGrid(initial.x + dx)), 
                y: clampPercent(snapToEditorGrid(initial.y + dy)) 
              };
            }
            return p;
          });
          return { ...prev, points };
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    };
    const stopDrag = () => {
      setDraggingShapePointIndex(null);
      setDraggingShapeHandle(null);
      setIsBoxSelecting(false);
      setBoxSelectStart(null);
      setBoxSelectEnd(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, [draggingShapePointIndex, draggingShapeHandle, customShapeDraft?.points.length, selectedShapePointIndices]);

  const stopDraggingShapePoint = () => {
    setDraggingShapePointIndex(null);
    setDraggingShapeHandle(null);
    setDragStartPoint(null);
    setInitialDragPoints([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shapePickerOpen || shapePickerMode !== 'custom') return;
      const target = e.target as HTMLElement;
      if (
        target && 
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapePointIndices.length > 0) {
        setCustomShapeDraft(prev => {
          if (!prev) return prev;
          const remaining = prev.points.filter((_, i) => !selectedShapePointIndices.includes(i));
          if (remaining.length < 3) return prev; 
          return { ...prev, points: remaining };
        });
        setSelectedShapePointIndices([]);
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedShapePointIndices.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        setCustomShapeDraft(prev => {
          if (!prev) return prev;
          const points = prev.points.map((p, i) => {
            if (selectedShapePointIndices.includes(i)) {
              return { 
                ...p, 
                x: clampPercent(p.x + dx), 
                y: clampPercent(p.y + dy) 
              };
            }
            return p;
          });
          return { ...prev, points };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shapePickerOpen, shapePickerMode, selectedShapePointIndices]);

  const [edgeHover, setEdgeHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const findNearestEdge = (x: number, y: number) => {
    if (!customShapeDraft || customShapeDraft.points.length < 2) return null;
    let minSnapDistance = 5;
    let best = null;

    for (let i = 0; i < customShapeDraft.points.length; i++) {
        const p1 = customShapeDraft.points[i];
        const p2 = customShapeDraft.points[(i + 1) % customShapeDraft.points.length];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        
        const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / lenSq));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
        if (dist < minSnapDistance) {
            minSnapDistance = dist;
            best = { index: i, x: projX, y: projY };
        }
    }
    return best;
  };

  const applyCustomShapeDraft = () => {
    if (!shapePickerTargetId || !customShapeDraft) return;
    const target = currentFrame.objects.find(obj => obj.id === shapePickerTargetId);
    if (!target) return;

    const customShape: CustomShapeDefinition = {
      id: customShapeDraft.libraryId || `custom-${Date.now()}`,
      name: customShapeDraft.name.trim() || 'Custom Shape',
      kind: 'polygon',
      points: customShapeDraft.points.map(point => ({
        x: clampPercent(point.x),
        y: clampPercent(point.y),
        curve: point.curve,
        handleIn: point.handleIn ? { x: clampPercent(point.handleIn.x), y: clampPercent(point.handleIn.y) } : undefined,
        handleOut: point.handleOut ? { x: clampPercent(point.handleOut.x), y: clampPercent(point.handleOut.y) } : undefined
      }))
    };

    updateObject(shapePickerTargetId, {
      shapeType: 'custom',
      customShape,
      color: customShapeDraft.fill || target.color
    });

    // Save to project custom shapes library
    const existingIdx = project.customShapes?.findIndex(s => s.id === customShape.id);
    const libraryShape = { ...customShape, fill: customShapeDraft.fill || target.color, createdAt: new Date().toISOString() };
    
    if (existingIdx !== undefined && existingIdx !== -1) {
      const nextLibrary = [...(project.customShapes || [])];
      nextLibrary[existingIdx] = libraryShape;
      updateProject({ customShapes: nextLibrary });
    } else {
      updateProject({ customShapes: [...(project.customShapes || []), libraryShape] });
    }

    setShapePickerOpen(false);
    setShapePickerTargetId(null);
    setShapePickerMode('library');
    setCustomShapeDraft(null);
  };

  const saveCustomShapeTemplate = () => {
    if (!customShapeDraft) return;
    const templateId = makeUniqueId('custom-shape');
    const nextTemplate = {
      id: templateId,
      name: customShapeDraft.name.trim() || `Custom Shape ${((project.customShapes?.length || 0) + 1)}`,
      kind: 'polygon' as const,
      fill: customShapeDraft.fill || '#3b82f6',
      createdAt: new Date().toISOString(),
      points: customShapeDraft.points.map(point => ({
        x: clampPercent(point.x),
        y: clampPercent(point.y),
        curve: point.curve,
        handleIn: point.handleIn ? { x: clampPercent(point.handleIn.x), y: clampPercent(point.handleIn.y) } : undefined,
        handleOut: point.handleOut ? { x: clampPercent(point.handleOut.x), y: clampPercent(point.handleOut.y) } : undefined
      }))
    };
    updateProject({ customShapes: [...(project.customShapes || []), nextTemplate] });
  };

  const loadCustomShapeTemplate = (shape: CustomShapeDefinition) => {
    setCustomShapeDraft({
      name: shape.name || 'Custom Shape',
      fill: shape.fill || '#3b82f6',
      points: shape.points.map(point => ({
        x: clampPercent(point.x),
        y: clampPercent(point.y),
        curve: point.curve,
        handleIn: point.handleIn ? { x: clampPercent(point.handleIn.x), y: clampPercent(point.handleIn.y) } : undefined,
        handleOut: point.handleOut ? { x: clampPercent(point.handleOut.x), y: clampPercent(point.handleOut.y) } : undefined
      }))
    });
    setShapePickerMode('custom');
    setShapeBuilderTool('reshape');
  };

  const getConditionBlockLabel = (condition: GameCondition) => {
    switch (condition.type) {
      case 'at_start_of_frame':
        return 'When Started';
      case 'timer':
        return `Repeat Every ${condition.params?.interval || 1}s`;
      case 'collision':
        return 'If Collision';
      case 'key_down':
        return `If Key Pressed (${condition.params?.keyCode || 'Key'})`;
      case 'screen_edge':
        return `If Touching ${condition.params?.edge || 'Edge'}`;
      case 'value_compare':
        return `If ${condition.params?.valueName || 'Value'} ${condition.params?.operator || '=='} ${condition.params?.value ?? 0}`;
      case 'always':
        return 'When Running';
      default:
        return condition.type.replace(/_/g, ' ');
    }
  };

  const getActionBlockLabel = (action: GameAction) => {
    switch (action.type) {
      case 'move_x':
        return `Move X by ${action.params?.value ?? 5}`;
      case 'move_y':
        return `Move Y by ${action.params?.value ?? 5}`;
      case 'add_x':
        return `Add X ${action.params?.value ?? 5}`;
      case 'add_y':
        return `Add Y ${action.params?.value ?? 5}`;
      case 'set_x':
        return `Set X ${action.params?.value ?? 0}`;
      case 'set_y':
        return `Set Y ${action.params?.value ?? 0}`;
      case 'bounce':
        return 'Bounce';
      case 'destroy':
        return 'Delete';
      case 'change_color':
        return `Set Color`;
      case 'play_sound':
        return 'Play Sound';
      case 'add_global_value':
        return 'Increase Global Value';
      case 'sub_global_value':
        return 'Decrease Global Value';
      case 'set_global_value':
        return 'Set Global Value';
      case 'set_visible':
        return 'Set Visible';
      case 'set_value':
        return 'Set Value';
      case 'add_value':
        return 'Add Value';
      case 'next_frame':
        return 'Next Frame';
      case 'previous_frame':
        return 'Previous Frame';
      case 'set_text':
        return 'Set Text';
      default:
        return String(action.type).replace(/_/g, ' ');
    }
  };

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden select-none transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#F2F2F7] text-slate-900'}`}>
      {/* Desktop Toolbar */}
      <nav className={`h-14 border-b flex items-center justify-between px-4 shrink-0 z-50 relative ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center h-full">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 pr-6 mr-4 border-r border-slate-200 h-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black tracking-tighter leading-none">ABCSTUDIO</span>
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">Engine v2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-1 h-full py-2">
            {/* Group: File */}
            <div className="flex items-center gap-1 px-1 border-r border-slate-200 h-2/3">
              <ToolbarButton 
                icon={<Plus className="w-3.5 h-3.5" />} 
                label="New" 
                onClick={triggerNewProjectFlow}
              />
              <ToolbarButton 
                icon={<Home className="w-3.5 h-3.5" />} 
                label="Home" 
                active={activeTab === 'home'} 
                onClick={() => setActiveTab('home')}
              />
              <ToolbarButton 
                icon={<Save className="w-3.5 h-3.5" />} 
                label="Save" 
                onClick={() => saveToLocal(project)}
              />
              <ToolbarButton 
                icon={<Download className="w-3.5 h-3.5" />} 
                label="Export" 
                title="Export project data to a .zip file"
                onClick={exportProjectToZip}
              />
              <ToolbarButton 
                icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} 
                label="Delete" 
                title="Delete current project forever"
                onClick={() => requestDeleteProject(project.id, project.name)}
              />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importProjectFromZip(file);
                e.target.value = '';
              }}
            />
          </div>

            <div className="flex items-center gap-1 px-1 border-r border-slate-200 h-2/3">
              <ToolbarButton 
                icon={<Undo2 className="w-3.5 h-3.5" />} 
                label="Undo" 
                onClick={undo}
                disabled={history.past.length === 0}
              />
              <ToolbarButton 
                icon={<RotateCcw className="rotate-180 w-3.5 h-3.5" />} 
                label="Redo" 
                onClick={redo}
                disabled={history.future.length === 0}
              />
            </div>

            {/* Group: Navigation */}
            <div className="flex items-center gap-1 px-1 border-r border-slate-200 h-2/3">
              <ToolbarButton 
                icon={<Grid2X2 className="w-3.5 h-3.5" />} 
                label="Storyboard" 
                active={activeTab === 'storyboard'} 
                onClick={() => setActiveTab('storyboard')} 
              />
              <ToolbarButton 
                icon={<Maximize2 className="w-3.5 h-3.5" />} 
                label="Editor" 
                active={activeTab === 'stage'} 
                onClick={() => setActiveTab('stage')} 
              />
              <ToolbarButton 
                icon={<FileCode className="w-3.5 h-3.5" />} 
                label="Logic" 
                title={scratchExtensionEnabled ? 'Scratch blocks editor' : 'Legacy event list'}
                active={scratchExtensionEnabled ? activeTab === 'events' : activeTab === 'grid'} 
                onClick={() => setActiveTab(scratchExtensionEnabled ? 'events' : 'grid')} 
              />
              <ToolbarButton 
                icon={<ImageIcon className="w-3.5 h-3.5" />} 
                label="Assets" 
                active={activeTab === 'assets'} 
                onClick={() => setActiveTab('assets')} 
              />
            </div>
          
          <div className="hidden xl:flex items-center px-3 border-l border-slate-200 dark:border-slate-800 ml-2">
             <input 
              type="text" 
              value={project.name}
              onChange={(e) => updateProject({ name: e.target.value })}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 focus:text-indigo-600 bg-slate-100/50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-transparent focus:border-indigo-500/35 outline-none transition-all w-56 md:w-72"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pr-2">
          {saveMessage && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-[8px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}
            >
              {saveMessage}
            </motion.div>
          )}

          <button 
             onClick={() => setModalState({ type: 'settings', eventId: null, targetId: null })}
             className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all active:scale-95 shrink-0 ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-700' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'}`}
             title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setActiveTab('play')}
              className="flex items-center gap-2 px-6 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              title="Run Frame (F5)"
            >
              <Play className="w-3 h-3 fill-current" />
              RUN
            </button>
          </div>
        </div>
      </nav>

      {/* Main Desktop Layout */}
      <main 
        className={`flex-1 flex overflow-hidden ${settings.theme === 'dark' ? 'bg-slate-900' : ''}`}
        onKeyDown={(e) => {
          const activeEl = document.activeElement as HTMLElement;
          const isTyping = activeEl && (
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || 
            activeEl.isContentEditable
          );
          if (isTyping) return;

          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedObjectId) {
              deleteObject(selectedObjectId);
            }
          }
          if ((e.ctrlKey || e.metaKey)) {
            if (e.key === 'd' && selectedObjectId) {
              e.preventDefault();
              duplicateObject(selectedObjectId);
            }
            if (e.key === 'c' && selectedObjectId) {
              e.preventDefault();
              const obj = currentFrame.objects.find(o => o.id === selectedObjectId);
              if (obj) setObjectClipboard(JSON.parse(JSON.stringify(obj)));
            }
            if (e.key === 'v' && objectClipboard) {
              e.preventDefault();
              const newObj: GameObject = {
                ...JSON.parse(JSON.stringify(objectClipboard)),
                id: `obj-${Date.now()}`,
                x: objectClipboard.x + 20,
                y: objectClipboard.y + 20,
                name: `${objectClipboard.name} (copy)`
              };
              updateCurrentFrame({
                objects: [...currentFrame.objects, newObj]
              });
              setSelectedObjectId(newObj.id);
            }
            if (e.key === 'z') {
              e.preventDefault();
              undo();
            }
            if (e.key === 'y') {
              e.preventDefault();
              redo();
            }
          }
        }}
        tabIndex={0} // Make it focusable for shortcuts
      >
        {/* Left Sidebar: Navigation/Explorer */}
        <aside 
          className={`w-64 border-r flex flex-col shrink-0 overflow-y-auto scrollbar-hide ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-[#fcfcfc] border-slate-200'}`}
          onContextMenu={(e) => handleContextMenu(e, 'sidebar')}
        >
          <div className={`p-6 border-b flex flex-col shrink-0 ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
             <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Navigation</h3>
             </div>
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 mb-2.5 shadow-sm active:scale-95 ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-slate-900 text-white hover:bg-black'}`}
            >
              <Home className="w-4 h-4" />
              Main Hub
            </button>
            <button 
              onClick={triggerNewProjectFlow}
              className={`w-full py-2.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${settings.theme === 'dark' ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              + Create Project
            </button>
          </div>
          
          <div className={`p-6 border-b flex flex-col shrink-0 transition-colors ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`} onContextMenu={(e) => handleContextMenu(e, 'sidebar')}>
            <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full shadow-lg ${settings.theme === 'dark' ? 'bg-indigo-400 shadow-indigo-400/20' : 'bg-indigo-600 shadow-indigo-600/20'}`} />
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Runtime State</h3>
             </div>
            <div className="space-y-2">
              {project.globalValues?.map((val, idx) => (
                <div 
                  key={val.id} 
                  className={`flex items-center gap-3 px-3 py-2 border rounded-xl text-[10px] transition-all shadow-sm group ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-slate-200/50'}`}
                  onContextMenu={(e) => handleContextMenu(e, 'globalValue', val.id)}
                >
                   <div className={`font-black text-[11px] group-hover:scale-110 transition-transform ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>$</div>
                   <input 
                    value={val.name}
                    onChange={(e) => {
                      const newVals = [...(project.globalValues || [])];
                      newVals[idx].name = e.target.value;
                      updateProject({ globalValues: newVals });
                    }}
                    className={`flex-1 bg-transparent border-none p-0 focus:ring-0 outline-none truncate font-bold ${settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}
                    placeholder="VAR_NAME"
                   />
                   <input 
                    type="number"
                    value={val.value}
                    onChange={(e) => {
                      const newVals = [...(project.globalValues || [])];
                      newVals[idx].value = parseInt(e.target.value) || 0;
                      updateProject({ globalValues: newVals });
                    }}
                    className={`w-14 bg-transparent border-none p-0 focus:ring-0 outline-none text-right font-mono font-bold ${settings.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}
                   />
                </div>
              ))}
              <button 
                onClick={() => {
                  const newVals = [...(project.globalValues || []), { id: `gv-${Date.now()}`, name: `Value ${project.globalValues?.length || 0 + 1}`, value: 0 }];
                  updateProject({ globalValues: newVals });
                }}
                className={`w-full py-2.5 text-[9px] font-black tracking-widest border border-dashed rounded-xl transition-all mt-2 uppercase active:scale-[0.98] ${settings.theme === 'dark' ? 'text-slate-500 border-slate-800 hover:bg-slate-800 hover:text-slate-400 hover:border-slate-700' : 'text-slate-400 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}
              >
                + Register Variable
              </button>
            </div>
          </div>
          
          <div className={`p-6 border-b flex flex-col shrink-0 transition-colors ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`} onContextMenu={(e) => handleContextMenu(e, 'sidebar')}>
            <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full shadow-lg ${settings.theme === 'dark' ? 'bg-indigo-400 shadow-indigo-400/20' : 'bg-indigo-600 shadow-indigo-600/20'}`} />
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Workspace Explorer</h3>
             </div>
            <div className="space-y-1.5">
              <NavItem 
                icon={<Database className="w-4 h-4" />} 
                label="Infrastructure" 
                active={false} 
                theme={settings.theme}
                onClick={() => setActiveTab('grid')}
              />
              <NavItem 
                icon={<Monitor className="w-4 h-4" />} 
                label="Environment" 
                theme={settings.theme}
                active={activeTab === 'storyboard'} 
                onClick={() => setActiveTab('storyboard')}
              />
              <div className={`ml-4 space-y-2 mt-3 border-l-2 pl-3 transition-colors ${settings.theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                {project.frames.map((frame, idx) => (
                  <button 
                    key={frame.id}
                    onClick={() => {
                      updateProject({ currentFrameIndex: idx });
                      setActiveTab('stage');
                    }}
                    onContextMenu={(e) => handleContextMenu(e, 'frame', frame.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[10px] font-black transition-all group ${project.currentFrameIndex === idx ? (settings.theme === 'dark' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 ring-1 ring-indigo-400' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 active:scale-95') : (settings.theme === 'dark' ? 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                  >
                    <Layout className={`w-4 h-4 transition-colors ${project.currentFrameIndex === idx ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate uppercase tracking-wider">{frame.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-6" onContextMenu={(e) => handleContextMenu(e, 'sidebar')}>
            <div className="flex items-center gap-2 mb-5">
                <div className={`w-2 h-2 rounded-full shadow-lg ${settings.theme === 'dark' ? 'bg-indigo-400 shadow-indigo-400/20' : 'bg-indigo-600 shadow-indigo-600/20'}`} />
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Entity Hierarchy</h3>
             </div>
            <div className="space-y-4">
              {customFrameObjects.length > 0 && (
                <div className={`rounded-[28px] border overflow-hidden shadow-xl transition-all ${settings.theme === 'dark' ? 'bg-indigo-600/5 border-indigo-500/20 shadow-black/20' : 'bg-indigo-50 shadow-indigo-600/5 border-indigo-100'}`}>
                  <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${settings.theme === 'dark' ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-indigo-100/60 border-indigo-100'}`}>
                    <div className="flex items-center gap-2">
                      <Package className={`w-3 h-3 ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}>Custom Library</span>
                    </div>
                    <span className={`text-[10px] font-black ${settings.theme === 'dark' ? 'text-indigo-400/60' : 'text-indigo-600/60'}`}>{customFrameObjects.length}</span>
                  </div>
                  <div className="p-2.5 space-y-2">
                    {customFrameObjects.map(obj => (
                      <div 
                        key={obj.id}
                        onClick={() => {
                          setSelectedObjectId(obj.id);
                          setActiveTab('stage');
                        }}
                        onContextMenu={(e) => handleContextMenu(e, 'object', obj.id)}
                        role="button"
                        tabIndex={0}
                        className={`w-full flex items-center group/item gap-3 px-3 py-2.5 rounded-2xl text-[10px] font-bold transition-all cursor-pointer ${selectedObjectId === obj.id ? (settings.theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white shadow-md ring-1 ring-indigo-200 text-indigo-600') : (settings.theme === 'dark' ? 'text-indigo-300 hover:bg-white/5 hover:text-white' : 'text-indigo-700 hover:bg-white hover:text-indigo-900 border border-transparent hover:border-indigo-100')}`}
                      >
                        <div className={`w-7 h-7 flex items-center justify-center rounded-xl bg-white border border-indigo-100 shadow-sm shrink-0 group-hover/item:scale-110 transition-transform ${selectedObjectId === obj.id ? 'opacity-100' : 'opacity-80'}`}>
                          {obj.imageUrl && <ImageIcon className="w-4 h-4 text-indigo-500" />}
                          {obj.shapeType && <Square className="w-4 h-4 text-indigo-500" />}
                          {!obj.imageUrl && !obj.shapeType && <Activity className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <span className="truncate flex-1 text-left uppercase tracking-tight">{obj.name}</span>
                        <div className="flex gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { isVisible: !obj.isVisible }); }}
                            className={`p-1.5 rounded-xl hover:bg-indigo-100/20 active:scale-90 transition-all ${obj.isVisible ? 'text-indigo-400' : 'text-indigo-600'}`}
                          >
                            {obj.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {standardFrameObjects.map(obj => (
                  <div 
                    key={obj.id}
                    onClick={() => {
                      setSelectedObjectId(obj.id);
                      setActiveTab('stage');
                    }}
                    onContextMenu={(e) => handleContextMenu(e, 'object', obj.id)}
                    role="button"
                    tabIndex={0}
                    className={`w-full flex items-center group/item gap-3 px-3 py-2.5 rounded-2xl text-[10px] font-bold transition-all cursor-pointer ${selectedObjectIds.includes(obj.id) ? (settings.theme === 'dark' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-indigo-400' : 'bg-white shadow-xl ring-1 ring-slate-200 text-indigo-600') : (settings.theme === 'dark' ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-200 border border-transparent' : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 border border-transparent hover:border-slate-100')}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl shadow-sm shrink-0 transition-all group-hover/item:scale-110 ${selectedObjectIds.includes(obj.id) ? (settings.theme === 'dark' ? 'bg-white/10' : 'bg-indigo-50 border border-indigo-100') : (settings.theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100')}`}>
                      {obj.type === 'active' && <Box className={`w-4 h-4 ${selectedObjectIds.includes(obj.id) ? 'text-white' : 'text-indigo-500'}`} />}
                      {obj.type === 'string' && <Type className={`w-4 h-4 ${selectedObjectIds.includes(obj.id) ? 'text-white' : 'text-indigo-500'}`} />}
                      {obj.movement.physics?.enabled && <Zap className="w-4 h-4 text-amber-400 animate-pulse" />}
                    </div>
                    <span className="truncate flex-1 text-left uppercase tracking-wider font-black">{obj.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { isVisible: !obj.isVisible }); }}
                        className={`p-1.5 rounded-lg transition-all ${obj.isVisible ? 'text-slate-400' : 'text-indigo-400'}`}
                      >
                        {obj.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); updateObject(obj.id, { isLocked: !obj.isLocked }); }}
                        className={`p-1.5 rounded-lg transition-all ${obj.isLocked ? 'text-indigo-400' : 'text-slate-400'}`}
                      >
                        {obj.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 space-y-2.5">
                <button 
                  onClick={() => {
                    const targetId = selectedObjectId || addObject('active');
                    openShapePickerForTarget(targetId, 'custom');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed active:scale-95 shadow-sm group ${settings.theme === 'dark' ? 'text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/30' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 shadow-indigo-600/5 border-indigo-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Square className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Asset Forge
                  </div>
                  <Plus className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                </button>
                <button 
                  onClick={() => addObject('active')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed active:scale-95 group ${settings.theme === 'dark' ? 'text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-white border-slate-700' : 'text-slate-500 bg-white hover:text-indigo-600 hover:shadow-md border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3">
                    <Box className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    New Sprite
                  </div>
                  <Plus className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                </button>
                <button 
                  onClick={() => addObject('string')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-dashed active:scale-95 group ${settings.theme === 'dark' ? 'text-slate-400 bg-slate-800/50 hover:bg-slate-800 hover:text-white border-slate-700' : 'text-slate-500 bg-white hover:text-emerald-600 hover:shadow-md border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-center gap-3">
                    <Type className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    New Label
                  </div>
                  <Plus className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                </button>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Library</div>
                    <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Global Assets</div>
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">{(project.libraryAssets || []).length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(project.libraryAssets || []).map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => void openLibraryAsset(asset.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50/50 text-[9px] font-black uppercase tracking-tight text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                    >
                      {asset.kind === 'image' ? 'IMG' : 'SND'} {asset.name}
                    </button>
                  ))}
                  {(!project.libraryAssets || project.libraryAssets.length === 0) && (
                    <div className="text-[9px] font-black text-slate-300 uppercase italic">Empty stack</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
               key="home"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-slate-950 p-12 scrollbar-hide"
            >
              <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-[20px] flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                        <Zap className="w-6 h-6 text-white fill-current" />
                      </div>
                      <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Main Hub</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight text-lg max-w-xl">Your creative archive, managed from one central command center. Build, expand, and connect.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={triggerNewProjectFlow}
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[22px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3"
                    >
                      <Plus className="w-5 h-5" />
                      Construct New Base
                    </button>
                    <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-[22px] text-xs font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                  <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm group hover:border-indigo-200 transition-all">
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2">Projects</div>
                    <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{localProjects.length}</div>
                    <div className="mt-4 text-sm font-medium text-slate-500 leading-relaxed">Portable project archives stored safely in your browser.</div>
                  </div>
                  <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-indigo-600 p-8 shadow-2xl shadow-indigo-600/20 text-white flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-200 mb-2">Active Session</div>
                      <div className="text-3xl xl:text-4xl font-black tracking-tighter break-words leading-none mb-3">{project.name || 'Untitled Engine'}</div>
                    </div>
                    <div className="text-sm font-medium text-indigo-100 leading-relaxed">Ready to deploy. Last modification recorded successfully.</div>
                  </div>
                  <div className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm group hover:border-emerald-200 transition-all">
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2">Engine Version</div>
                    <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">v2.0</div>
                    <div className="mt-4 text-sm font-medium text-slate-500 leading-relaxed">High-performance physics engine with Matter.js integration.</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 px-4">
                    <div className="flex gap-8">
                      <button 
                        onClick={() => setHubTab("projects")}
                        className={`text-[11px] font-black uppercase tracking-[0.4em] pb-2 transition-all border-b-2 ${hubTab === "projects" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                      >
                        Library Archive ({localProjects.length})
                      </button>
                      <button 
                        onClick={() => setHubTab("templates")}
                        className={`text-[11px] font-black uppercase tracking-[0.4em] pb-2 transition-all border-b-2 ${hubTab === "templates" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                      >
                        Demo Templates Showcase
                      </button>
                    </div>
                  </div>

                  {hubTab === "projects" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24">
                      {localProjects.map(p => (
                        <motion.div 
                          key={p.id}
                          whileHover={{ y: -6 }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              type: "project",
                              data: p.id
                            });
                          }}
                          className={`group relative overflow-hidden rounded-[36px] border transition-all ${p.id === project.id ? "border-indigo-500 shadow-2xl shadow-indigo-600/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xl hover:border-indigo-300"}`}
                        >
                          <div className="p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center transition-all ${p.id === project.id ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                                <Box className="w-8 h-8" />
                              </div>
                              <div className="space-y-2 max-w-[320px] md:max-w-[450px]">
                                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white break-words leading-tight">{p.name || "Unnamed Base"}</h1>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Updated {new Date(p.updatedAt || 0).toLocaleDateString()}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${p.format === "zip" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500"}`}>
                                    {p.format === "zip" ? "DEPLOYABLE" : "LEGACY"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => {
                                  if (p.id !== project.id) {
                                    saveToLocal(project);
                                    loadLocalProject(p.id);
                                  }
                                  setActiveTab("stage");
                                }}
                                className={`px-8 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${p.id === project.id ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-900 text-white hover:bg-black active:scale-95"}`}
                              >
                                {p.id === project.id ? "Resume Context" : "Connect"}
                              </button>
                              <button 
                                 onClick={() => requestDeleteProject(p.id, p.name)}
                                 className="p-3.5 rounded-[20px] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          
                          {p.id === project.id && (
                            <div className="absolute top-0 right-10 px-4 py-1.5 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-b-xl shadow-lg ring-1 ring-white/10">
                              Current Session
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {localProjects.length === 0 && (
                        <div className="col-span-full py-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[48px] flex flex-col items-center justify-center space-y-8 bg-white/40 dark:bg-slate-900/10">
                          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[36px] flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <Folder className="w-12 h-12" />
                          </div>
                          <div className="text-center space-y-3">
                            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white opacity-40">The Archive is Silent</h3>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Initiate a new construct to begin your journey</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24">
                      {TEMPLATES_SHOWCASE.map(temp => (
                        <div 
                          key={temp.id}
                          className="rounded-[36px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                temp.difficulty === "Beginner" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                              }`}>
                                {temp.difficulty}
                              </span>
                              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" /> PRE-BUILT DEMO
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{temp.name}</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{temp.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {temp.features.map((feat, fidx) => (
                                <span key={fidx} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-400">
                                  {feat}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-8 flex gap-3">
                            <button
                              onClick={() => {
                                saveToLocal(project);
                                const clonedProject = JSON.parse(JSON.stringify(temp.project));
                                // assign dynamic ids so they dont conflict
                                clonedProject.id = `project-${Date.now()}`;
                                setProject(clonedProject);
                                setHistory({ past: [], future: [] });
                                setActiveTab("stage");
                                saveToLocal(clonedProject);
                                fetchLocalProjects();
                              }}
                              className="flex-1 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-md active:scale-95"
                            >
                              Instantiate Template
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'storyboard' && (
            <motion.div 
              key="storyboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto p-8 bg-slate-100"
            >
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                       <Layers className="w-6 h-6 text-blue-600" />
                       STORYBOARD
                    </h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Project Workflow & Frame Sequence</p>
                  </div>
                  <button 
                  onClick={() => {
                        const newFrame: GameFrame = {
                          id: `frame-${Date.now()}`,
                          name: getNextAvailableName('Back Unnamed ', project.frames.map(frame => frame.name)),
                          objects: [],
                          events: [],
                          backgroundColor: '#ffffff',
                          width: 800,
                          height: 600
                        };
                        updateProject({ frames: [...project.frames, newFrame] });
                      }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95 shadow-blue-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    NEW FRAME
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                  {project.frames.map((frame, idx) => (
                    <motion.div 
                      key={frame.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`group relative bg-white rounded-2xl border-2 transition-all p-1.5 shadow-sm hover:shadow-xl ${project.currentFrameIndex === idx ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-400'}`}
                    >
                      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 text-white text-[10px] font-black px-2 py-1 rounded backdrop-blur-sm border border-white/10 uppercase tracking-tighter">
                        FRAME {idx + 1}
                      </div>
                      
                      <div 
                        onClick={() => updateProject({ currentFrameIndex: idx })}
                        className="aspect-video w-full rounded-xl overflow-hidden cursor-pointer relative bg-slate-50 flex items-center justify-center border border-slate-100 mb-3"
                        style={{ backgroundColor: frame.backgroundColor }}
                      >
                        {/* Simplified Preview */}
                        <div className="relative w-full h-full scale-[0.15] flex-shrink-0">
                          {frame.objects.map(obj => (
                            <div 
                              key={obj.id}
                              className="absolute rounded-sm"
                              style={{
                                left: obj.x,
                                top: obj.y,
                                width: obj.width,
                                height: obj.height,
                                backgroundColor: obj.color,
                                opacity: obj.opacity
                              }}
                            />
                          ))}
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4">
                           <div className="flex gap-2">
                             <button 
                                onClick={(e) => { e.stopPropagation(); setActiveTab('stage'); updateProject({ currentFrameIndex: idx }); }}
                                className="flex-1 bg-white text-slate-900 font-black text-[10px] py-2 rounded-lg hover:bg-blue-50 transition-colors uppercase tracking-tight shadow-lg"
                             >
                               EDIT FRAME
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); setActiveTab('play'); updateProject({ currentFrameIndex: idx }); }}
                                className="w-10 h-10 bg-emerald-500 text-white flex items-center justify-center rounded-lg hover:bg-emerald-600 transition-colors shadow-lg"
                             >
                               <Play className="w-4 h-4 fill-current" />
                             </button>
                           </div>
                        </div>
                      </div>

                      <div className="px-1.5 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <input 
                              type="text" 
                              value={frame.name}
                              onChange={(e) => {
                                const newFrames = [...project.frames];
                                newFrames[idx].name = e.target.value;
                                updateProject({ frames: newFrames });
                              }}
                              className="bg-transparent border-none p-0 text-[11px] font-black text-slate-800 outline-none hover:bg-slate-100 rounded px-1 transition-colors w-full uppercase tracking-tight"
                            />
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                              {frame.objects.length} OBJ / {frame.events.length} EVT
                            </p>
                          </div>
                          
                          <div className="flex gap-1 ml-2">
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newFrame = { ...frame, id: `frame-${Date.now()}`, name: `${frame.name} (Copy)` };
                                  updateProject({ frames: [...project.frames.slice(0, idx + 1), newFrame, ...project.frames.slice(idx + 1)] });
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-all"
                                title="Duplicate Frame"
                             >
                                <Copy className="w-2.5 h-2.5" />
                             </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (project.frames.length <= 1) return;
                                  const newFrames = project.frames.filter((_, i) => i !== idx);
                                  const newIdx = Math.min(project.currentFrameIndex, newFrames.length - 1);
                                  updateProject({ frames: newFrames, currentFrameIndex: newIdx });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Delete Frame"
                                disabled={project.frames.length <= 1}
                             >
                                <Trash2 className="w-2.5 h-2.5" />
                             </button>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setFrameClipboard(frame); }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Copy Frame"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (project.frames.length > 1) {
                                  setDeleteConfirm({ id: frame.id, name: frame.name, kind: 'frame' });
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  <button 
                    onClick={() => {
                        const newFrame: GameFrame = {
                          id: `frame-${Date.now()}`,
                          name: `Frame ${project.frames.length + 1}`,
                          objects: [],
                          events: [],
                          backgroundColor: '#ffffff',
                          width: 800,
                          height: 600
                        };
                        updateProject({ frames: [...project.frames, newFrame] });
                      }}
                    className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-3 group bg-white shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all shadow-sm">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Add New Frame</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stage' && (
            <motion.div 
              key="stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col md:flex-row overflow-hidden"
            >
              {/* Canvas Area */}
              <div className="flex-1 relative bg-slate-300 p-4 flex items-start justify-start overflow-auto scrollbar-thin scrollbar-thumb-slate-400 canvas-area">
                {/* Visual origin data for components */}
                {(() => {
                  const canvasOffset = getCanvasOffset();
                  return (
                    <>
                {/* Zoom Controls */}
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-xl px-2 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl border border-white/40 z-[100]"
                >
                  <button 
                    onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all"
                    title="Zoom Out"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-center min-w-[3rem] sm:min-w-[4rem]">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 tabular-nums">{Math.round(zoom * 100)}%</span>
                  </div>
                  <button 
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all"
                    title="Zoom In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  
                  <div className="w-[1px] h-6 bg-slate-200 mx-1 sm:mx-2" />
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={fitToScreen}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all"
                      title="Center and Fit"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setZoom(1);
                        setCanvasPan({ x: 0, y: 0 });
                      }}
                      className="text-[8px] sm:text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-all shadow-lg shadow-blue-500/30 uppercase tracking-tighter"
                    >
                      CENTER
                    </motion.button>
                  </div>
                </motion.div>

                <div 
                  className="bg-white shadow-2xl relative transition-all flex-shrink-0"
                  style={{ 
                    width: currentFrame.width, 
                    height: currentFrame.height,
                    backgroundColor: currentFrame.backgroundColor,
                    cursor: isPanning ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'none',
                    transform: `translate3d(${canvasPan.x}px, ${canvasPan.y}px, 0) scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    if (!e.shiftKey) return;
                    e.stopPropagation();
                    const nextZoom = e.deltaY > 0 ? zoom * 0.92 : zoom * 1.08;
                    zoomCanvasAt(e.clientX, e.clientY, nextZoom);
                  }}
                  onPointerDown={(e) => {
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offset = getCanvasOffset();
                    const x = (e.clientX - rect.left) / zoom - offset.x;
                    const y = (e.clientY - rect.top) / zoom - offset.y;
                    
                    if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'stage-canvas') {
                      setEditingTextId(null);
                      if (e.shiftKey) {
                        setIsSelecting(true);
                        setSelectionStart({ x, y });
                        setSelectionRect({ x, y, w: 0, h: 0 });
                      } else {
                        setIsPanning(true);
                        setPanStartPos({ x: e.clientX, y: e.clientY });
                        setPanInitialOffset({ ...canvasPan });
                      }
                    }
                  }}
                  onPointerMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offset = getCanvasOffset();
                    const x = (e.clientX - rect.left) / zoom - offset.x;
                    const y = (e.clientY - rect.top) / zoom - offset.y;

                    if (isSelecting && selectionStart) {
                      const newRect = {
                        x: Math.min(x, selectionStart.x),
                        y: Math.min(y, selectionStart.y),
                        w: Math.abs(x - selectionStart.x),
                        h: Math.abs(y - selectionStart.y)
                      };
                      setSelectionRect(newRect);
                      
                      // Select objects inside
                      const inRect = currentFrame.objects.filter(obj => 
                        obj.x + obj.width / 2 >= newRect.x && 
                        obj.x - obj.width / 2 <= newRect.x + newRect.w &&
                        obj.y + obj.height / 2 >= newRect.y && 
                        obj.y - obj.height / 2 <= newRect.y + newRect.h
                      ).map(o => o.id);
                      setSelectedObjectIds(inRect);
                    } else if (isPanning) {
                      const deltaX = (e.clientX - panStartPos.x) / zoom;
                      const deltaY = (e.clientY - panStartPos.y) / zoom;
                      setCanvasPan({
                        x: panInitialOffset.x + deltaX,
                        y: panInitialOffset.y + deltaY
                      });
                    } else if (isDragging) {
                      const dx = x - dragStartPos.x;
                      const dy = y - dragStartPos.y;

                      requestAnimationFrame(() => {
                        const newObjects = currentFrame.objects.map(o => {
                          if (dragInitialPositions[o.id]) {
                            const newX = dragInitialPositions[o.id].x + dx;
                            const newY = dragInitialPositions[o.id].y + dy;
                            return {
                              ...o,
                              x: snapToGrid ? Math.round(newX / gridSize) * gridSize : newX,
                              y: snapToGrid ? Math.round(newY / gridSize) * gridSize : newY
                            };
                          }
                          return o;
                        });
                        updateCurrentFrame({ objects: newObjects });
                      });
                    }
                  }}
                  onPointerUp={() => {
                    if (isDragging) {
                      saveToLocal(project, true);
                    }
                    setIsSelecting(false);
                    setIsPanning(false);
                    setIsDragging(false);
                    setSelectionStart(null);
                    setSelectionRect(null);
                    setDragInitialPositions({});
                  }}
                  onContextMenu={(e) => handleContextMenu(e, 'canvas')}
                  id="stage-canvas"
                >
                  {/* Clickteam Style Grid */}
                  {isGridVisible && (
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-10"
                      style={{ 
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: `${gridSize}px ${gridSize}px`,
                        backgroundPosition: 'center center'
                      }}
                    />
                  )}

                  {/* Selection Rect */}
                  {selectionRect && (
                    <div 
                      className="absolute border border-blue-500 bg-blue-500/10 z-[100] pointer-events-none"
                      style={{
                        left: canvasOffset.x + selectionRect.x,
                        top: canvasOffset.y + selectionRect.y,
                        width: selectionRect.w,
                        height: selectionRect.h
                      }}
                    />
                  )}

                  {/* Center Crosshair (0,0) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-0">
                    <div className="absolute w-[1px] h-full bg-slate-400 left-1/2 -translate-x-1/2" />
                    <div className="absolute h-[1px] w-full bg-slate-400 top-1/2 -translate-y-1/2" />
                    <div 
                      className="absolute w-2 h-2 border-2 border-slate-500 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" 
                    />
                    <div className="absolute text-[8px] font-black text-slate-400 uppercase tracking-widest mt-4 ml-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      ORIGIN (0,0)
                    </div>
                  </div>

                  {currentFrame.objects.map(obj => {
                    const canvasOffset = getCanvasOffset();
                    const isSelected = selectedObjectIds.includes(obj.id);
                    return (
                    <motion.div
                      key={obj.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (obj.isLocked) return;
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

                        let newSelection = selectedObjectIds;
                        const groupMembers = obj.groupId ? getGroupMembers(obj.groupId).map(item => item.id) : [];
                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                          const targetIds = groupMembers.length > 0 ? groupMembers : [obj.id];
                          const shouldRemove = targetIds.every(id => selectedObjectIds.includes(id));
                          newSelection = shouldRemove
                            ? selectedObjectIds.filter(id => !targetIds.includes(id))
                            : Array.from(new Set([...selectedObjectIds, ...targetIds]));
                        } else {
                          if (groupMembers.length > 0) {
                            newSelection = groupMembers;
                          } else if (!selectedObjectIds.includes(obj.id) || selectedObjectIds.length > 1) {
                            newSelection = [obj.id];
                          }
                        }
                        setSelectedObjectIds(newSelection);

                        // Capture starting positions for all in newSelection
                        const canvasEl = document.getElementById('stage-canvas');
                        if (!canvasEl) return;
                        const rect = canvasEl.getBoundingClientRect();
                        const offset = getCanvasOffset();
                        const startX = (e.clientX - rect.left) / zoom - offset.x;
                        const startY = (e.clientY - rect.top) / zoom - offset.y;

                        setIsDragging(true);
                        setDragStartPos({ x: startX, y: startY });
                        
                        const initials: Record<string, {x: number, y: number}> = {};
                        currentFrame.objects.forEach(o => {
                          if (newSelection.includes(o.id)) {
                            initials[o.id] = { x: o.x, y: o.y };
                          }
                        });
                        setDragInitialPositions(initials);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (obj.type === 'string') {
                          setEditingTextId(obj.id);
                        }
                      }}
                      onWheel={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          const nextZoom = e.deltaY > 0 ? zoom * 0.92 : zoom * 1.08;
                          zoomCanvasAt(e.clientX, e.clientY, nextZoom);
                          return;
                        }
                        if (selectedObjectIds.includes(obj.id)) {
                          e.preventDefault();
                          e.stopPropagation();
                          const delta = e.deltaY > 0 ? -4 : 4;
                          
                          const newObjects = currentFrame.objects.map(o => {
                            if (selectedObjectIds.includes(o.id)) {
                              const ratio = o.height / o.width;
                              return {
                                ...o,
                                width: Math.max(10, o.width + delta),
                                height: Math.max(10, o.height + (delta * ratio))
                              };
                            }
                            return o;
                          });
                          updateCurrentFrame({ objects: newObjects });
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, 'object', obj.id)}
                      whileHover={{ scale: obj.isLocked ? 1 : 1.02, ring: 2, ringColor: obj.isLocked ? '#94a3b8' : '#3b82f6' }}
                      className={`absolute select-none ${obj.isLocked ? 'cursor-default' : 'cursor-move'} group flex items-center transition-shadow shadow-xs hover:shadow-lg`}
                      style={{
                        left: canvasOffset.x + obj.x - obj.width / 2,
                        top: canvasOffset.y + obj.y - obj.height / 2,
                        width: obj.width,
                        height: obj.height,
                        backgroundColor: obj.type === 'string' || obj.imageUrl ? 'transparent' : obj.color,
                        opacity: obj.isVisible ? obj.opacity : 0.3,
                        zIndex: obj.zIndex + (isSelected ? 1000 : 0),
                        ...getShapeStyle(obj.shapeType, obj.customShape),
                        backgroundImage: obj.imageUrl ? `url(${obj.imageUrl})` : 'none',
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        overflow: 'hidden',
                        color: obj.color,
                        fontSize: (obj.textConfig?.fontSize || 16),
                        fontFamily: obj.textConfig?.fontFamily || 'inherit',
                        justifyContent: obj.textConfig?.textAlign === 'center' ? 'center' : (obj.textConfig?.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                      }}
                    >
                      {isSelected && (
                        <ShapeSelectionOutline shapeType={obj.shapeType} customShape={obj.customShape} />
                      )}
                      {obj.isLocked && selectedObjectIds.includes(obj.id) && (
                        <div className="absolute inset-0 bg-slate-400/10 flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      {obj.type === 'string' && (
                        editingTextId === obj.id ? (
                          <textarea 
                            autoFocus
                            value={obj.textConfig?.text}
                            onChange={(e) => updateObject(obj.id, { textConfig: { ...obj.textConfig!, text: e.target.value } })}
                            onBlur={() => setEditingTextId(null)}
                            className="w-full h-full bg-white/90 border-none outline-none resize-none p-1 text-black font-bold z-[100]"
                            style={{ fontSize: obj.textConfig?.fontSize }}
                          />
                        ) : (
                          <div className="pointer-events-none px-1 truncate w-full overflow-hidden">
                            {obj.textConfig?.text}
                          </div>
                        )
                      )}
                      {/* Resize handles - Clickteam feel */}
                      {selectedObjectIds.includes(obj.id) && (
                        <>
                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 border border-white" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 border border-white" />
                          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 border border-white" />
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 border border-white" />
                        </>
                      )}
                      
                      <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm z-[60]">
                        {obj.name} ({Math.round(obj.x)}, {Math.round(obj.y)})
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
                  </>
                  );
                })()}
              </div>

              {/* Redesigned Properties Panel */}
              <div className={`w-full md:w-85 border-l overflow-hidden flex flex-col shadow-2xl z-40 transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`px-5 py-4 border-b flex justify-between items-center ${settings.theme === 'dark' ? 'bg-slate-800/10 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${selectedObjectIds.length > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${settings.theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {selectedObject ? selectedObject.name : (selectedObjectIds.length > 1 ? `${selectedObjectIds.length} Entities Selected` : 'Global Frame')}
                    </span>
                  </div>
                  {selectedObjectIds.length > 0 && (
                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${settings.theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      Inspector
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
                  {selectedObjectIds.length > 0 ? (
                    <div className="p-0">
                      {/* Properties Tabs - Clickteam Style Updated */}
                      <div className={`flex border-b sticky top-0 z-50 backdrop-blur-md ${settings.theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
                        <PropTab theme={settings.theme} icon={<Settings className="w-3.5 h-3.5" />} title="Logic & General" active={activePropTab === 0} onClick={() => setActivePropTab(0)} />
                        <PropTab theme={settings.theme} icon={<Maximize className="w-3.5 h-3.5" />} title="Visual Display" active={activePropTab === 1} onClick={() => setActivePropTab(1)} />
                        {selectedObjectIds.length === 1 && <PropTab theme={settings.theme} icon={<Zap className="w-3.5 h-3.5" />} title="Custom Properties" active={activePropTab === 2} onClick={() => setActivePropTab(2)} />}
                        {selectedObjectIds.length === 1 && <PropTab theme={settings.theme} icon={<Box className="w-3.5 h-3.5" />} title="Physics & Motion" active={activePropTab === 3} onClick={() => setActivePropTab(3)} />}
                      </div>

                      <div className="p-5 space-y-4">
                        {activePropTab === 0 && (
                          <>
                            <PropSection theme={settings.theme} label="Entity Identity">
                              <PropRow theme={settings.theme} label="Unique Name">
                                <input 
                                  type="text" 
                                  disabled={selectedObjectIds.length > 1}
                                  value={selectedObjectIds.length === 1 ? selectedObject?.name : 'Group Selection'}
                                  onChange={(e) => selectedObject && updateObject(selectedObject.id, { name: e.target.value })}
                                  className={`w-full border px-3 py-2 text-[12px] font-bold transition-all outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:bg-slate-700' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'} disabled:opacity-50`}
                                />
                              </PropRow>
                               <PropRow theme={settings.theme} label="Base Mesh">
                                <div className="flex items-center gap-2 w-full">
                                  <div className={`relative h-10 w-10 shrink-0 rounded-xl border p-0.5 ${settings.theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white shadow-sm'}`}>
                                    <div className="relative h-full w-full overflow-hidden rounded-lg">
                                      <ShapeSelectionOutline shapeType={selectedObject?.shapeType} customShape={selectedObject?.customShape} />
                                      <div
                                        className="absolute inset-1"
                                        style={{
                                          ...getShapeStyle(selectedObject?.shapeType, selectedObject?.customShape),
                                          backgroundColor: selectedObject?.color || '#3b82f6'
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <select
                                    value={selectedObject?.shapeType || 'square'}
                                    onChange={(e) => {
                                      if (e.target.value === 'custom') {
                                        if (selectedObject?.id) openShapePickerForTarget(selectedObject.id, 'custom');
                                        return;
                                      }
                                      const existingInLibrary = project.customShapes?.find(s => s.id === e.target.value);
                                      if (existingInLibrary && selectedObject?.id) {
                                        updateObject(selectedObject.id, { shapeType: 'custom', customShape: existingInLibrary });
                                      } else if (selectedObject?.id) {
                                        updateObject(selectedObject.id, { shapeType: e.target.value, customShape: undefined });
                                      }
                                    }}
                                    className={`min-w-0 flex-1 border px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none rounded-xl transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                                  >
                                    <option value="custom">New Custom Architecture...</option>
                                    <optgroup label="Core Components">
                                      {SHAPE_LIBRARY.map(shape => (
                                        <option key={shape.id} value={shape.id}>{shape.name}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Project Modules">
                                        {project.customShapes?.map(shape => (
                                          <option key={shape.id} value={shape.id}>{shape.name}</option>
                                        ))}
                                      </optgroup>
                                  </select>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => selectedObject?.id && openShapePickerForTarget(selectedObject.id, 'library')}
                                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                  >
                                    <Folder className="w-3 h-3" />
                                    Browse Library
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!selectedObject?.id) return;
                                      if (selectedObject.shapeType !== 'custom') {
                                        updateObject(selectedObject.id, { shapeType: 'custom' });
                                      }
                                      openShapePickerForTarget(selectedObject.id, 'custom');
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 border border-indigo-500 py-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                  >
                                    <Activity className="w-3 h-3" />
                                    Construct Mesh
                                  </button>
                                </div>
                              </PropRow>
                            </PropSection>

                            {selectedObjectIds.length > 1 && (
                              <PropSection theme={settings.theme} label="Spatial Alignment">
                                <div className="grid grid-cols-3 gap-2">
                                  <button onClick={() => alignObjects('left')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Left">
                                    <AlignLeft className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">LEFT</span>
                                  </button>
                                  <button onClick={() => alignObjects('center')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Center">
                                    <AlignCenter className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">CENTER</span>
                                  </button>
                                  <button onClick={() => alignObjects('right')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Right">
                                    <AlignRight className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">RIGHT</span>
                                  </button>
                                  <button onClick={() => alignObjects('top')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Top">
                                    <AlignStartVertical className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">TOP</span>
                                  </button>
                                  <button onClick={() => alignObjects('middle')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Middle">
                                    <AlignCenterVertical className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">CENTER</span>
                                  </button>
                                  <button onClick={() => alignObjects('bottom')} className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`} title="Align Bottom">
                                    <AlignEndVertical className="w-4 h-4" />
                                    <span className="text-[8px] font-black tracking-widest">BOTTOM</span>
                                  </button>
                                </div>
                              </PropSection>
                            )}
                            
                            <PropSection theme={settings.theme} label="Transform Matrix">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                  <PropRow theme={settings.theme} label="X" compact>
                                    <input 
                                      type="number" 
                                      value={getMixedValue('x') === 'mixed' ? '' : Math.round(getMixedValue('x') || 0)}
                                      placeholder={getMixedValue('x') === 'mixed' ? 'Mixed' : '0'}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        updateObjects(selectedObjectIds, { x: val });
                                      }}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:shadow-sm'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="Y" compact>
                                    <input 
                                      type="number" 
                                      value={getMixedValue('y') === 'mixed' ? '' : Math.round(getMixedValue('y') || 0)}
                                      placeholder={getMixedValue('y') === 'mixed' ? 'Mixed' : '0'}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        updateObjects(selectedObjectIds, { y: val });
                                      }}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:shadow-sm'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="W" compact>
                                    <input 
                                      type="number" 
                                      value={getMixedValue('width') === 'mixed' ? '' : Math.round(getMixedValue('width') || 0)}
                                      placeholder={getMixedValue('width') === 'mixed' ? 'Mixed' : '0'}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        updateObjects(selectedObjectIds, { width: Math.max(1, val) });
                                      }}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:shadow-sm'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="H" compact>
                                    <input 
                                      type="number" 
                                      value={getMixedValue('height') === 'mixed' ? '' : Math.round(getMixedValue('height') || 0)}
                                      placeholder={getMixedValue('height') === 'mixed' ? 'Mixed' : '0'}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val)) return;
                                        updateObjects(selectedObjectIds, { height: Math.max(1, val) });
                                      }}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:bg-white focus:shadow-sm'}`}
                                    />
                                  </PropRow>
                                </div>
                            </PropSection>

                            <div className="pt-2 flex flex-col gap-3">
                              <button 
                                onClick={() => duplicateObject(selectedObjectIds)}
                                className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-xl border transition-all text-[10px] uppercase tracking-widest shadow-sm hover:-translate-y-0.5 active:translate-y-0 ${settings.theme === 'dark' ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300'}`}
                                title="Duplicate selection (Ctrl+D)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                DUPLICATE {selectedObjectIds.length > 1 ? 'SELECTION' : 'ENTITY'}
                              </button>
                              <button 
                                onClick={() => deleteObject(selectedObjectIds)}
                                className={`w-full flex items-center justify-center gap-2 font-black py-3 rounded-xl border transition-all text-[10px] uppercase tracking-widest shadow-sm hover:-translate-y-0.5 active:translate-y-0 ${settings.theme === 'dark' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300'}`}
                                title="Delete selection"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                DELETE {selectedObjectIds.length > 1 ? 'SELECTION' : 'ENTITY'}
                              </button>
                            </div>
                            
                            {selectedObjectIds.length === 1 && selectedObject?.type === 'string' && (
                              <PropSection theme={settings.theme} label="Core Text Buffer">
                                <textarea 
                                  value={selectedObject.textConfig?.text || ''}
                                  onChange={(e) => updateObject(selectedObject.id, { textConfig: { ...selectedObject.textConfig!, text: e.target.value } })}
                                  className={`w-full p-3 text-[12px] font-bold transition-all outline-none rounded-xl border min-h-[80px] leading-relaxed ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                                  placeholder="Input data stream..."
                                />
                              </PropSection>
                            )}
                          </>
                        )}

                        {activePropTab === 1 && (
                          <>
                            <PropSection theme={settings.theme} label="Visual Persistence">
                               <PropRow theme={settings.theme} label="Visible">
                                  <div className="flex items-center h-6">
                                    <input 
                                      type="checkbox" 
                                      checked={getMixedValue('isVisible') === 'mixed' ? false : getMixedValue('isVisible')}
                                      ref={el => { if (el) el.indeterminate = getMixedValue('isVisible') === 'mixed'; }}
                                      onChange={(e) => updateObjects(selectedObjectIds, { isVisible: e.target.checked })}
                                      className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500 bg-slate-800 border-slate-700' : 'accent-indigo-600'}`}
                                    />
                                  </div>
                               </PropRow>
                               <PropRow theme={settings.theme} label="Opacity">
                                  <div className="flex items-center gap-3 w-full group/opacity">
                                    <input 
                                      type="range" min="0" max="1" step="0.01" 
                                      value={getMixedValue('opacity') === 'mixed' ? 1 : getMixedValue('opacity')}
                                      onChange={(e) => updateObjects(selectedObjectIds, { opacity: parseFloat(e.target.value) })}
                                      className={`flex-1 h-1.5 rounded-full appearance-none transition-all cursor-pointer ${settings.theme === 'dark' ? 'bg-slate-800 accent-indigo-500 group-hover/opacity:bg-slate-700' : 'bg-slate-200 accent-indigo-600 group-hover/opacity:bg-slate-300'}`}
                                    />
                                    <span className={`text-[10px] font-mono w-8 text-right ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {Math.round((getMixedValue('opacity') === 'mixed' ? 1 : getMixedValue('opacity')) * 100)}%
                                    </span>
                                  </div>
                               </PropRow>
                            </PropSection>

                            <PropSection theme={settings.theme} label="Surface Attributes">
                               <PropRow theme={settings.theme} label="Tint Color">
                                  <div className="flex items-center gap-3 w-full">
                                    <div className="relative group/color-pick overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 h-9 w-full flex items-center">
                                      <input 
                                        type="color" 
                                        value={getMixedValue('color') === 'mixed' ? '#000000' : getMixedValue('color')}
                                        onChange={(e) => updateObjects(selectedObjectIds, { color: e.target.value })}
                                        className="absolute inset-x-0 -top-4 -bottom-4 w-full h-[200%] cursor-pointer border-none p-0 scale-110"
                                      />
                                      <div className={`absolute inset-0 pointer-events-none flex items-center px-3 justify-between ${settings.theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                                        <span className={`text-[10px] font-mono uppercase ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                          {getMixedValue('color') === 'mixed' ? 'Mixed' : (getMixedValue('color') || '#000000').toUpperCase()}
                                        </span>
                                        <Eye className="w-3 h-3 opacity-40" />
                                      </div>
                                    </div>
                                  </div>
                               </PropRow>
                               <PropRow theme={settings.theme} label="Texture Map">
                                  <div className="flex flex-col gap-2.5 w-full">
                                    <input 
                                      type="text" 
                                      disabled={selectedObjectIds.length > 1}
                                      value={selectedObjectIds.length === 1 ? selectedObject?.imageUrl || '' : 'Multiple Selection'}
                                      onChange={(e) => selectedObject && updateObject(selectedObject.id, { imageUrl: e.target.value })}
                                      placeholder="Asset URL source..."
                                      className={`w-full border px-3 py-2 text-[11px] font-medium transition-all outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                                    />
                                    {selectedObjectIds.length === 1 && (
                                      <div className="flex gap-2">
                                        <select 
                                          className={`flex-1 border px-2 py-2 text-[10px] font-black uppercase tracking-wider outline-none rounded-xl transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 focus:text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                          value={project.libraryAssets.find(a => a.sourceUrl === selectedObject?.imageUrl)?.id || ''}
                                          onChange={(e) => {
                                            const asset = project.libraryAssets.find(a => a.id === e.target.value);
                                            if (asset && selectedObject) updateObject(selectedObject.id, { imageUrl: asset.sourceUrl });
                                          }}
                                        >
                                          <option value="">Linked Assets...</option>
                                          <optgroup label="Static Images">
                                            {project.libraryAssets.filter(a => a.kind === 'image').map(asset => (
                                              <option key={asset.id} value={asset.id}>{asset.name}</option>
                                            ))}
                                          </optgroup>
                                        </select>
                                        <button 
                                          onClick={() => setActiveTab('assets')}
                                          className={`px-4 rounded-xl border text-[9px] font-black uppercase tracking-[0.12em] transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                                        >
                                          LIBRARY
                                        </button>
                                      </div>
                                    )}
                                  </div>
                               </PropRow>
                            </PropSection>

                            {selectedObject?.type === 'active' && (
                              <PropSection theme={settings.theme} label="Sprite Sequencer">
                                <PropRow theme={settings.theme} label="Processing">
                                  <div className="flex items-center h-6">
                                    <input 
                                      type="checkbox"
                                      checked={selectedObject.spriteSheet?.enabled || false}
                                      onChange={(e) => updateObject(selectedObject.id, { 
                                        spriteSheet: { 
                                          ...(selectedObject.spriteSheet || { columns: 1, rows: 1, totalFrames: 1, frameRate: 10, currentFrame: 0, isLooping: true }), 
                                          enabled: e.target.checked 
                                        } 
                                      })}
                                      className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-600'}`}
                                    />
                                  </div>
                                </PropRow>
                                {selectedObject.spriteSheet?.enabled && (
                                  <div className={`mt-4 p-4 rounded-xl border border-dashed flex flex-col gap-4 ${settings.theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                                    <div className="grid grid-cols-2 gap-4">
                                      <PropRow theme={settings.theme} label="Grid X" compact>
                                        <input 
                                          type="number" 
                                          value={selectedObject.spriteSheet.columns}
                                          onChange={(e) => updateObject(selectedObject.id, { spriteSheet: { ...selectedObject.spriteSheet!, columns: parseInt(e.target.value) } })}
                                          className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                        />
                                      </PropRow>
                                      <PropRow theme={settings.theme} label="Grid Y" compact>
                                        <input 
                                          type="number" 
                                          value={selectedObject.spriteSheet.rows}
                                          onChange={(e) => updateObject(selectedObject.id, { spriteSheet: { ...selectedObject.spriteSheet!, rows: parseInt(e.target.value) } })}
                                          className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                        />
                                      </PropRow>
                                    </div>
                                    <PropRow theme={settings.theme} label="Playback FPS">
                                      <input 
                                        type="number" 
                                        value={selectedObject.spriteSheet.frameRate}
                                        onChange={(e) => updateObject(selectedObject.id, { spriteSheet: { ...selectedObject.spriteSheet!, frameRate: parseInt(e.target.value) } })}
                                        className={`w-full border px-2 py-2 text-[11px] font-bold outline-none rounded-xl focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                      />
                                    </PropRow>
                                  </div>
                                )}
                              </PropSection>
                            )}
                          </>
                        )}

                        {activePropTab === 2 && (
                          <>
                            <PropSection theme={settings.theme} label="Dynamic Logic Variables">
                              {selectedObject.alterableValues.map((val, vIdx) => (
                                  <div key={val.id} className={`flex gap-2 mb-2 p-2 rounded-xl group/val transition-colors ${settings.theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800' : 'bg-slate-50 hover:bg-white shadow-sm hover:shadow'}`}>
                                    <input 
                                      value={val.name}
                                      onChange={(e) => {
                                        const newVals = [...selectedObject.alterableValues];
                                        newVals[vIdx].name = e.target.value;
                                        updateObject(selectedObject.id, { alterableValues: newVals });
                                      }}
                                      className={`flex-1 min-w-0 bg-transparent border-none px-1 py-1 text-[11px] font-black uppercase tracking-tight focus:ring-0 outline-none ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                      <input 
                                        type="number"
                                        value={val.value}
                                        onChange={(e) => {
                                          const newVals = [...selectedObject.alterableValues];
                                          newVals[vIdx].value = parseInt(e.target.value) || 0;
                                          updateObject(selectedObject.id, { alterableValues: newVals });
                                        }}
                                        className={`w-14 text-center border-none bg-transparent px-1 py-1 text-[10px] font-mono focus:ring-0 outline-none ${settings.theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                                      />
                                      <button 
                                        onClick={() => {
                                          const newVals = selectedObject.alterableValues.filter(v => v.id !== val.id);
                                          updateObject(selectedObject.id, { alterableValues: newVals });
                                        }}
                                        className={`opacity-0 group-hover/val:opacity-100 transition-opacity p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 ${settings.theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newVals = [...selectedObject.alterableValues, { id: `v-${Date.now()}`, name: `Value ${selectedObject.alterableValues.length + 1}`, value: 0 }];
                                  updateObject(selectedObject.id, { alterableValues: newVals });
                                }}
                                className={`w-full py-2.5 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mt-3 ${settings.theme === 'dark' ? 'bg-slate-800/20 border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-300'}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                INITIALIZE VAR
                              </button>
                            </PropSection>

                            <PropSection theme={settings.theme} label="Atmosphere Emittance">
                              <PropRow theme={settings.theme} label="Active">
                                <div className="flex items-center h-6">
                                  <input 
                                    type="checkbox"
                                    checked={selectedObject.particles?.enabled || false}
                                    onChange={(e) => updateObject(selectedObject.id, { 
                                      particles: { 
                                        ...(selectedObject.particles || { enabled: false, count: 50, lifetime: 1000, speed: 5, spread: 360, color: '#ffffff', gravity: 0 }),
                                        enabled: e.target.checked 
                                      } 
                                    })}
                                    className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-600'}`}
                                  />
                                </div>
                              </PropRow>
                              {selectedObject.particles?.enabled && (
                                <div className={`mt-4 space-y-4 p-4 rounded-xl border border-dashed ${settings.theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                                  <PropRow theme={settings.theme} label="Density">
                                    <input 
                                      type="number" 
                                      value={selectedObject.particles.count}
                                      onChange={(e) => updateObject(selectedObject.id, { particles: { ...selectedObject.particles!, count: parseInt(e.target.value) } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="Velocity">
                                    <input 
                                      type="number" 
                                      value={selectedObject.particles.speed}
                                      onChange={(e) => updateObject(selectedObject.id, { particles: { ...selectedObject.particles!, speed: parseInt(e.target.value) } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="Longevity">
                                    <input 
                                      type="number" 
                                      value={selectedObject.particles.lifetime}
                                      onChange={(e) => updateObject(selectedObject.id, { particles: { ...selectedObject.particles!, lifetime: parseInt(e.target.value) } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                </div>
                              )}
                            </PropSection>

                            {selectedObject.type === 'string' && (
                              <PropSection label="Text Settings">
                                <PropRow label="Text">
                                  <textarea 
                                    value={selectedObject.textConfig?.text || ''}
                                    onChange={(e) => updateObject(selectedObject.id, { textConfig: { ...selectedObject.textConfig!, text: e.target.value } })}
                                    className="w-full bg-white border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                                    rows={2}
                                  />
                                </PropRow>
                                <PropRow label="Font Size">
                                  <input 
                                    type="number" 
                                    value={selectedObject.textConfig?.fontSize || 16}
                                    onChange={(e) => updateObject(selectedObject.id, { textConfig: { ...selectedObject.textConfig!, fontSize: parseInt(e.target.value) } })}
                                    className="w-full bg-white border border-slate-300 px-2 py-0.5 text-xs"
                                  />
                                </PropRow>
                              </PropSection>
                            )}
                          </>
                        )}

                        {activePropTab === 3 && (
                          <>
                            <PropSection theme={settings.theme} label="Locomotion Protocol">
                              <PropRow theme={settings.theme} label="Algorithm">
                                <select 
                                  value={selectedObject.movement.type}
                                  onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, type: e.target.value as any } })}
                                  className={`w-full border px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none rounded-xl transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                                >
                                  <option value="static">Fixed Position</option>
                                  <option value="bouncing_ball">Dynamic Rebound</option>
                                  <option value="eight_directions">Vector Axis (8D)</option>
                                  <option value="platform">Physics Character</option>
                                </select>
                              </PropRow>
                              <PropRow theme={settings.theme} label="Physics Bind">
                                <div className="flex items-center h-6">
                                  <input
                                    type="checkbox"
                                    checked={selectedObject.movement.physics?.enabled || false}
                                    onChange={(e) => updateObject(selectedObject.id, {
                                      movement: e.target.checked
                                        ? applyPhysicsPreset(selectedObject.movement, selectedObject.movement.physics?.preset || 'rigid')
                                        : { ...selectedObject.movement, physics: undefined }
                                    })}
                                    className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-600'}`}
                                  />
                                </div>
                              </PropRow>
                              {selectedObject.movement.physics?.enabled && (
                                <PropRow theme={settings.theme} label="Presets">
                                  <select
                                    value={selectedObject.movement.physics.preset || 'custom'}
                                    onChange={(e) => updateObject(selectedObject.id, {
                                      movement: applyPhysicsPreset(selectedObject.movement, e.target.value as any)
                                    })}
                                    className={`w-full border px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none rounded-xl transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 focus:text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-indigo-500 shadow-inner'}`}
                                  >
                                    <option value="custom">Hardware Manual...</option>
                                    <option value="static">Immovable Anchor</option>
                                    <option value="rigid">Standard Solid</option>
                                    <option value="bouncy">Elastic Sphere</option>
                                    <option value="slippery">Low Friction</option>
                                    <option value="heavy">High Mass Density</option>
                                    <option value="ice">Zero Friction</option>
                                    <option value="ghost">No Collision (Sensor)</option>
                                    <option value="trampoline">Hyper Restitution</option>
                                    <option value="pinball">High Energy Rebound</option>
                                    <option value="floaty">Low Gravity Drag</option>
                                  </select>
                                </PropRow>
                              )}
                              {selectedObject.movement.type !== 'static' && (
                                <PropRow theme={settings.theme} label="Max Velocity">
                                  <input 
                                    type="number" 
                                    value={selectedObject.movement.speed}
                                    onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, speed: parseInt(e.target.value) } })}
                                    className={`w-full border px-2 py-2 text-[11px] font-bold outline-none rounded-xl focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  />
                                </PropRow>
                              )}
                            </PropSection>

                            {selectedObject.movement.physics?.enabled && (
                              <PropSection theme={settings.theme} label="Matter Dynamics">
                                <PropRow theme={settings.theme} label="Hull Shape">
                                  <select
                                    value={selectedObject.movement.physics.bodyType}
                                    onChange={(e) => updateObject(selectedObject.id, { 
                                      movement: { 
                                        ...selectedObject.movement,
                                        physics: { ...selectedObject.movement.physics!, bodyType: e.target.value as 'rectangle' | 'circle', preset: 'custom' }
                                      } 
                                    })}
                                    className={`w-full border px-2 py-2 text-[11px] font-black uppercase tracking-widest outline-none rounded-xl focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                  >
                                    <option value="rectangle">Box Collider</option>
                                    <option value="circle">Radial Collider</option>
                                  </select>
                                </PropRow>
                                <PropRow theme={settings.theme} label="Static Body">
                                  <div className="flex items-center h-6">
                                    <input 
                                      type="checkbox"
                                      checked={selectedObject.movement.physics.isStatic}
                                      onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, physics: { ...selectedObject.movement.physics!, isStatic: e.target.checked, preset: 'custom' } } })}
                                      className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-600'}`}
                                    />
                                  </div>
                                </PropRow>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <PropRow theme={settings.theme} label="Density" compact>
                                    <input 
                                      type="number" step="0.001"
                                      value={selectedObject.movement.physics.density}
                                      onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, physics: { ...selectedObject.movement.physics!, density: parseFloat(e.target.value), preset: 'custom' } } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="Fric" compact>
                                    <input 
                                      type="number" step="0.1"
                                      value={selectedObject.movement.physics.friction}
                                      onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, physics: { ...selectedObject.movement.physics!, friction: parseFloat(e.target.value), preset: 'custom' } } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  <PropRow theme={settings.theme} label="Bounce" compact>
                                    <input 
                                      type="number" step="0.1"
                                      value={selectedObject.movement.physics.restitution}
                                      onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, physics: { ...selectedObject.movement.physics!, restitution: parseFloat(e.target.value), preset: 'custom' } } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                  <PropRow theme={settings.theme} label="Drag" compact>
                                    <input 
                                      type="number" step="0.001"
                                      value={selectedObject.movement.physics.frictionAir}
                                      onChange={(e) => updateObject(selectedObject.id, { movement: { ...selectedObject.movement, physics: { ...selectedObject.movement.physics!, frictionAir: parseFloat(e.target.value), preset: 'custom' } } })}
                                      className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                  </PropRow>
                                </div>
                              </PropSection>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 space-y-6">
                      <PropSection theme={settings.theme} label="Core Metadata">
                        <PropRow theme={settings.theme} label="Internal ID">
                          <input 
                            type="text" 
                            value={project.name}
                            onChange={(e) => updateProject({ name: e.target.value })}
                            className={`w-full border px-3 py-2 text-[12px] font-bold transition-all outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:bg-slate-700' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                          />
                        </PropRow>
                        <PropRow theme={settings.theme} label="Global Title">
                          <input 
                            type="text" 
                            value={project.settings.windowTitle}
                            onChange={(e) => updateProject({ settings: { ...project.settings, windowTitle: e.target.value } })}
                            className={`w-full border px-3 py-2 text-[12px] font-bold transition-all outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:bg-slate-700' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                          />
                        </PropRow>
                      </PropSection>
                      
                      <PropSection theme={settings.theme} label="Coordinate Space">
                        <PropRow theme={settings.theme} label="Alias">
                          <input 
                            type="text" 
                            value={currentFrame.name}
                            onChange={(e) => updateCurrentFrame({ name: e.target.value })}
                            className={`w-full border px-3 py-2 text-[12px] font-bold transition-all outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:bg-slate-700' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:shadow-sm'}`}
                          />
                        </PropRow>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <PropRow theme={settings.theme} label="W" compact>
                            <input 
                              type="number" 
                              value={currentFrame.width}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) return;
                                updateCurrentFrame({ width: Math.max(10, val) });
                              }}
                              className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg focus:border-indigo-500 ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            />
                          </PropRow>
                          <PropRow theme={settings.theme} label="H" compact>
                            <input 
                              type="number" 
                              value={currentFrame.height}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (isNaN(val)) return;
                                updateCurrentFrame({ height: Math.max(10, val) });
                              }}
                              className={`w-full border px-2 py-1.5 text-[11px] font-bold transition-all outline-none rounded-lg focus:border-indigo-500 ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            />
                          </PropRow>
                        </div>
                      </PropSection>
                      
                      <PropSection theme={settings.theme} label="Environment Config">
                        <PropRow theme={settings.theme} label="Chroma Back">
                          <div className="flex gap-2.5 flex-wrap mt-1">
                            {['#ffffff', '#000000', '#1e293b', '#3b82f6', '#ef4444', '#10b981'].map(c => (
                              <button 
                                key={c}
                                onClick={() => updateCurrentFrame({ backgroundColor: c })}
                                className={`w-6 h-6 rounded-lg transition-all relative border ${currentFrame.backgroundColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 shadow-lg' : (settings.theme === 'dark' ? 'border-slate-700 hover:border-slate-500' : 'border-slate-200 hover:border-slate-400')}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </PropRow>
                        <div className="space-y-4 mt-6">
                            <PropRow theme={settings.theme} label="Raster Grid">
                              <div className="flex items-center h-6">
                                <input 
                                  type="checkbox"
                                  checked={isGridVisible}
                                  onChange={() => setIsGridVisible(!isGridVisible)}
                                  className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-indigo-500' : 'accent-indigo-600'}`}
                                />
                              </div>
                            </PropRow>
                            <PropRow theme={settings.theme} label="Magnetic Snap">
                              <div className="flex items-center h-6">
                                <input 
                                  type="checkbox"
                                  checked={snapToGrid}
                                  onChange={() => setSnapToGrid(!snapToGrid)}
                                  className={`w-4 h-4 rounded transition-all cursor-pointer ${settings.theme === 'dark' ? 'accent-emerald-500' : 'accent-emerald-600'}`}
                                />
                              </div>
                            </PropRow>
                            <PropRow theme={settings.theme} label="Grid Density">
                              <input 
                                type="number" 
                                step="8"
                                value={gridSize}
                                onChange={(e) => setGridSize(Math.max(4, parseInt(e.target.value) || 32))}
                                className={`w-full border px-2 py-1.5 text-[11px] font-bold outline-none rounded-lg focus:border-indigo-500 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                              />
                            </PropRow>
                        </div>
                      </PropSection>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div 
              key="events"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-hidden flex flex-col bg-[#f3f5fa]"
            >
              <div className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Event Editor</div>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Blocks first, simple and complete</h2>
                    <p className="mt-1 text-sm text-slate-500">Start with blocks like Scratch, but keep the structure clearer and easier to grow.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => createEventFromBlock('when-started')} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors">When Started</button>
                    <button onClick={() => createEventFromBlock('repeat')} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors">Repeat</button>
                    <button onClick={addEvent} className="rounded-2xl bg-blue-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white hover:bg-blue-700 transition-colors">+ Event</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5">
                <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <aside className="space-y-3">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Starter Blocks</div>
                      <p className="mt-1 text-sm text-slate-500">Click a block to create a new event ready to edit.</p>
                    </div>
                    {[
                      { id: 'when-started', title: 'When Started', tone: 'blue', desc: 'Runs once at frame start.' },
                      { id: 'repeat', title: 'Repeat Every', tone: 'amber', desc: 'Runs on a timer loop.' },
                      { id: 'if-collision', title: 'If Collision', tone: 'emerald', desc: 'Checks two objects touching.' },
                      { id: 'if-key', title: 'If Key Pressed', tone: 'violet', desc: 'Checks keyboard input.' },
                      { id: 'if-value', title: 'If Value Compare', tone: 'rose', desc: 'Checks a project value.' },
                      { id: 'else', title: 'Else', tone: 'slate', desc: 'Runs when conditions fail.' },
                    ].map(block => (
                      <button
                        key={block.id}
                        onClick={() => createEventFromBlock(block.id)}
                        className="w-full rounded-[26px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className={`text-[9px] font-black uppercase tracking-[0.32em] ${block.tone === 'blue' ? 'text-blue-600' : block.tone === 'amber' ? 'text-amber-600' : block.tone === 'emerald' ? 'text-emerald-600' : block.tone === 'violet' ? 'text-violet-600' : block.tone === 'rose' ? 'text-rose-600' : 'text-slate-400'}`}>
                          {block.id.replace(/-/g, ' ')}
                        </div>
                        <div className="mt-2 text-sm font-black text-slate-900">{block.title}</div>
                        <div className="mt-1 text-[12px] leading-relaxed text-slate-500">{block.desc}</div>
                      </button>
                    ))}
                  </aside>

                  <main className="space-y-4">
                    {currentFrame.events.map((event, idx) => (
                      <div
                        key={event.id}
                        className="rounded-[30px] border border-slate-200 bg-white shadow-sm overflow-hidden"
                        onContextMenu={(e) => handleContextMenu(e, 'event', event.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 bg-slate-50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-[10px] font-black text-white">
                              {idx + 1}
                            </div>
                            <input
                              type="text"
                              value={event.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentFrame({
                                  events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, name: val } : ev)
                                });
                              }}
                              className="w-full min-w-0 bg-transparent text-[14px] font-black text-slate-900 outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCurrentFrame({ events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, enabled: !ev.enabled } : ev) })}
                              className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] ${event.enabled ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-500'}`}
                            >
                              {event.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <button
                              onClick={() => {
                                updateCurrentFrame({ events: currentFrame.events.filter(ev => ev.id !== event.id) });
                              }}
                              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:border-red-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4 p-4 xl:grid-cols-3">
                          <section className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[9px] font-black uppercase tracking-[0.32em] text-amber-700">When</div>
                              <button onClick={() => setModalState({ type: 'condition', eventId: event.id, targetId: null })} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.24em] text-amber-700">+ Block</button>
                            </div>
                            <div className="mt-3 space-y-2">
                              {event.conditions.map((cond, cIdx) => (
                                <React.Fragment key={`${event.id}-cond-${cIdx}`}>
                                  <BlockRow
                                    tone="amber"
                                    icon={<Zap className="h-4 w-4" />}
                                    title={getConditionBlockLabel(cond)}
                                    subtitle={cond.targetId ? currentFrame.objects.find(o => o.id === cond.targetId)?.name || 'Target' : 'System block'}
                                    condition={cond}
                                    objects={currentFrame.objects}
                                    globalValues={project.globalValues}
                                    theme={settings.theme}
                                    onUpdate={(updatedData) => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? {
                                          ...ev,
                                          conditions: ev.conditions.map((c, idx) => idx === cIdx ? updatedData : c)
                                        } : ev)
                                      });
                                    }}
                                    onDelete={() => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, conditions: ev.conditions.filter((_, idx) => idx !== cIdx) } : ev)
                                      });
                                    }}
                                  />
                                </React.Fragment>
                              ))}
                            </div>
                          </section>

                          <section className="rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[9px] font-black uppercase tracking-[0.32em] text-emerald-700">Then</div>
                              <button onClick={() => setModalState({ type: 'action', eventId: event.id, targetId: currentFrame.objects[0]?.id || null })} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.24em] text-emerald-700">+ Block</button>
                            </div>
                            <div className="mt-3 space-y-2">
                              {event.actions.map((act, actIdx) => (
                                <React.Fragment key={act.id}>
                                  <BlockRow
                                    tone="emerald"
                                    icon={<Play className="h-4 w-4" />}
                                    title={getActionBlockLabel(act)}
                                    subtitle={currentFrame.objects.find(o => o.id === act.targetId)?.name || 'Object'}
                                    action={act}
                                    objects={currentFrame.objects}
                                    globalValues={project.globalValues}
                                    theme={settings.theme}
                                    onUpdate={(updatedData) => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? {
                                          ...ev,
                                          actions: ev.actions.map((a, idx) => idx === actIdx ? updatedData : a)
                                        } : ev)
                                      });
                                    }}
                                    onDelete={() => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, actions: ev.actions.filter((_, idx) => idx !== actIdx) } : ev)
                                      });
                                    }}
                                  />
                                </React.Fragment>
                              ))}
                            </div>
                          </section>

                          <section className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[9px] font-black uppercase tracking-[0.32em] text-slate-500">Else</div>
                              <button onClick={() => setModalState({ type: 'action_else', eventId: event.id, targetId: currentFrame.objects[0]?.id || null })} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.24em] text-slate-600">+ Block</button>
                            </div>
                            <div className="mt-3 space-y-2">
                              {(event.elseActions || []).map((act, actIdx) => (
                                <React.Fragment key={act.id}>
                                  <BlockRow
                                    tone="slate"
                                    icon={<Layers className="h-4 w-4" />}
                                    title={getActionBlockLabel(act)}
                                    subtitle={currentFrame.objects.find(o => o.id === act.targetId)?.name || 'Object'}
                                    action={act}
                                    objects={currentFrame.objects}
                                    globalValues={project.globalValues}
                                    theme={settings.theme}
                                    onUpdate={(updatedData) => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? {
                                          ...ev,
                                          elseActions: (ev.elseActions || []).map((a, idx) => idx === actIdx ? updatedData : a)
                                        } : ev)
                                      });
                                    }}
                                    onDelete={() => {
                                      updateCurrentFrame({
                                        events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, elseActions: (ev.elseActions || []).filter((_, idx) => idx !== actIdx) } : ev)
                                      });
                                    }}
                                  />
                                </React.Fragment>
                              ))}
                            </div>
                          </section>
                        </div>
                      </div>
                    ))}

                    {currentFrame.events.length === 0 && (
                      <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                        <Zap className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <h3 className="text-sm font-black text-slate-500">No events yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Start with a block on the left, like When Started or Repeat.</p>
                      </div>
                    )}
                  </main>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'grid' && (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto p-4 bg-[#f0f0f0]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 italic">
                    <Columns className="w-5 h-5 text-blue-600" />
                    Event List Editor
                  </h2>
                </div>
                <button 
                  onClick={addEvent}
                  className="bg-white border border-slate-300 px-4 py-1 rounded shadow-sm text-xs font-bold hover:bg-slate-50 active:translate-y-px transition-all"
                >
                  + New Event
                </button>
              </div>

              <div className="space-y-4">
                {currentFrame.events.map((event, idx) => (
                  <div 
                    key={event.id} 
                    className="bg-white border border-slate-400 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row group"
                    onContextMenu={(e) => handleContextMenu(e, 'event', event.id)}
                  >
                    <div className="w-full md:w-12 bg-slate-100 border-r border-slate-300 flex items-center justify-center font-black text-xs text-slate-400 py-2 md:py-0">
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 p-0">
                      <div className="bg-slate-50 px-3 py-1 border-b border-slate-200 flex justify-between items-center">
                        <input 
                          type="text" 
                          value={event.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentFrame({
                              events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, name: val } : ev)
                            })
                          }}
                          className="font-black text-[10px] uppercase bg-transparent border-none p-0 focus:ring-0 outline-none w-full tracking-widest"
                        />
                        <button 
                          onClick={() => {
                            updateCurrentFrame({
                              events: currentFrame.events.filter(ev => ev.id !== event.id)
                            })
                          }}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-slate-200 min-h-[60px]">
                        {/* Conditions */}
                        <div className="flex-1 p-3 space-y-2">
                          <div className="space-y-1">
                            {event.conditions.map((cond, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-2 py-1.5 px-2 bg-amber-50 rounded border border-amber-200 shadow-sm">
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-amber-900 uppercase tracking-tighter leading-none">{cond.type.replace('_', ' ')}</span>
                                  {cond.targetId && (
                                    <span className="text-[8px] text-amber-600 font-bold mt-0.5">
                                      [{currentFrame.objects.find(o => o.id === cond.targetId)?.name}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button 
                              onClick={() => setModalState({ type: 'condition', eventId: event.id, targetId: null })}
                              className="w-full py-1 text-[9px] font-black text-slate-400 border border-dashed border-slate-300 hover:bg-slate-100 transition-colors uppercase mt-1"
                            >
                              + Condition
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex-1 p-3 space-y-2">
                          <div className="space-y-1">
                            {event.actions.map((act) => (
                              <div key={act.id} className="flex items-center gap-2 py-1.5 px-2 bg-emerald-50 rounded border border-emerald-200 shadow-sm">
                                <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-emerald-900 uppercase tracking-tighter leading-none">{act.type.replace('_', ' ')}</span>
                                  <span className="text-[8px] text-emerald-600 font-bold mt-0.5">
                                    {currentFrame.objects.find(o => o.id === act.targetId)?.name || 'Object'}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => {
                                    updateCurrentFrame({
                                      events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, actions: ev.actions.filter(a => a.id !== act.id) } : ev)
                                    })
                                  }}
                                  className="ml-auto text-emerald-300 hover:text-red-500"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const types: ActionType[] = ['move_x', 'move_y', 'bounce', 'change_color', 'play_sound', 'add_global_value', 'destroy'];
                                const lastType = event.actions[event.actions.length - 1]?.type || 'move_x';
                                const nextIdx = (types.indexOf(lastType) + 1) % types.length;
                                const nextType = types[nextIdx];

                                const newAction = { 
                                  id: `act-${Date.now()}`, 
                                  type: nextType, 
                                  targetId: currentFrame.objects[0]?.id || '',
                                  params: nextType === 'change_color' ? { color: '#ef4444' } : (nextType === 'play_sound' ? { valueName: 'https://www.soundjay.com/buttons/sounds/button-3.mp3' } : { value: 1, valueName: 'Value 1' })
                                };
                                updateCurrentFrame({
                                  events: currentFrame.events.map(ev => ev.id === event.id ? { ...ev, actions: [...ev.actions, newAction] } : ev)
                                });
                              }}
                              className="w-full py-1 text-[9px] font-black text-slate-400 border border-dashed border-slate-300 hover:bg-slate-100 transition-colors uppercase mt-1"
                            >
                              + Action
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {currentFrame.events.length === 0 && (
                  <div className="py-20 text-center bg-white border border-slate-300 border-dashed rounded flex flex-col items-center">
                    <Zap className="w-8 h-8 text-slate-200 mb-2" />
                    <h3 className="text-sm font-bold text-slate-400">No events defined</h3>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'play' && (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col">
              <div className="p-4 flex justify-between items-center text-white border-b border-white/10 bg-slate-900">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block leading-none">{project.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-1 inline-block">ABCstudio Runtime</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('stage')} 
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Undo2 className="w-4 h-4" />
                  Close Debugger
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <div 
                  className="overflow-hidden shadow-2xl rounded-sm ring-1 ring-white/10"
                  style={{ width: project.settings.width, height: project.settings.height, backgroundColor: currentFrame.backgroundColor }}
                >
                  <GameRuntime project={project} setProject={setProject} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <motion.div 
              key="assets"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-hidden flex flex-col bg-[#f0f0f0]"
            >
              <div className="p-6 bg-white border-b border-slate-300 flex justify-between items-center">
                <div>
                   <h2 className="text-lg font-bold flex items-center gap-2">
                     <ImageIcon className="w-5 h-5 text-blue-600" />
                     Asset Manager
                   </h2>
                   <p className="text-xs text-slate-500 font-medium">Manage your external URLs and imported blueprints</p>
                   {/* Cloud section removed to focus on local ZIP workflow */}
                </div>
                <div className="flex gap-2">
                   <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const url = ev.target?.result as string;
                              if (currentUser) {
                                const assetData = {
                                  name: file.name,
                                  url,
                                  type: 'image',
                                  ownerId: currentUser.uid,
                                  createdAt: new Date().toISOString()
                                };
                                setDoc(doc(collection(db, 'assets')), assetData).then(() => loadUserAssets(currentUser.uid));
                              } else {
                                // Guest upload (session only)
                                const guestAsset = { 
                                  id: `guest-${Date.now()}`, 
                                  name: file.name, 
                                  url, 
                                  type: 'image',
                                  ownerId: 'guest'
                                };
                                setUserAssets(prev => [...prev, guestAsset]);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" />
                        Upload Image
                      </button>
                   </div>
                   
                   <div className="relative">
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const url = ev.target?.result as string;
                              if (currentUser) {
                                const assetData = {
                                  name: file.name,
                                  url,
                                  type: 'sound',
                                  ownerId: currentUser.uid,
                                  createdAt: new Date().toISOString()
                                };
                                setDoc(doc(collection(db, 'assets')), assetData).then(() => loadUserAssets(currentUser.uid));
                              } else {
                                const guestAsset = { 
                                  id: `guest-sound-${Date.now()}`, 
                                  name: file.name, 
                                  url, 
                                  type: 'sound',
                                  ownerId: 'guest'
                                };
                                setUserAssets(prev => [...prev, guestAsset]);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 pointer-events-none">
                        <Plus className="w-4 h-4" />
                        Add Sound
                      </button>
                   </div>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto space-y-8">
                 <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Code Extensions</h3>
                        <p className="text-xs font-medium text-slate-500">Build, edit and package JavaScript or Python modules directly inside the project.</p>
                      </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addExtensionPreset('javascript')}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-slate-900 text-white hover:bg-slate-800"
                      >
                          New JS
                        </button>
                        <button
                          onClick={() => addExtensionPreset('python')}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-amber-500 text-black hover:bg-amber-600"
                      >
                        New Python
                      </button>
                      <button
                        onClick={() => addScratchExtensionPreset()}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-orange-500 text-white hover:bg-orange-600"
                      >
                        Scratch Mode
                      </button>
                    </div>
                  </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {CODE_EXTENSION_CARDS.map(card => (
                        <button
                          key={card.id}
                          onClick={() => addExtensionPreset(card.language)}
                          className={`text-left rounded-3xl border border-slate-200 p-4 shadow-sm hover:shadow-lg transition-all ${card.accent}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden shrink-0">
                              <img src={card.icon} alt={card.title} className="w-full h-full object-contain p-2" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-black uppercase tracking-[0.35em] opacity-75">{card.subtitle}</div>
                              <h4 className="mt-1 text-lg font-black tracking-tight">{card.title}</h4>
                              <p className="mt-2 text-xs opacity-80 leading-relaxed">{card.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => addScratchExtensionPreset()}
                        className="text-left rounded-3xl border border-orange-200 p-4 shadow-sm hover:shadow-lg transition-all bg-white text-slate-900"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                            <img src={SCRATCH_EXTENSION_CARD.icon} alt={SCRATCH_EXTENSION_CARD.title} className="w-full h-full object-contain p-1.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-orange-500">{SCRATCH_EXTENSION_CARD.subtitle}</div>
                            <h4 className="mt-1 text-lg font-black tracking-tight">{SCRATCH_EXTENSION_CARD.title}</h4>
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{SCRATCH_EXTENSION_CARD.description}</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {EXTENSION_PRESETS.map(ext => (
                        <button
                          key={ext.id}
                          onClick={() => {
                            const next = addExtensionPreset(ext.language);
                            if (next) setSelectedExtensionId(next.id);
                          }}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{ext.language}</div>
                              <h4 className="font-black text-slate-800 mt-1">{ext.name}</h4>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                              Import
                            </div>
                          </div>
                          <pre className="mt-4 text-[11px] leading-relaxed font-mono text-slate-600 bg-white rounded-xl border border-slate-200 p-3 overflow-x-auto">{ext.code}</pre>
                        </button>
                      ))}
                    </div>
                    {Array.isArray(project.extensions) && project.extensions.length > 0 && (
                      <div className="mt-5 grid gap-3">
                        {project.extensions.map(ext => (
                          <button
                            key={ext.id}
                            onClick={() => {
                              setSelectedExtensionId(ext.id);
                              setAssetInspectorTab('extension');
                            }}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${selectedExtensionId === ext.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'}`}
                          >
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{ext.kind === 'scratch' ? 'scratch' : ext.language}</div>
                              <div className="font-bold text-sm text-slate-800">{ext.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${ext.kind === 'scratch' ? 'bg-orange-50 text-orange-600' : ext.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{ext.kind === 'scratch' ? 'Scratch' : ext.enabled ? 'Enabled' : 'Disabled'}</span>
                              <button
                                onClick={() => updateProject({ extensions: (project.extensions || []).filter(item => item.id !== ext.id) })}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </button>
                        ))}
                      </div>
                      )}
                    {selectedExtension && (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Editor</div>
                            <h4 className="font-black text-slate-800 text-lg">{selectedExtension.name}</h4>
                            {selectedExtension.kind === 'scratch' && (
                              <p className="mt-1 text-xs text-slate-500 max-w-lg">This extension turns the Event Editor into a Scratch-inspired blocks workspace. It does not run code; it controls the editor mode.</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${selectedExtension.kind === 'scratch' ? 'bg-orange-50 text-orange-600' : selectedExtension.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{selectedExtension.kind === 'scratch' ? 'Scratch' : selectedExtension.language}</span>
                            <button
                              onClick={() => {
                                const nextEnabled = !selectedExtension.enabled;
                                updateProject({
                                  extensions: (project.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, enabled: nextEnabled } : ext)
                                });
                                if (selectedExtension.kind === 'scratch' && nextEnabled) {
                                  setActiveTab('events');
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                            >
                              Toggle
                            </button>
                          </div>
                        </div>
                        {selectedExtension.kind === 'scratch' ? (
                          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
                            <div className="space-y-3">
                              <label className="block">
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Name</span>
                                <input
                                  value={selectedExtension.name}
                                  onChange={(e) => updateProject({
                                    extensions: (project.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, name: e.target.value } : ext)
                                  })}
                                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-orange-500"
                                />
                              </label>
                              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
                                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-500">Editor Mode</div>
                                <div className="mt-1 text-sm font-black text-slate-900">Scratch blocks workspace</div>
                                <p className="mt-1 text-xs text-slate-600">When enabled, the Event Editor switches to the Scratch-inspired block interface.</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setActiveTab('events')}
                                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                                >
                                  Open Blocks
                                </button>
                                <button
                                  onClick={() => updateProject({
                                    extensions: (project.extensions || []).filter(ext => ext.id !== selectedExtension.id)
                                  })}
                                  className="flex-1 px-3 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Preview</span>
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-500">Scratch Inspired</span>
                              </div>
                              <div className="rounded-[24px] border border-dashed border-orange-200 bg-orange-50/70 p-4">
                                <div className="text-sm font-black text-slate-900">Blocks First</div>
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                  This mode keeps the editor simple for beginners while using ABCstudio's own layout and behaviors.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="px-3 py-1 rounded-full bg-white border border-orange-200 text-[9px] font-black uppercase tracking-widest text-orange-600">When</span>
                                  <span className="px-3 py-1 rounded-full bg-white border border-orange-200 text-[9px] font-black uppercase tracking-widest text-orange-600">Then</span>
                                  <span className="px-3 py-1 rounded-full bg-white border border-orange-200 text-[9px] font-black uppercase tracking-widest text-orange-600">Else</span>
                                  <span className="px-3 py-1 rounded-full bg-white border border-orange-200 text-[9px] font-black uppercase tracking-widest text-orange-600">Repeat</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
                          <div className="space-y-3">
                            <label className="block">
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Name</span>
                              <input
                                value={selectedExtension.name}
                                onChange={(e) => updateProject({
                                  extensions: (project.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, name: e.target.value } : ext)
                                })}
                                className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-blue-500"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Language</span>
                              <select
                                value={selectedExtension.language}
                                onChange={(e) => updateProject({
                                  extensions: (project.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, language: e.target.value as ProgrammingLanguage } : ext)
                                })}
                                className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-blue-500"
                              >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                              </select>
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const copy: ProjectExtension = {
                                    ...selectedExtension,
                                    id: `ext-${Date.now()}`,
                                    name: `${selectedExtension.name} Copy`
                                  };
                                  updateProject({
                                    extensions: [...(project.extensions || []), copy]
                                  });
                                  setSelectedExtensionId(copy.id);
                                }}
                                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                              >
                                Duplicate
                              </button>
                              <button
                                onClick={() => updateProject({
                                  extensions: (project.extensions || []).filter(ext => ext.id !== selectedExtension.id)
                                })}
                                className="flex-1 px-3 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Code</span>
                              <span className="text-[9px] font-bold text-slate-500">Stored in the ZIP project</span>
                            </div>
                            <textarea
                              value={selectedExtension.code}
                              onChange={(e) => updateProject({
                                extensions: (project.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, code: e.target.value } : ext)
                              })}
                              className="w-full min-h-[280px] px-4 py-3 rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 font-mono text-[12px] leading-6 outline-none focus:border-blue-500 resize-y"
                              spellCheck={false}
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => setProject(prev => ({
                                  ...prev,
                                  extensions: (prev.extensions || []).map(ext => ext.id === selectedExtension.id ? { ...ext, code: `// TODO: ${ext.language}\n${ext.code}` } : ext)
                                }))}
                                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                              >
                                Add TODO banner
                              </button>
                              <button
                                onClick={() => saveToLocal()}
                                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                              >
                                Save Project
                              </button>
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                    <div className="mt-5 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors">
                        <FileUp className="w-4 h-4" />
                        Import JS / PY
                        <input
                          type="file"
                          accept=".js,.py,text/javascript,text/python"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void importExtensionCode(file);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      <p className="text-xs text-slate-500 font-medium">Imported code is stored inside the project ZIP.</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Images and Sounds</h3>
                        <p className="text-xs font-medium text-slate-500">Choose from the bundled asset folders or import them into the current project.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                          <Upload className="w-4 h-4" />
                          Import Asset
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.mp3,.wav,.ogg,.m4a,.aac,.flac,.glb,.gltf,.obj,.fbx,.stl,.dae,.3ds,.blend"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void importProjectLibraryFile(file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Assets / Library</div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Images</h4>
                          <span className="text-[10px] font-bold text-slate-500">{BUILTIN_LIBRARY.images.length} files</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {BUILTIN_LIBRARY.images.map(asset => (
                            <button
                              key={asset.id}
                              onClick={() => void addLibraryAssetFromBuiltin(asset)}
                              className="group text-left rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:border-blue-400 hover:shadow-md transition-all"
                            >
                              <div className="aspect-square rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                <img src={asset.src} alt={asset.name} className="w-full h-full object-contain p-2" />
                              </div>
                              <div className="mt-3">
                            <div className="font-black text-sm text-slate-800 truncate">{asset.name}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{asset.type.toUpperCase()}</div>
                          </div>
                          <div className="mt-3 text-[9px] font-black uppercase tracking-[0.25em] text-blue-600 group-hover:text-blue-700">
                            {selectedObjectId ? 'Assign to selected' : 'Add to frame'}
                          </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sounds</h4>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setShowRetroSynthModal(true);
                                applyRetroSynthPreset('laser');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Synthesize Retro Sound FX
                            </button>
                            <span className="text-[10px] font-bold text-slate-500">{BUILTIN_LIBRARY.sounds.length} files</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {BUILTIN_LIBRARY.sounds.map(asset => (
                            <button
                              key={asset.id}
                              onClick={() => void addLibraryAssetFromBuiltin(asset)}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-emerald-400 hover:shadow-md transition-all"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                                <Activity className="w-5 h-5" />
                              </div>
                              <div className="font-black text-sm text-slate-800 truncate">{asset.name}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{asset.type.toUpperCase()}</div>
                              <div className="mt-3 text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Import to project</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Project Library</h4>
                            <p className="text-xs font-medium text-slate-500">Editable assets stored inside this project package.</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{(project.libraryAssets || []).length} items</span>
                        </div>
                        {(project.libraryAssets || []).length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {(project.libraryAssets || []).map(asset => (
                              <button
                                key={asset.id}
                                onClick={() => void openLibraryAsset(asset.id)}
                                className={`rounded-2xl border p-3 text-left transition-all hover:shadow-md ${selectedLibraryAssetId === asset.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400'}`}
                              >
                                {asset.kind === 'image' ? (
                                  <div className="aspect-square rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    <img src={asset.sourceUrl} alt={asset.name} className="w-full h-full object-contain" style={previewImageStyles(asset)} />
                                  </div>
                                ) : asset.kind === 'sound' ? (
                                  <div className="aspect-square rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center text-white">
                                    <Activity className="w-8 h-8 text-emerald-400" />
                                  </div>
                                ) : (
                                  <div className="aspect-square rounded-xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white">
                                    <Box className="w-8 h-8 text-cyan-300" />
                                  </div>
                                )}
                                <div className="mt-3 font-black text-sm text-slate-800 truncate">{asset.name}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{asset.kind}</div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-10 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                            <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-400">No editable assets yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cloud Assets</h3>
                        <p className="text-xs font-medium text-slate-500">Legacy online asset shelf for logged-in users.</p>
                      </div>
                    </div>
                    {currentUser ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                         {userAssets.map(asset => (
                            <div key={asset.id} className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                               <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2 border border-slate-100 flex items-center justify-center">
                                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                               </div>
                               <div className="flex justify-between items-start gap-1">
                                  <div className="overflow-hidden">
                                     <span className="text-[10px] font-bold block truncate text-slate-700">{asset.name}</span>
                                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{asset.type}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      deleteDoc(doc(db, 'assets', asset.id)).then(() => loadUserAssets(currentUser.uid));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                               </div>
                               <button 
                                 onClick={() => {
                                   if (selectedObjectId) {
                                     if (asset.type === 'image') {
                                       updateObject(selectedObjectId, { imageUrl: asset.url });
                                     } else if (asset.type === 'sound') {
                                        alert("Sound assigned to assets library. Use 'Play Sound' action in Events to use it.");
                                     }
                                     setActiveTab('stage');
                                   } else {
                                     const newObj: GameObject = {
                                        id: `obj-${Date.now()}`,
                                        name: asset.name,
                                        x: 0,
                                        y: 0,
                                        width: 80,
                                        height: 80,
                                        rotation: 0,
                                        color: '#ffffff',
                                        imageUrl: asset.type === 'image' ? asset.url : undefined,
                                        type: 'active',
                                        opacity: 1,
                                        zIndex: currentFrame.objects.length + 1,
                                        alterableValues: [],
                                        isVisible: true,
                                        movement: { type: 'static', speed: 5, acceleration: 1, deceleration: 1 }
                                     };
                                     updateCurrentFrame({ objects: [...currentFrame.objects, newObj] });
                                     setSelectedObjectIds([newObj.id]);
                                     setActiveTab('stage');
                                   }
                                 }}
                                 className="w-full mt-2 py-1 bg-slate-100 rounded text-[9px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                               >
                                 {selectedObjectId ? 'ASSIGN TO SELECTED' : 'ADD TO FRAME'}
                               </button>
                            </div>
                         ))}
                         {userAssets.length === 0 && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                              <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                              <h3 className="text-sm font-bold text-slate-400">Your Asset Library is empty</h3>
                              <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto mt-1 uppercase font-bold tracking-tight">Upload images to use them in your games</p>
                            </div>
                         )}
                      </div>
                    ) : (
                      <div className="py-32 text-center">
                         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <ImageIcon className="w-10 h-10" />
                         </div>
                         <h2 className="text-xl font-bold text-slate-700">Imported Assets</h2>
                         <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">Use the Import ZIP button to load projects and their assets. Everything stays in your browser and your local files.</p>
                         <button onClick={() => fileInputRef.current?.click()} className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 mx-auto">
                           <Upload className="w-4 h-4" />
                           Import Project
                         </button>
                      </div>
                    )}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
    
    {/* Footer Status Bar */}
    <footer className="h-6 bg-[#f0f0f0] border-t border-slate-300 flex items-center px-3 justify-between shrink-0 font-mono text-[9px] text-slate-500 z-50">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
                <Layout className="w-2.5 h-2.5" />
                <span>FRAME: {currentFrame.name} ({currentFrame.width}x{currentFrame.height})</span>
            </div>
            <div className="flex items-center gap-1">
                <Box className="w-2.5 h-2.5" />
                <span>OBJECTS: {currentFrame.objects.length}</span>
            </div>
            <div className="flex items-center gap-1">
                <Monitor className="w-2.5 h-2.5" />
                <span>FPS: {project.settings.fps}</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <span className="bg-slate-200 px-2 rounded-full font-bold text-slate-600 uppercase tracking-tighter">ABCstudio Connected</span>
            <div className="flex items-center gap-1">
                <span className="uppercase text-[8px] font-black tracking-widest text-slate-400">Status:</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest">Connected</span>
            </div>
        </div>
    </footer>

    {/* Custom Context Menu */}
    <AnimatePresence>
      {contextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed z-[1000] bg-white border border-slate-200 shadow-2xl rounded-lg py-1 min-w-[180px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'project' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Options</span>
              </div>
              <ContextMenuItem 
                icon={<Type className="w-3.5 h-3.5 text-blue-500" />} 
                label="Rename Project" 
                onClick={() => {
                  const proj = localProjects.find(p => p.id === contextMenu.data);
                  if (proj) setRenameModal({ id: proj.id, name: proj.name, type: 'project', isOpen: true });
                }}
              />
              <ContextMenuItem 
                icon={<Copy className="w-3.5 h-3.5 text-emerald-500" />} 
                label="Duplicate Project" 
                onClick={() => duplicateLocalProject(contextMenu.data)}
              />
              <div className="h-[1px] bg-slate-100 my-1" />
              <ContextMenuItem 
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} 
                label="Delete Project" 
                onClick={() => {
                  const proj = localProjects.find(p => p.id === contextMenu.data);
                  if (proj) requestDeleteProject(proj.id, proj.name);
                }}
              />
            </>
          )}

          {contextMenu.type === 'object' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Object Options</span>
              </div>
              {selectedObjectIds.length === 1 && (
                <ContextMenuItem 
                  icon={<Type className="w-3.5 h-3.5 text-blue-500" />} 
                  label="Rename" 
                  onClick={() => {
                    const target = currentFrame.objects.find(o => o.id === contextMenu.data);
                    if (target) setRenameModal({ id: target.id, name: target.name, type: 'object', isOpen: true });
                  }}
                />
              )}
              <ContextMenuItem 
                icon={<Activity className="w-3.5 h-3.5 text-emerald-500" />} 
                label={selectedObjectIds.length > 1 ? "Duplicate Selection" : "Duplicate"} 
                onClick={() => duplicateObject(selectedObjectIds.length > 1 ? selectedObjectIds : contextMenu.data)}
              />
              <ContextMenuItem 
                icon={<Monitor className="w-3.5 h-3.5 text-slate-400" />} 
                label={selectedObjectIds.length > 1 ? "Lock/Unlock Selection" : (currentFrame.objects.find(o => o.id === contextMenu.data)?.isLocked ? "Unlock" : "Lock")} 
                onClick={() => {
                  const itemsToUpdate = selectedObjectIds.length > 1 ? selectedObjectIds : [contextMenu.data];
                  itemsToUpdate.forEach(id => {
                    const obj = currentFrame.objects.find(o => o.id === id);
                    if (obj) updateObject(id, { isLocked: !obj.isLocked });
                  });
                }}
              />
              <ContextMenuItem 
                icon={<Layers className="w-3.5 h-3.5 text-blue-500" />} 
                label={selectedObjectIds.length > 1 ? "Group Selection" : "Select Group"} 
                onClick={() => {
                  if (selectedObjectIds.length > 1) {
                    groupSelectedObjects();
                  } else {
                    const current = currentFrame.objects.find(o => o.id === contextMenu.data);
                    if (current?.groupId) {
                      setSelectedObjectIds(getGroupMembers(current.groupId).map(o => o.id));
                    }
                  }
                }}
              />
              <ContextMenuItem 
                icon={<Square className="w-3.5 h-3.5 text-slate-400" />} 
                label="Ungroup" 
                onClick={() => ungroupSelectedObjects()}
              />
              <div className="h-[1px] bg-slate-100 my-1" />
              <ContextMenuItem 
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} 
                label={selectedObjectIds.length > 1 ? "Delete Selection" : "Delete"} 
                onClick={() => deleteObject(selectedObjectIds.length > 1 ? selectedObjectIds : contextMenu.data)}
              />
            </>
          )}

          {contextMenu.type === 'frame' && (
            <>
              <div className={`px-3 py-1.5 border-b shadow-sm ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Frame Options</span>
              </div>
              <ContextMenuItem 
                theme={settings.theme}
                icon={<Activity className="w-3.5 h-3.5 text-blue-500" />} 
                label="Make Active" 
                onClick={() => {
                  const idx = project.frames.findIndex(f => f.id === contextMenu.data);
                  if (idx !== -1) updateProject({ currentFrameIndex: idx });
                }}
              />
              <ContextMenuItem 
                theme={settings.theme}
                icon={<Type className="w-3.5 h-3.5 text-blue-500" />} 
                label="Rename Frame" 
                onClick={() => {
                  const frame = project.frames.find(f => f.id === contextMenu.data);
                  if (frame) setRenameModal({ id: frame.id, name: frame.name, type: 'frame', isOpen: true });
                }}
              />
              <ContextMenuItem 
                theme={settings.theme}
                icon={<Square className="w-3.5 h-3.5 text-emerald-500" />} 
                label="Duplicate Frame" 
                onClick={() => {
                  const frame = project.frames.find(f => f.id === contextMenu.data);
                  if (frame) {
                    const newFrame = { ...JSON.parse(JSON.stringify(frame)), id: `frame-${Date.now()}`, name: `${frame.name} (copy)` };
                    updateProject({ frames: [...project.frames, newFrame] });
                  }
                }}
              />
              <div className={`h-[1px] my-1 ${settings.theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />
              <ContextMenuItem 
                theme={settings.theme}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} 
                label="Delete Frame" 
                onClick={() => {
                  const frame = project.frames.find(f => f.id === contextMenu.data);
                  if (project.frames.length > 1 && frame) {
                    setDeleteConfirm({ id: frame.id, name: frame.name, kind: 'frame' });
                  }
                }}
              />
            </>
          )}

          {contextMenu.type === 'globalValue' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Variable Options</span>
              </div>
              <ContextMenuItem 
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} 
                label="Delete Variable" 
                onClick={() => {
                  const newVals = project.globalValues?.filter(v => v.id !== contextMenu.data) || [];
                  updateProject({ globalValues: newVals });
                }}
              />
              <ContextMenuItem 
                icon={<Undo2 className="w-3.5 h-3.5 text-slate-400" />} 
                label="Reset Value" 
                onClick={() => {
                  const newVals = project.globalValues?.map(v => v.id === contextMenu.data ? { ...v, value: 0 } : v) || [];
                  updateProject({ globalValues: newVals });
                }}
              />
            </>
          )}

          {contextMenu.type === 'canvas' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canvas Actions</span>
              </div>
              <ContextMenuItem 
                icon={<Plus className="w-3.5 h-3.5 text-blue-500" />} 
                label="Insert Sprite" 
                onClick={() => addObject('active')}
              />
              <ContextMenuItem 
                icon={<Type className="w-3.5 h-3.5 text-emerald-500" />} 
                label="Insert Text" 
                onClick={() => addObject('string')}
              />
              <ContextMenuItem 
                icon={<Activity className="w-3.5 h-3.5 text-slate-400" />} 
                label="Paste" 
                disabled={!objectClipboard}
                onClick={() => {
                  if (objectClipboard) {
                    const newObj: GameObject = {
                      ...JSON.parse(JSON.stringify(objectClipboard)),
                      id: `obj-${Date.now()}`,
                      x: (contextMenu.x - 256) / zoom, // Accounting for sidebar
                      y: (contextMenu.y - 40) / zoom,  // Accounting for toolbar
                      name: `${objectClipboard.name} (copy)`
                    };
                    updateCurrentFrame({ objects: [...currentFrame.objects, newObj] });
                  }
                }}
              />
            </>
          )}

          {contextMenu.type === 'event' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Event Options</span>
              </div>
              <ContextMenuItem 
                icon={<Activity className="w-3.5 h-3.5 text-blue-500" />} 
                label="Duplicate Event" 
                onClick={() => {
                  const event = currentFrame.events.find(ev => ev.id === contextMenu.data);
                  if (event) {
                    const newEvent = { ...JSON.parse(JSON.stringify(event)), id: `event-${Date.now()}`, name: `${event.name} (copy)` };
                    updateCurrentFrame({ events: [...currentFrame.events, newEvent] });
                  }
                }}
              />
              <ContextMenuItem 
                icon={<Monitor className="w-3.5 h-3.5 text-slate-400" />} 
                label={currentFrame.events.find(ev => ev.id === contextMenu.data)?.enabled ? "Disable Event" : "Enable Event"} 
                onClick={() => {
                  const newEvents = currentFrame.events.map(ev => ev.id === contextMenu.data ? { ...ev, enabled: !ev.enabled } : ev);
                  updateCurrentFrame({ events: newEvents });
                }}
              />
              <div className="h-[1px] bg-slate-100 my-1" />
              <ContextMenuItem 
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} 
                label="Delete Event" 
                onClick={() => {
                  updateCurrentFrame({ events: currentFrame.events.filter(ev => ev.id !== contextMenu.data) });
                }}
              />
            </>
          )}

          {contextMenu.type === 'sidebar' && (
            <>
              <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ABCstudio Explorer</span>
              </div>
              <ContextMenuItem 
                icon={<Plus size={14} className="text-blue-500" />} 
                label="New Frame" 
                  onClick={() => {
                  const newFrame: GameFrame = {
                    id: `frame-${Date.now()}`,
                    name: getNextAvailableName('Back Unnamed ', project.frames.map(frame => frame.name)),
                    objects: [],
                    events: [],
                    backgroundColor: '#f8fafc',
                    width: 800,
                    height: 600
                  };
                  updateProject({ frames: [...project.frames, newFrame] });
                }}
              />
              <ContextMenuItem 
                icon={<Activity size={14} className="text-emerald-500" />} 
                label="New Global Variable" 
                onClick={() => {
                   const newVar = { id: `gv-${Date.now()}`, name: `Value ${project.globalValues.length + 1}`, value: 0 };
                   updateProject({ globalValues: [...project.globalValues, newVar] });
                }}
              />
              <div className="h-[1px] bg-slate-100 my-1" />

            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Event Editor Modals */}
    <Modal 
      isOpen={modalState.type !== null} 
      onClose={() => setModalState({ type: null, eventId: null, targetId: null })}
      title={modalState.type === 'condition' ? 'Add Condition Block' : (modalState.type === 'action' ? 'Add Action Block' : modalState.type === 'action_else' ? 'Add Else Block' : 'User Settings')}
    >
      {modalState.type === 'settings' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appearance</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
                className={`flex-1 py-2 rounded-xl border-2 transition-all text-xs font-bold ${settings.theme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400'}`}
              >
                Light
              </button>
              <button 
                onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
                className={`flex-1 py-2 rounded-xl border-2 transition-all text-xs font-bold ${settings.theme === 'dark' ? 'border-indigo-600 bg-indigo-900 text-white' : 'border-slate-200 text-slate-400'}`}
              >
                Dark
              </button>
            </div>
          </div>



          <div className="pt-4 flex flex-col gap-2">
             <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
             >
               <Upload className="w-4 h-4" />
               IMPORT PROJECT (.ZIP)
             </button>
             <button 
              onClick={exportProjectToZip}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
             >
               <Download className="w-4 h-4" />
               EXPORT PROJECT (.ZIP)
             </button>
             <button 
              onClick={logout}
              className="w-full bg-white text-red-500 border border-red-200 py-3 rounded-xl font-black text-xs hover:bg-red-50 transition-all mt-4"
             >
               SIGN OUT
             </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {modalState.type === 'condition' ? (
            <>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Trigger Blocks</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { type: 'at_start_of_frame' as ConditionType, label: 'When Started', description: 'Runs once when the frame starts.' },
                  { type: 'timer' as ConditionType, label: 'Repeat Every 1s', description: 'Runs again and again on a timer.' },
                  { type: 'collision' as ConditionType, label: 'If Collision', description: 'Checks if two objects are touching.' },
                  { type: 'key_down' as ConditionType, label: 'If Key Pressed', description: 'Checks the keyboard.' },
                  { type: 'value_compare' as ConditionType, label: 'If Value Compare', description: 'Checks a project value.' },
                  { type: 'screen_edge' as ConditionType, label: 'If Touching Edge', description: 'Checks the frame boundary.' },
                ].map(c => (
                  <button
                    key={c.type}
                    onClick={() => {
                      const newCond: GameCondition = { 
                        type: c.type,
                        targetId: currentFrame.objects[0]?.id,
                      };
                      if (c.type === 'collision') newCond.params = { targetId2: currentFrame.objects[1]?.id };
                      if (c.type === 'key_down') newCond.params = { keyCode: 'ArrowRight' };
                      if (c.type === 'timer') newCond.params = { interval: 1 };
                      if (c.type === 'value_compare') newCond.params = { valueName: project.globalValues[0]?.name || 'Score', operator: '>', value: 0 };
                      if (c.type === 'screen_edge') newCond.params = { edge: 'left' };
                      updateCurrentFrame({
                        events: currentFrame.events.map(ev => ev.id === modalState.eventId ? { ...ev, conditions: [...ev.conditions, newCond] } : ev)
                      });
                      setModalState({ type: null, eventId: null, targetId: null });
                    }}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{c.label}</div>
                        <div className="mt-1 text-[12px] leading-relaxed text-slate-500">{c.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Action Blocks</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { type: 'move_x' as ActionType, label: 'Move X', icon: <ChevronRight className="w-4 h-4" />, description: 'Moves an object horizontally.' },
                  { type: 'move_y' as ActionType, label: 'Move Y', icon: <Plus className="w-4 h-4 rotate-90" />, description: 'Moves an object vertically.' },
                  { type: 'bounce' as ActionType, label: 'Bounce', icon: <Undo2 className="w-4 h-4" />, description: 'Reverses movement.' },
                  { type: 'change_color' as ActionType, label: 'Set Color', icon: <Palette className="w-4 h-4" />, description: 'Changes object color.' },
                  { type: 'play_sound' as ActionType, label: 'Play Sound', icon: <Activity className="w-4 h-4" />, description: 'Plays an audio asset.' },
                  { type: 'destroy' as ActionType, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, description: 'Removes the object.' },
                  { type: 'add_global_value' as ActionType, label: 'Increase Value', icon: <Activity className="w-4 h-4" />, description: 'Adds to a global value.' },
                  { type: 'set_visible' as ActionType, label: 'Show / Hide', icon: <Eye className="w-4 h-4" />, description: 'Toggles visibility.' },
                ].map(a => (
                  <button
                    key={a.type}
                    onClick={() => {
                      appendActionToEvent(modalState.eventId, modalState.targetId, a.type, modalState.type === 'action_else' ? 'elseActions' : 'actions');
                      setModalState({ type: null, eventId: null, targetId: null });
                    }}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        {a.icon}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{a.label}</div>
                        <div className="mt-1 text-[12px] leading-relaxed text-slate-500">{a.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>

    <AnimatePresence>
      {zipProcessing.active && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
        >
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {zipProcessing.type === 'export' ? <Download className="w-6 h-6 text-blue-500" /> : zipProcessing.type === 'save' ? <Save className="w-6 h-6 text-blue-500" /> : <Upload className="w-6 h-6 text-blue-500" />}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                {zipProcessing.type === 'export' ? 'Exporting Project' : zipProcessing.type === 'save' ? 'Saving Project' : 'Importing Project'}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-2">
                {zipProcessing.type === 'export' 
                  ? 'Bundling animations, physics, and logic into your .zip file...' 
                  : zipProcessing.type === 'save'
                    ? 'Writing the full project package and refreshing local storage...'
                  : 'Extracting project data and rebuilding your game world...'}
              </p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8 }}
                className="bg-blue-600 h-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {renameModal.isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setRenameModal(prev => ({ ...prev, isOpen: false }))}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl ${settings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Type className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-black uppercase tracking-tighter ${settings.theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                Rename {renameModal.type}
              </h3>
            </div>

            <div className="mb-6">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>New Name</label>
              <input 
                autoFocus
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none font-bold shadow-sm ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-500 focus:bg-white text-slate-800'}`}
                value={renameModal.name}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRenameModal(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameModal.name.trim()) {
                      if (renameModal.type === 'project') renameLocalProject(renameModal.id, renameModal.name);
                      if (renameModal.type === 'object') updateObject(renameModal.id, { name: renameModal.name });
                      if (renameModal.type === 'frame') {
                        const newFrames = project.frames.map(f => f.id === renameModal.id ? { ...f, name: renameModal.name } : f);
                        updateProject({ frames: newFrames });
                      }
                      setRenameModal(prev => ({ ...prev, isOpen: false }));
                    }
                  }
                  if (e.key === 'Escape') setRenameModal(prev => ({ ...prev, isOpen: false }));
                }}
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setRenameModal(prev => ({ ...prev, isOpen: false }))}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${settings.theme === 'dark' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                CANCEL
              </button>
              <button 
                onClick={() => {
                  if (renameModal.type === 'project') renameLocalProject(renameModal.id, renameModal.name);
                  if (renameModal.type === 'object') updateObject(renameModal.id, { name: renameModal.name });
                  if (renameModal.type === 'frame') {
                    const newFrames = project.frames.map(f => f.id === renameModal.id ? { ...f, name: renameModal.name } : f);
                    updateProject({ frames: newFrames });
                  }
                  setRenameModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                SAVE CHANGES
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tighter ${settings.theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  Delete {deleteConfirm.kind === 'frame' ? 'Frame' : 'Project'}
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-[0.25em] ${settings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {deleteConfirm.kind === 'frame' ? 'This will remove the frame from the storyboard' : 'This will remove the project ZIP from disk'}
                </p>
              </div>
            </div>

            <div className={`mb-6 p-4 rounded-2xl border ${settings.theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1">{deleteConfirm.kind === 'frame' ? 'Frame' : 'Project'}</div>
              <div className="font-bold text-sm truncate">{deleteConfirm.name}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${settings.theme === 'dark' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const target = deleteConfirm;
                  setDeleteConfirm(null);
                  if (target.kind === 'frame') {
                    updateProject({
                      frames: project.frames.filter(frame => frame.id !== target.id),
                      currentFrameIndex: Math.max(0, Math.min(project.currentFrameIndex, project.frames.length - 2))
                    });
                  } else {
                    void deleteLocalProject(target.id);
                  }
                }}
                className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                DELETE {deleteConfirm.kind === 'frame' ? 'FRAME' : 'PROJECT'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {selectedProjectLibraryAsset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
          onClick={() => setSelectedLibraryAssetId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 24 }}
            className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Asset Editor</div>
                <h3 className="text-xl font-black text-slate-900">{selectedProjectLibraryAsset.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-slate-900 text-white">
                  {selectedProjectLibraryAsset.kind}
                </span>
                <button
                  onClick={() => setSelectedLibraryAssetId(null)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 bg-slate-100">
                {selectedProjectLibraryAsset.kind === 'image' ? (
                  <div className="space-y-4">
                    <div className="rounded-[28px] bg-white border border-slate-200 p-4 shadow-sm">
                      <div className="aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img
                          src={selectedProjectLibraryAsset.sourceUrl}
                          alt={selectedProjectLibraryAsset.name}
                          className="max-h-full max-w-full object-contain"
                          style={previewImageStyles(selectedProjectLibraryAsset)}
                        />
                      </div>
                    </div>
                    <div className="rounded-[28px] bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                      {([
                        ['brightness', 'Brightness'],
                        ['contrast', 'Contrast'],
                        ['saturation', 'Saturation'],
                        ['grayscale', 'Grayscale'],
                        ['hueRotate', 'Hue rotate'],
                        ['blur', 'Blur'],
                        ['rotate', 'Rotate']
                      ] as const).map(([key, label]) => (
                        <label key={key} className="block">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {String(selectedProjectLibraryAsset.editorState?.image?.[key] ?? 0)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={key === 'blur' ? 0 : key === 'rotate' ? -180 : 0}
                            max={key === 'blur' ? 20 : key === 'rotate' ? 180 : key === 'hueRotate' ? 360 : key === 'grayscale' ? 100 : 200}
                            value={selectedProjectLibraryAsset.editorState?.image?.[key] ?? 0}
                            onChange={(e) => updateLibraryAsset(selectedProjectLibraryAsset.id, {
                              editorState: {
                                ...selectedProjectLibraryAsset.editorState,
                                image: {
                                  ...(selectedProjectLibraryAsset.editorState?.image || makeDefaultAssetEditorState('image').image!),
                                  [key]: Number(e.target.value)
                                }
                              }
                            })}
                            className="w-full accent-blue-600"
                          />
                        </label>
                      ))}
                      <div className="flex gap-3">
                        {(['flipX', 'flipY'] as const).map(flag => (
                          <button
                            key={flag}
                            onClick={() => updateLibraryAsset(selectedProjectLibraryAsset.id, {
                              editorState: {
                                ...selectedProjectLibraryAsset.editorState,
                                image: {
                                  ...(selectedProjectLibraryAsset.editorState?.image || makeDefaultAssetEditorState('image').image!),
                                  [flag]: !selectedProjectLibraryAsset.editorState?.image?.[flag]
                                }
                              }
                            })}
                            className={`flex-1 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${selectedProjectLibraryAsset.editorState?.image?.[flag] ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {flag === 'flipX' ? 'Flip X' : 'Flip Y'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : selectedProjectLibraryAsset.kind === 'sound' ? (
                  <div className="space-y-4">
                    <div className="rounded-[28px] bg-white border border-slate-200 p-4 shadow-sm">
                      <div className="aspect-video rounded-2xl border border-slate-200 bg-slate-950 flex items-center justify-center">
                        <div className="text-center">
                          <Activity className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                          <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Sound Preview</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[28px] bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                      <audio
                        controls
                        src={selectedProjectLibraryAsset.sourceUrl}
                        className="w-full"
                        style={{ filter: `opacity(${selectedProjectLibraryAsset.editorState?.sound?.volume ?? 100}%)` }}
                      />
                      {([
                        ['volume', 'Volume', 0, 100],
                        ['playbackRate', 'Playback Rate', 25, 200],
                        ['trimStart', 'Trim Start', 0, 100],
                        ['trimEnd', 'Trim End', 0, 100]
                      ] as const).map(([key, label, min, max]) => (
                        <label key={key} className="block">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {String(selectedProjectLibraryAsset.editorState?.sound?.[key] ?? 0)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            value={selectedProjectLibraryAsset.editorState?.sound?.[key] ?? 0}
                            onChange={(e) => updateLibraryAsset(selectedProjectLibraryAsset.id, {
                              editorState: {
                                ...selectedProjectLibraryAsset.editorState,
                                sound: {
                                  ...(selectedProjectLibraryAsset.editorState?.sound || makeDefaultAssetEditorState('sound').sound!),
                                  [key]: Number(e.target.value)
                                }
                              }
                            })}
                            className="w-full accent-emerald-600"
                          />
                        </label>
                      ))}
                      <button
                        onClick={() => updateLibraryAsset(selectedProjectLibraryAsset.id, {
                          editorState: {
                            ...selectedProjectLibraryAsset.editorState,
                            sound: {
                              ...(selectedProjectLibraryAsset.editorState?.sound || makeDefaultAssetEditorState('sound').sound!),
                              loop: !selectedProjectLibraryAsset.editorState?.sound?.loop
                            }
                          }
                        })}
                        className={`w-full py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${selectedProjectLibraryAsset.editorState?.sound?.loop ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                      >
                        {selectedProjectLibraryAsset.editorState?.sound?.loop ? 'Loop On' : 'Loop Off'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-[28px] bg-slate-50 border border-slate-200 p-5 space-y-4">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Asset Name</span>
                    <input
                      value={selectedProjectLibraryAsset.name}
                      onChange={(e) => updateLibraryAsset(selectedProjectLibraryAsset.id, { name: e.target.value })}
                      className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Source File</span>
                    <input
                      value={selectedProjectLibraryAsset.originalFileName || ''}
                      readOnly
                      className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500 outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (selectedProjectLibraryAsset.kind === 'image') {
                          void bakeImageAssetEdits(selectedProjectLibraryAsset);
                        } else if (selectedProjectLibraryAsset.kind === 'sound') {
                          setSaveMessage('Sound settings saved');
                          setTimeout(() => setSaveMessage(null), 1500);
                        }
                      }}
                      className="py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        if (selectedProjectLibraryAsset.kind === 'image') {
                          if (selectedObjectId) {
                            updateObject(selectedObjectId, { imageUrl: selectedProjectLibraryAsset.sourceUrl });
                          } else {
                            const newObj: GameObject = {
                              id: `obj-${Date.now()}`,
                              name: selectedProjectLibraryAsset.name,
                              x: 0,
                              y: 0,
                              width: 96,
                              height: 96,
                              rotation: 0,
                              color: '#ffffff',
                              imageUrl: selectedProjectLibraryAsset.sourceUrl,
                              type: 'active',
                              opacity: 1,
                              zIndex: currentFrame.objects.length + 1,
                              alterableValues: [],
                              isVisible: true,
                              movement: { type: 'static', speed: 0, acceleration: 0, deceleration: 0 }
                            };
                            updateCurrentFrame({ objects: [...currentFrame.objects, newObj] });
                          }
                          setActiveTab('stage');
                        } else if (selectedProjectLibraryAsset.kind === 'sound') {
                          setSaveMessage('Use this sound from the Play Sound action');
                          setTimeout(() => setSaveMessage(null), 1800);
                        } else {
                          importLibraryAssetToFrame(selectedProjectLibraryAsset);
                        }
                      }}
                      className="py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedLibraryAssetId(null)}
                      className="py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        const nextAssets = (project.libraryAssets || []).filter(asset => asset.id !== selectedProjectLibraryAsset.id);
                        updateProject({ libraryAssets: nextAssets });
                        setLibraryAssets(nextAssets);
                        setSelectedLibraryAssetId(null);
                      }}
                      className="py-3 rounded-2xl bg-red-600 text-white text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Notes</div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    This asset lives inside the project package, so its edited state travels with the ZIP and stays portable.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {showCreateProjectModal && (
      <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className={`w-full max-w-xl rounded-[32px] border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
          {/* Header */}
          <div className={`p-6 border-b flex justify-between items-center ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Create New Engine Project</h3>
                <p className="text-xs font-semibold text-slate-450">Configure your clean slate sandbox template</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateProjectModal(false)}
              className="p-2 h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Project Name</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={createProjectNameInput}
                  onChange={(e) => setCreateProjectNameInput(e.target.value)}
                  className={`flex-1 border px-4 py-3 text-sm font-bold outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'}`}
                  placeholder="e.g. Gravity Jump Extreme"
                />
                <button
                  type="button"
                  onClick={() => setCreateProjectNameInput(generateRandomProjectName())}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest border rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 ${settings.theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-indigo-400' : 'border-slate-200 hover:bg-slate-50 text-indigo-600'}`}
                >
                  🎲 Shuffle
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Starter Blueprint / Template</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateProjectTemplateId('empty')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${createProjectTemplateId === 'empty' ? 'border-indigo-500 bg-indigo-50/10 shadow-lg' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'}`}
                >
                  <span className="text-xs font-black uppercase tracking-tight block">Clean Slate</span>
                  <span className="text-[10px] font-medium text-slate-400 block mt-1 leading-snug">A pristine blank canvas for direct canvas creation.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateProjectTemplateId('physics-balls')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${createProjectTemplateId === 'physics-balls' ? 'border-emerald-500 bg-emerald-50/10 shadow-lg' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'}`}
                >
                  <span className="text-xs font-black uppercase tracking-tight block">Gravity Chamber</span>
                  <span className="text-[10px] font-medium text-slate-400 block mt-1 leading-snug">Matter-JS physics initialized with ground and elastic ball.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateProjectTemplateId('retro-clicker')}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all ${createProjectTemplateId === 'retro-clicker' ? 'border-purple-500 bg-purple-50/10 shadow-lg' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'}`}
                >
                  <span className="text-xs font-black uppercase tracking-tight block">Arcade Clicker</span>
                  <span className="text-[10px] font-medium text-slate-400 block mt-1 leading-snug">Includes click handlers, scoring, and sound outputs.</span>
                </button>
              </div>
            </div>

            {/* Configs (Dimensions) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Canvas Width</label>
                <input 
                  type="number" 
                  value={createProjectWidth}
                  onChange={(e) => setCreateProjectWidth(Math.max(100, parseInt(e.target.value) || 0))}
                  className={`w-full border px-3 py-2 text-xs font-bold outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white animate-pulse-subtle' : 'bg-white border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Canvas Height</label>
                <input 
                  type="number" 
                  value={createProjectHeight}
                  onChange={(e) => setCreateProjectHeight(Math.max(100, parseInt(e.target.value) || 0))}
                  className={`w-full border px-3 py-2 text-xs font-bold outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Rate</label>
                <select 
                  value={createProjectFps}
                  onChange={(e) => setCreateProjectFps(parseInt(e.target.value) || 60)}
                  className={`w-full border px-3 py-2 text-xs font-bold outline-none rounded-xl ${settings.theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                >
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                  <option value={120}>120 FPS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 border-t flex justify-end gap-3 ${settings.theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-slate-100 bg-slate-50'}`}>
            <button 
              type="button"
              onClick={() => setShowCreateProjectModal(false)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${settings.theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={() => {
                const name = createProjectNameInput.trim() || generateRandomProjectName();
                const newProj = createNewProjectCustom(name, createProjectWidth, createProjectHeight, createProjectFps, createProjectTemplateId);
                saveToLocal(newProj);
                setHistory({ past: [], future: [] });
                setActiveTab('stage');
                setShowCreateProjectModal(false);
              }}
              className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              🚀 Initialize Base
            </button>
          </div>
        </div>
      </div>
    )}

    {showRetroSynthModal && (
      <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">8-Bit Sound FX Synth</h3>
                <p className="text-xs font-semibold text-slate-400">Generate Sfxr-style arcade synthesizer sounds instantly</p>
              </div>
            </div>
            <button 
              onClick={() => setShowRetroSynthModal(false)}
              className="p-2 h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Presets Grid */}
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block mb-3">Quick Presets</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.keys(SYNTH_PRESETS).map(presetKey => (
                  <button
                    key={presetKey}
                    onClick={() => applyRetroSynthPreset(presetKey)}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:border-emerald-500 hover:bg-emerald-500/5 hover:text-emerald-500 transition-all font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300"
                  >
                    {presetKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Wave Types */}
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block mb-2.5">Oscillator Shape</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {(["square", "sine", "triangle", "sawtooth", "noise"] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setRetroSynthWaveType(w)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${retroSynthWaveType === w ? "bg-emerald-600 text-white shadow" : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50"}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Name */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block">Asset Label / File Name</span>
                  <input
                    type="text"
                    value={retroSoundName}
                    onChange={(e) => setRetroSoundName(e.target.value)}
                    placeholder="e.g. laser_fire"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold"
                  />
                </div>

                {/* Envelope Sliders */}
                <div className="space-y-3.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block">ADSR Envelope</span>
                  {/* Attack */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Attack Time</span>
                      <span>{retroSynthAttack.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range" min="0.001" max="0.5" step="0.01"
                      value={retroSynthAttack}
                      onChange={(e) => setRetroSynthAttack(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                  {/* Sustain */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Sustain Time</span>
                      <span>{retroSynthSustain.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range" min="0.01" max="1.0" step="0.01"
                      value={retroSynthSustain}
                      onChange={(e) => setRetroSynthSustain(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                  {/* Decay */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Decay Time</span>
                      <span>{retroSynthDecay.toFixed(2)}s</span>
                    </div>
                    <input
                      type="range" min="0.01" max="1.0" step="0.01"
                      value={retroSynthDecay}
                      onChange={(e) => setRetroSynthDecay(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Pitch & Modulation */}
              <div className="space-y-4">
                <div className="space-y-3.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block">Frequency & Pitch Glide</span>
                  {/* Frequency */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Base Frequency</span>
                      <span>{Math.floor(retroSynthBaseFreq)} Hz</span>
                    </div>
                    <input
                      type="range" min="50" max="2500" step="10"
                      value={retroSynthBaseFreq}
                      onChange={(e) => setRetroSynthBaseFreq(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                  {/* Pitch Glide */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Pitch Glide Ramp</span>
                      <span>{retroSynthPitchSlide > 0 ? "+" : ""}{retroSynthPitchSlide.toFixed(3)}</span>
                    </div>
                    <input
                      type="range" min="-0.05" max="0.05" step="0.001"
                      value={retroSynthPitchSlide}
                      onChange={(e) => setRetroSynthPitchSlide(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Vibrato */}
                <div className="space-y-3.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] block">Vibrato</span>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block">Depth</span>
                      <input
                        type="range" min="0" max="30" step="1"
                        value={retroSynthVibratoDepth}
                        onChange={(e) => setRetroSynthVibratoDepth(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block">Speed</span>
                      <input
                        type="range" min="0" max="20" step="1"
                        value={retroSynthVibratoSpeed}
                        onChange={(e) => setRetroSynthVibratoSpeed(parseFloat(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Low Pass Filter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span>Low Pass Filter Cutoff</span>
                    <span>{retroSynthLpfCutoff === 20000 ? "Bypass" : `${Math.floor(retroSynthLpfCutoff)} Hz`}</span>
                  </div>
                  <input
                    type="range" min="300" max="20000" step="100"
                    value={retroSynthLpfCutoff}
                    onChange={(e) => setRetroSynthLpfCutoff(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
            <button
              onClick={triggerRetroSynthPreview}
              className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              Play Audio Preview
            </button>
            <button
              onClick={saveRetroSynthSound}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              Commit & Add to Library
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Floating Gemini Copilot Trigger Widget */}
    <div className="fixed bottom-6 right-6 z-[9990]">
      <button
        onClick={() => setCopilotOpen(!copilotOpen)}
        className={`h-12 w-12 rounded-full flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${copilotOpen ? "bg-rose-500 text-white" : "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white"}`}
      >
        {copilotOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border border-indigo-600 animate-pulse" />
          </div>
        )}
      </button>
    </div>

    {/* Gemini Chat Copilot drawer */}
    {copilotOpen && (
      <div className="fixed right-6 bottom-20 w-80 sm:w-96 h-[500px] z-[9991] bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-tr from-indigo-900 to-indigo-950 text-white flex items-center justify-between border-b dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-xs font-black uppercase tracking-[0.2em] leading-none block">ABCstudio</span>
              <span className="text-[10px] font-black opacity-60 uppercase tracking-widest leading-none mt-1 inline-block">AI Intelligent Copilot</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[#D3E3FD]">Gemini Assistant</span>
          </div>
        </div>

        {/* Quick suggestions */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
          <button
            onClick={() => setCopilotInput("Write onStart logic for elastic bounce")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[8px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-400 cursor-pointer"
          >
            Bounce logic
          </button>
          <button
            onClick={() => setCopilotInput("How does runtime.playSound work?")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[8px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-400 cursor-pointer"
          >
            Audio help
          </button>
          <button
            onClick={() => setCopilotInput("Explain Matter JS config values")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[8px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-400 cursor-pointer"
          >
            Matter Values
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
          {copilotHistory.map((chat, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${chat.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div
                className={`px-4 py-2.5 rounded-[18px] text-xs leading-relaxed font-semibold break-words border ${
                  chat.sender === "user"
                    ? "bg-slate-900 text-white border-slate-900 rounded-br-none"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 rounded-bl-none"
                }`}
              >
                {chat.text.includes("```") ? (
                  <div className="space-y-2">
                    <p>{chat.text.split("```")[0]}</p>
                    <pre className="p-2 rounded bg-slate-900 text-emerald-400 text-[10px] font-mono overflow-x-auto select-all max-w-full">
                      <code>{chat.text.split("```")[1]?.replace(/^[a-zA-Z]+\n/, "")}</code>
                    </pre>
                    <p>{chat.text.split("```")[2]}</p>
                  </div>
                ) : (
                  chat.text
                )}
              </div>
              <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">
                {chat.sender === "user" ? "Explorer" : "Copilot AI"}
              </span>
            </div>
          ))}
          {copilotLoading && (
            <div className="flex gap-2 items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-[70%]">
              <Bot className="w-4 h-4 text-indigo-500 animate-bounce" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thinking & Generating...</span>
            </div>
          )}
        </div>

        {/* Input control */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
          <input
            type="text"
            value={copilotInput}
            onChange={(e) => setCopilotInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void triggerCopilotPrompt()}
            placeholder="Ask AI Copilot for help..."
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={triggerCopilotPrompt}
            disabled={copilotLoading}
            className="p-2 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 hover:bg-slate-900 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}

    <AnimatePresence>
      {shapePickerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
          onClick={() => {
            setShapePickerOpen(false);
            setShapePickerTargetId(null);
            setShapePickerMode('library');
            setCustomShapeDraft(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-full max-w-[1380px] h-[85vh] flex flex-col overflow-hidden rounded-[24px] border border-slate-800 bg-[#16171a] shadow-3xl text-slate-300 font-sans select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Blender-style Slate Toolbar */}
            <div className="flex flex-col gap-4 border-b border-[#24252a] bg-[#111215] px-6 py-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] px-2 py-0.5 bg-[#f57c00]/10 text-[#f57c00] border border-[#f57c00]/20 rounded-md">
                      MESH FACTURE
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">v2.4p</span>
                  </div>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    {shapePickerMode === 'custom' ? 'BLENDER EDIT MODE // VECTOR LAB' : 'ASSET BROWSER // GEOMETRY LIBRARY'}
                  </h3>
                </div>
              </div>

              {/* Segmented Modes Control (Blender Style Workspace tabs) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#1c1d22] p-1 border border-[#2b2c34] rounded-xl self-start">
                  <button
                    onClick={() => {
                      setShapePickerMode('library');
                      setShapeBuilderTool('reshape');
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${shapePickerMode === 'library' ? 'bg-[#2d2e34] text-white shadow-md border border-[#3e3f46]' : 'text-slate-400 hover:text-white hover:bg-[#1a1b1f] border border-transparent'}`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    Library Explorer
                  </button>
                  <button
                    onClick={() => {
                      setShapePickerMode('custom');
                      setShapeBuilderTool('reshape');
                      if (!customShapeDraft) setCustomShapeDraft(createDefaultCustomShapeDraft());
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${shapePickerMode === 'custom' ? 'bg-[#f57c00] text-white shadow-lg shadow-[#f57c00]/20 border border-[#f57c00]/50' : 'text-slate-400 hover:text-white hover:bg-[#1a1b1f] border border-transparent'}`}
                  >
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Vertex Mesh Modeler
                  </button>
                </div>

                <div className="w-px h-6 bg-[#2d2e34]" />

                <button
                  onClick={() => {
                    setShapePickerOpen(false);
                    setShapePickerTargetId(null);
                    setShapePickerMode('library');
                    setShapeBuilderTool('reshape');
                    setSelectedShapePointIndices([]);
                    setCustomShapeDraft(null);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2b2c34] bg-[#1c1d22] text-slate-400 hover:text-white hover:bg-rose-600/10 hover:border-rose-500/30 transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {shapePickerMode === 'library' ? (
              /* --- BEAUTIFUL BENTO LIBRARY MANAGER --- */
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)_260px] min-h-0 bg-[#16171a]">
                
                {/* Left Outliner/Quick Actions Panel */}
                <aside className="border-r border-[#24252a] bg-[#111215] p-5 flex flex-col gap-4 overflow-y-auto">
                  <div className="rounded-2xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f57c00]">Active Entity</div>
                    <div className="mt-2 text-sm font-black text-white truncate">{shapeBuilderTarget?.name || 'Unnamed Item'}</div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                      Apply reference primitive templates or construct completely custom vector architecture.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#f57c00] mb-3">Modeler Launcher</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                        Quickly instantiate default meshes or clear existing geometry back to coordinate root bounds.
                      </p>
                    </div>

                    <div className="space-y-2 mt-auto">
                      <button
                        onClick={() => {
                          setCustomShapeDraft(createDefaultCustomShapeDraft());
                          setShapePickerMode('custom');
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#f57c00] hover:bg-[#ff8f00] py-3 text-[10px] font-black uppercase tracking-wider text-white transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Custom Shape
                      </button>
                      
                      <button
                        onClick={() => { if (shapePickerTargetId) updateObject(shapePickerTargetId, { shapeType: 'rectangle', customShape: undefined }); }}
                        className="w-full rounded-xl border border-[#2d2e34] bg-[#1e2025] hover:bg-[#282a30] px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all"
                      >
                        Reset to Square
                      </button>
                    </div>
                  </div>
                </aside>

                {/* Center Content: Primitive & Presets Grid */}
                <main className="p-6 overflow-y-auto flex-1 bg-[#16171a] custom-scrollbar">
                  <div className="space-y-6">
                    {/* Search Field */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[#24252a] bg-[#111215] px-4 py-3 shadow-inner focus-within:border-[#f57c00]/50 focus-within:ring-1 focus-within:ring-[#f57c00]/20 transition-all">
                      <Search className="h-4 w-4 text-slate-500" />
                      <input
                        value={shapeBuilderSearch}
                        onChange={(e) => setShapeBuilderSearch(e.target.value)}
                        placeholder="Search standard and custom shape presets..."
                        className="w-full bg-transparent text-sm font-semibold outline-none text-white placeholder-slate-600"
                      />
                    </div>

                    <div className="space-y-8">
                      {/* User Stored Assets */}
                      {filteredCustomShapeLibrary.length > 0 && (
                        <section className="space-y-3">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f57c00]">User Vault</div>
                              <p className="mt-1 text-xs text-slate-400">Locally stored custom geometry definitions.</p>
                            </div>
                            <div className="text-[9px] font-mono uppercase tracking-wider text-slate-550">{filteredCustomShapeLibrary.length} items</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredCustomShapeLibrary.map(shape => (
                              <React.Fragment key={shape.id || `${shape.name}-${shape.createdAt || ''}`}>
                                <CustomShapeLibraryCard
                                  shape={shape}
                                  theme="dark"
                                  selected={shapeBuilderTarget?.customShape?.id === shape.id}
                                  onPick={() => {
                                    if (shapePickerTargetId) {
                                      updateObject(shapePickerTargetId, {
                                        shapeType: 'custom',
                                        customShape: {
                                          id: shape.id,
                                          name: shape.name,
                                          kind: 'polygon',
                                          fill: shape.fill,
                                          createdAt: shape.createdAt,
                                          points: shape.points.map(point => ({ ...point }))
                                        },
                                        color: shape.fill || shapeBuilderTarget?.color || '#3b82f6'
                                      });
                                    }
                                    loadCustomShapeTemplate(shape);
                                  }}
                                />
                              </React.Fragment>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Built-in Sections */}
                      {SHAPE_LIBRARY_SECTIONS.map(section => {
                        const sectionShapes = filteredShapeLibrary.filter(shape => section.ids.includes(shape.id));
                        if (sectionShapes.length === 0) return null;
                        return (
                          <section key={section.title} className="space-y-3">
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{section.title}</div>
                                <p className="mt-1 text-xs text-slate-400">{section.description}</p>
                              </div>
                              <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{sectionShapes.length} templates</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                              {sectionShapes.map(shape => (
                                <React.Fragment key={shape.id}>
                                  <ShapeLibraryCard
                                    shape={shape}
                                    theme="dark"
                                    selected={shapeBuilderTarget?.shapeType === shape.id}
                                    onPick={() => {
                                      if (shapePickerTargetId) {
                                        updateObject(shapePickerTargetId, { shapeType: shape.id, customShape: undefined });
                                      }
                                      setShapePickerMode('custom');
                                      setShapeBuilderTool('reshape');
                                      if (!customShapeDraft) setCustomShapeDraft(createDefaultCustomShapeDraft());
                                    }}
                                  />
                                </React.Fragment>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                </main>

                {/* Right Side Info Panel */}
                <aside className="border-l border-[#24252a] bg-[#111215] p-5 flex flex-col gap-4 overflow-y-auto">
                  <div className="rounded-2xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Library Palette</div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {['#3b82f6', '#10b981', '#f97316', '#ef4444', '#a855f7', '#14b8a6', '#f59e0b', '#94a3b8', '#1e293b', '#ffffff'].map(color => (
                        <button
                          key={color}
                          onClick={() => setCustomShapeDraft(prev => prev ? { ...prev, fill: color } : { ...createDefaultCustomShapeDraft(), fill: color })}
                          className={`h-7 rounded-lg border shadow-sm transition-transform hover:scale-110 ${customShapeDraft?.fill === color ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-[#2d2e34]'}`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm flex-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Preset Info</div>
                    <ul className="mt-3 space-y-2.5 text-xs text-slate-400 font-medium">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f57c00]" />
                        Apply presets instantaneously to active frame entity
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f57c00]" />
                        Retains size parameters and spatial scales
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f57c00]" />
                        Allows complete conversion into custom curve vector edit mod
                      </li>
                    </ul>
                  </div>
                </aside>
              </div>
            ) : (
              /* --- REVOLUTIONARY BLENDER-STYLE INTERACTIVE GEOMETRY COMPOSER --- */
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_260px] bg-[#16171a] overflow-hidden min-h-0">
                
                {/* Left Sidebar: Blender toolbox shelf */}
                <aside className="border-r border-[#24252a] bg-[#111215] p-4 flex flex-col gap-5 overflow-y-auto">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-slate-500 font-mono">
                      Edit Tools - Mesh
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'select', label: 'Select', shortcut: 'S', icon: <MousePointer2 className="h-4 w-4" /> },
                        { id: 'reshape', label: 'Vertex', shortcut: 'V', icon: <Square className="h-4 w-4" /> },
                        { id: 'add', label: 'Draw Pen', shortcut: 'P', icon: <Plus className="h-4 w-4" /> },
                        { id: 'delete', label: 'Erase', shortcut: 'E', icon: <Trash2 className="h-4 w-4" /> },
                        { id: 'transform', label: 'Scale', shortcut: 'G', icon: <Maximize2 className="h-4 w-4" /> },
                        { id: 'curve-smooth', label: 'Smooth', shortcut: 'O', icon: <Activity className="h-4 w-4 text-[#f57c00]" /> },
                        { id: 'curve-corner', label: 'Corner', shortcut: 'C', icon: <Type className="h-4 w-4 text-sky-400" /> }
                      ].map(tool => {
                        const active = shapeBuilderTool === tool.id;
                        const isCurveToggle = tool.id.startsWith('curve-');
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              if (isCurveToggle) {
                                if (selectedShapePointIndices.length > 0) {
                                  selectedShapePointIndices.forEach(idx => {
                                    updateCustomShapePointCurve(idx, tool.id === 'curve-smooth' ? 'smooth' : 'corner');
                                  });
                                }
                              } else {
                                setShapeBuilderTool(tool.id as any);
                                if (tool.id !== 'reshape' && tool.id !== 'transform') setSelectedShapePointIndices([]);
                              }
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all group relative ${
                              active 
                                ? 'bg-[#f57c00] border-[#f57c00] text-white shadow-lg shadow-[#f57c00]/20' 
                                : isCurveToggle && selectedShapePointIndices.length === 0
                                  ? 'cursor-not-allowed opacity-30 bg-[#16171a] border-[#202125] text-slate-600'
                                  : 'bg-[#1e2025] border-[#292a30] text-slate-400 hover:border-[#f57c00] hover:text-white hover:bg-[#25272e]'
                            }`}
                            title={`${tool.label} (${tool.shortcut})`}
                          >
                            <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                              {tool.icon}
                            </div>
                            <div className="text-center">
                              <div className="text-[8.5px] font-black uppercase tracking-tight">{tool.label}</div>
                            </div>
                            <span className="absolute top-1 right-1.5 font-mono text-[7px] text-slate-600 font-extrabold">{tool.shortcut}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Outliner: Vertices structure display with manual input scrubbers */}
                  <div className="flex-1 flex flex-col min-h-0 bg-[#0c0d0f] rounded-2xl p-3.5 border border-[#24252a]/80">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 font-mono">Outliner Points</div>
                      <span className="px-2 py-0.5 rounded bg-[#202126] text-[9px] font-mono text-slate-400 font-bold">{customShapeDraft?.points.length || 0}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {customShapeDraft?.points.map((point, index) => {
                        const selected = selectedShapePointIndices.includes(index);
                        return (
                          <div 
                            key={index}
                            onClick={() => setSelectedShapePointIndices([index])}
                            className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                              selected 
                                ? 'bg-[#f57c00]/10 border-[#f57c00]/50' 
                                : 'bg-[#131416]/50 border-transparent hover:border-[#2b2c32]'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shadow-inner ${selected ? 'bg-[#f57c00] text-white' : 'bg-[#1b1c20] text-slate-500'}`}>
                              V{index + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-2 text-center">
                              <div className="bg-[#1b1c20] text-[10px] py-1 rounded-md font-mono text-[#f57c00] font-black">
                                X: {Math.round(point.x)}
                              </div>
                              <div className="bg-[#1b1c20] text-[10px] py-1 rounded-md font-mono text-cyan-400 font-black">
                                Y: {Math.round(point.y)}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeCustomShapePoint(index); }}
                              className="text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                {/* Center: Blender 3D Viewport with Origin Axes Lines */}
                <main className="p-4 overflow-hidden flex flex-col gap-4 flex-1">
                  
                  {/* Viewport bar / Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-full border border-[#24252a] bg-[#111215] shadow-md shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-[#f57c00]" />
                        <input 
                          value={customShapeDraft?.name || ''} 
                          onChange={e => setCustomShapeDraft(prev => prev ? {...prev, name: e.target.value} : prev)}
                          className="bg-transparent border-none p-0 text-xs font-black text-white outline-none w-36 focus:ring-0"
                          placeholder="Asset Mesh Alias"
                        />
                      </div>
                      <div className="h-6 w-px bg-[#2d2e34]" />
                      
                      {/* Active point status HUD indicator */}
                      {selectedShapePointIndices.length === 1 && (
                        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] bg-[#1a1b20] border border-[#2d2e34] py-1 px-3 rounded-md">
                          <span className="text-[#f57c00]">ACTIVE INDEX: V{selectedShapePointIndices[0] + 1}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-300">X: {Math.round(customShapeDraft?.points[selectedShapePointIndices[0]]?.x || 0)}%</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-300">Y: {Math.round(customShapeDraft?.points[selectedShapePointIndices[0]]?.y || 0)}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => setEditorShowGrid(!editorShowGrid)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          editorShowGrid ? 'bg-[#f57c00] text-white shadow-[#f57c00]/20 shadow-md' : 'bg-[#1c1d22] text-slate-400 hover:bg-[#2b2c34]'
                        }`}
                      >
                        <Grid2X2 className="w-3.5 h-3.5" />
                        Grid Guidelines
                      </button>
                      
                      <button 
                        onClick={() => setEditorSnapToGrid(!editorSnapToGrid)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          editorSnapToGrid ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#1c1d22] text-slate-400 hover:bg-[#2b2c34]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Snap Grid
                      </button>

                      <div className="flex items-center gap-1 bg-[#1e2025] p-1 rounded-full border border-[#2d2e34]">
                        <button 
                          onClick={() => setEditorSymmetryX(!editorSymmetryX)}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${editorSymmetryX ? 'bg-[#f57c00] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                          title="Mirror Left/Right Symmetry"
                        >
                          <Split className="w-3 h-3 rotate-90" />
                        </button>
                        <button 
                          onClick={() => setEditorSymmetryY(!editorSymmetryY)}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${editorSymmetryY ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                          title="Mirror Up/Down Symmetry"
                        >
                          <Split className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Area: Blender Viewport screen with red X line and green Y line */}
                  <div className="flex-1 relative rounded-[18px] bg-[#1e1e24] shadow-3xl select-none overflow-hidden flex items-center justify-center border border-[#2b2c34] transition-all">
                    
                    {/* Viewport Grid System */}
                    {editorShowGrid && (
                      <div className="absolute inset-0 pointer-events-none opacity-[0.06] transition-opacity" style={{
                        backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                        backgroundSize: `${editorGridSize}% ${editorGridSize}%`
                      }} />
                    )}

                    {/* RED Center axis (X-axis in Blender matching Y value coordinate center) */}
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-rose-500/30 pointer-events-none flex items-center px-4 justify-between" style={{ transform: 'translateY(-50%)' }}>
                      <span className="font-mono text-[8px] text-rose-500/60 tracking-wider">X ORIGIN RED-LINE</span>
                      <span className="font-mono text-[8px] text-rose-500/45 text-right">0.0V</span>
                    </div>

                    {/* GREEN Center axis (Y-axis in Blender matching X value coordinate center) */}
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-emerald-500/30 pointer-events-none flex flex-col justify-between py-4" style={{ transform: 'translateX(-50%)' }}>
                      <span className="font-mono text-[8px] text-emerald-500/60 tracking-wider rotate-90 origin-left pl-6">Y ORIGIN GREEN-LINE</span>
                      <span className="font-mono text-[8px] text-emerald-500/40 text-center">0.0H</span>
                    </div>

                    <div 
                      ref={shapePreviewRef}
                      onPointerDown={handleShapeCanvasPointerDown}
                      onPointerMove={(e) => {
                        const rect = shapePreviewRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setEdgeHover(findNearestEdge(x, y));
                      }}
                      onPointerLeave={() => setEdgeHover(null)}
                      className="absolute inset-0 z-10"
                      style={{ cursor: shapeBuilderTool === 'add' ? 'crosshair' : 'default' }}
                    >
                      {/* Box Selection Visual */}
                      {isBoxSelecting && boxSelectStart && boxSelectEnd && (
                        <div 
                          className="absolute border-2 border-[#f57c00] bg-[#f57c00]/10 rounded z-50 pointer-events-none"
                          style={{
                            left: `${Math.min(boxSelectStart.x, boxSelectEnd.x)}%`,
                            top: `${Math.min(boxSelectStart.y, boxSelectEnd.y)}%`,
                            width: `${Math.abs(boxSelectStart.x - boxSelectEnd.x)}%`,
                            height: `${Math.abs(boxSelectStart.y - boxSelectEnd.y)}%`,
                          }}
                        />
                      )}

                      {/* Actual Custom Shape with beautiful mesh visual */}
                      <div className="absolute inset-0 flex items-center justify-center p-16">
                        <div className="relative w-full h-full">
                           {/* Mesh Fill */}
                           <motion.div 
                            layout
                            className="absolute inset-0 transition-all duration-300 shadow-2xl rounded-sm"
                            style={{
                              clipPath: customShapeDraft?.points.length 
                                ? (hasCustomShapeCurves(customShapeDraft) 
                                    ? `path("${buildCurvedCustomShapePath(customShapeDraft.points)}")` 
                                    : `polygon(${customShapeDraft.points.map(p => `${p.x}% ${p.y}%`).join(', ')})`) 
                                : undefined,
                              backgroundColor: customShapeDraft?.fill || '#3b82f6',
                            }}
                           />

                           {/* Outline mesh wireframes */}
                           <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                              {hasCustomShapeCurves(customShapeDraft) ? (
                                <path 
                                  d={buildCurvedCustomShapePath(customShapeDraft?.points || [])}
                                  className="fill-none stroke-[#f57c00]/50 stroke-[1.5px]"
                                  style={{ strokeDasharray: '4 3' }}
                                />
                              ) : (
                                <polygon 
                                  points={customShapeDraft?.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                                  className="fill-none stroke-[#f57c00]/50 stroke-[1.5px]"
                                  style={{ strokeDasharray: '4 3' }}
                                />
                              )}
                           </svg>

                           {/* Ghost pen node indicator on wireframe edge */}
                           {edgeHover && shapeBuilderTool === 'add' && (
                             <div 
                               className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-white z-40 pointer-events-none opacity-80 animate-ping"
                               style={{ left: `${edgeHover.x}%`, top: `${edgeHover.y}%` }}
                             />
                           )}

                           {/* Dynamic Blender Orange vertices layout node anchors */}
                           {customShapeDraft?.points.map((point, index) => {
                             const isSelected = selectedShapePointIndices.includes(index);
                             return (
                               <motion.button
                                key={index}
                                layoutId={`node-${index}`}
                                transition={{ type: 'spring', damping: 25, stiffness: 280, mass: 0.5 }}
                                onPointerDown={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  if (shapeBuilderTool === 'delete') {
                                    removeCustomShapePoint(index);
                                  } else {
                                    const rect = shapePreviewRef.current?.getBoundingClientRect();
                                    const mx = rect ? ((e.clientX - rect.left) / rect.width) * 100 : point.x;
                                    const my = rect ? ((e.clientY - rect.top) / rect.height) * 100 : point.y;
                                    
                                    if (e.shiftKey) {
                                      setSelectedShapePointIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
                                    } else {
                                      if (!selectedShapePointIndices.includes(index)) setSelectedShapePointIndices([index]);
                                    }
                                    startDraggingShapePoint(index, mx, my);
                                  }
                                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group/node cursor-grab active:cursor-grabbing"
                                style={{ 
                                  left: `${point.x}%`, 
                                  top: `${point.y}%`,
                                  transition: draggingShapePointIndex === null ? 'left 0.1s cubic-bezier(0.4, 0, 0.2, 1), top 0.1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                                }}
                               >
                                  {/* Vertex design: selected is golden yellow with orange shadow */}
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                                    isSelected 
                                      ? 'bg-amber-400 border-white shadow-[0_0_10px_#f57c00] scale-125 z-30 ring-4 ring-[#f57c00]/25' 
                                      : 'bg-white border-[#1e2025] group-hover/node:border-[#f57c00] group-hover/node:scale-125'
                                  }`} />
                                  
                                  {/* Micro Coordinate HUD Popover */}
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded shadow-md bg-slate-950/90 border border-[#2b2c32] text-[8px] font-mono text-white pointer-events-none opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap z-50">
                                     X: {Math.round(point.x)} : Y: {Math.round(point.y)}
                                  </div>
                               </motion.button>
                             );
                           })}
                        </div>
                      </div>
                    </div>
                  </div>
                </main>

                {/* Right Sidebar: Styles stack and finalize buttons */}
                <aside className="border-l border-[#24252a] bg-[#111215] p-5 flex flex-col gap-4 overflow-y-auto">
                  
                  {/* Color & Tint Selector block */}
                  <div className="rounded-xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 font-mono mb-2">Material Tint</div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                       {['#3b82f6', '#10b981', '#f57c00', '#f43f5e', '#a855f7', '#1e293b', '#64748b', '#ffffff'].map(c => (
                         <button 
                          key={c}
                          onClick={() => setCustomShapeDraft(prev => prev ? {...prev, fill: c} : prev)}
                          className={`w-6 h-6 rounded border-2 transition-all ${customShapeDraft?.fill === c ? 'border-amber-500 scale-110 shadow-sm' : 'border-[#2d2e34]'}`}
                          style={{ backgroundColor: c }}
                         />
                       ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-full h-8 rounded-lg overflow-hidden border border-[#2d2e34] cursor-pointer">
                        <input 
                          type="color" 
                          value={customShapeDraft?.fill || '#3b82f6'} 
                          onChange={e => setCustomShapeDraft(prev => prev ? {...prev, fill: e.target.value} : prev)}
                          className="absolute inset-0 w-full h-full scale-125 cursor-pointer opacity-100 border-none p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matrix Modifiers buttons */}
                  <div className="rounded-xl border border-[#24252a] bg-[#18191d] p-4 shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 font-mono mb-3">System Modifier</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setCustomShapeDraft(prev => prev ? {...prev, points: prev.points.map(p => ({...p, x: 100-p.x}))} : prev)}
                        className="p-2 bg-[#1b1c20] hover:bg-[#25272e] rounded-lg text-[9px] font-black uppercase text-slate-300 border border-[#2d2e34] active:scale-95 transition-all text-center"
                      >
                        FLIP HORIZ
                      </button>
                      <button 
                        onClick={() => setCustomShapeDraft(prev => prev ? {...prev, points: prev.points.map(p => ({...p, y: 100-p.y}))} : prev)}
                        className="p-2 bg-[#1b1c20] hover:bg-[#25272e] rounded-lg text-[9px] font-black uppercase text-slate-300 border border-[#2d2e34] active:scale-95 transition-all text-center"
                      >
                        FLIP VERTIC
                      </button>
                    </div>
                  </div>

                  {/* Finalization Section: Safe, clean, proportional */}
                  <div className="flex-1 flex flex-col min-h-0 bg-[#f57c00]/5 rounded-2xl p-4 border border-[#f57c00]/15 mt-auto">
                     <div className="text-[9px] font-black uppercase tracking-widest text-[#f57c00] font-mono mb-1.5">Asset Finalize</div>
                     <p className="text-[10px] leading-relaxed text-slate-400 font-medium mb-4">
                        Push changes to the canvas model, or register alternative layouts within the user vault.
                     </p>
                     
                     <div className="space-y-2.5 mt-auto">
                        <button 
                          onClick={applyCustomShapeDraft}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-[#f57c00] hover:bg-[#ff8f00] text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg shadow-[#f57c00]/15"
                        >
                          {customShapeDraft?.libraryId ? 'Update Preset Mesh' : 'Push Vector Shape'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        
                        <button 
                          onClick={saveCustomShapeTemplate}
                          className="w-full py-2 bg-[#111215] border border-[#2b2c34] text-slate-300 hover:text-white hover:bg-[#1b1c21] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          Commit as Template
                        </button>

                        <button 
                          onClick={() => {
                            setShapePickerOpen(false);
                            setShapePickerTargetId(null);
                            setCustomShapeDraft(null);
                          }}
                          className="w-full py-2 bg-transparent text-slate-500 hover:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          Cancel / Discard
                        </button>
                     </div>
                  </div>
                </aside>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {deletedProjectBackup && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-8 right-8 z-[9999] bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 px-4 py-3 flex items-center gap-4 max-w-md"
        >
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Project deleted</div>
            <div className="text-sm font-bold truncate max-w-[220px]">{deletedProjectBackup.name}</div>
          </div>
          <button
            onClick={() => void restoreDeletedProject()}
            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
          >
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
}

function ToolbarButton({ 
  icon, 
  label, 
  title,
  active, 
  disabled,
  theme,
  className,
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  title?: string,
  active?: boolean, 
  disabled?: boolean,
  theme?: 'light' | 'dark',
  className?: string,
  onClick?: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`flex flex-col items-center justify-center gap-1 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-200 group shrink-0 ${className} 
        ${disabled ? 'opacity-25 cursor-not-allowed' : 
          (active ? 'bg-indigo-600 text-white shadow-md' : 
            (theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'))}`}
    >
      <div className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-indigo-500'}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-tight truncate w-full text-center leading-none">{label}</span>
    </button>
  );
}

function ContextMenuItem({ icon, label, onClick, disabled, danger, theme }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean, danger?: boolean, theme?: 'light' | 'dark' }) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); if(!disabled) onClick(); }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold transition-all group shrink-0
        ${disabled ? 'opacity-30 cursor-not-allowed' : (danger ? 'hover:bg-rose-500 hover:text-white text-rose-500' : 'hover:bg-indigo-600 hover:text-white')} 
        ${theme === 'dark' && !disabled && !danger ? 'text-slate-300' : (theme !== 'dark' && !disabled && !danger ? 'text-slate-700' : '')}
      `}
    >
      <div className={`w-4 h-4 shrink-0 transition-colors ${danger ? 'text-rose-500' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')} group-hover:text-white`}>{icon}</div>
      <span className="flex-1 text-left truncate">{label}</span>
      {!disabled && !danger && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white" />}
    </button>
  );
}

function NavItem({ 
  icon, 
  label, 
  active,
  theme,
  onClick
}: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean,
  theme?: 'light' | 'dark',
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all group 
        ${active ? (theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/50 shadow-lg' : 'bg-white shadow-md ring-1 ring-slate-200 text-indigo-600') : 
                   (theme === 'dark' ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900')}`}
    >
      <div className={`transition-all duration-200 group-hover:scale-110 ${active ? (theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500') : 'text-slate-400'}`}>{icon}</div>
      <span className="uppercase tracking-widest leading-none truncate">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
    </button>
  );
}

function PropTab({ icon, active, title, theme, onClick }: { icon: React.ReactNode, active?: boolean, title?: string, theme?: 'light' | 'dark', onClick?: () => void }) {
  return (
    <button 
      title={title}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 transition-all relative group
        ${active ? (theme === 'dark' ? 'bg-slate-800/80 text-indigo-400' : 'bg-white text-indigo-600 shadow-sm') : 
                   (theme === 'dark' ? 'bg-transparent text-slate-500 hover:text-slate-300' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50')}`}
    >
      <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>
      {active && (
        <motion.div 
          layoutId="proptab_indicator" 
          className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.4)]" 
        />
      )}
    </button>
  );
}

function hasCurvedCustomShape(customShape?: CustomShapeDefinition | null) {
  return Boolean(customShape?.points?.some(point => point.curve === 'smooth' || point.handleIn || point.handleOut));
}

const normalizeShapeId = (shapeType?: string) => (shapeType || '').replace(/-(soft|bold)$/, '');

function buildCurvedCustomShapePath(points: CustomShapePoint[]) {
  if (points.length < 2) return '';
  const first = points[0];
  let path = `M ${first.x} ${first.y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const prevOut = prev.handleOut || prev.handleIn || prev;
    const currentIn = current.handleIn || current.handleOut || current;
    const hasCurve = prev.curve === 'smooth' || current.curve === 'smooth' || prev.handleOut || current.handleIn || prev.handleIn || current.handleOut;
    path += hasCurve
      ? ` C ${prevOut.x} ${prevOut.y}, ${currentIn.x} ${currentIn.y}, ${current.x} ${current.y}`
      : ` L ${current.x} ${current.y}`;
  }
  const last = points[points.length - 1];
  const lastOut = last.handleOut || last.handleIn || last;
  const firstIn = first.handleIn || first.handleOut || first;
  const closeCurve = last.curve === 'smooth' || first.curve === 'smooth' || last.handleOut || first.handleIn || last.handleIn || first.handleOut;
  path += closeCurve
    ? ` C ${lastOut.x} ${lastOut.y}, ${firstIn.x} ${firstIn.y}, ${first.x} ${first.y} Z`
    : ' Z';
  return path;
}

const RUNTIME_PHYSICS_PRESETS = {
  static: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 1, restitution: 0, frictionAir: 0.02 },
  rigid: { bodyType: 'rectangle', isStatic: false, density: 0.005, friction: 0.8, restitution: 0.05, frictionAir: 0.01 },
  bouncy: { bodyType: 'circle', isStatic: false, density: 0.001, friction: 0.05, restitution: 0.85, frictionAir: 0.005 },
  slippery: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.01, restitution: 0.08, frictionAir: 0.001 },
  heavy: { bodyType: 'rectangle', isStatic: false, density: 0.02, friction: 0.5, restitution: 0.02, frictionAir: 0.02 },
  ice: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0.001, restitution: 0.01, frictionAir: 0.0005 },
  ghost: { bodyType: 'rectangle', isStatic: false, density: 0.001, friction: 0, restitution: 0, frictionAir: 0, isSensor: true },
  trampoline: { bodyType: 'rectangle', isStatic: true, density: 0.001, friction: 0.2, restitution: 1.1, frictionAir: 0 },
  pinball: { bodyType: 'circle', isStatic: false, density: 0.002, friction: 0.02, restitution: 0.95, frictionAir: 0.002 },
  floaty: { bodyType: 'circle', isStatic: false, density: 0.0005, friction: 0.03, restitution: 0.25, frictionAir: 0.08 }
} as const;

const getPhysicsConfig = (movement: GameObject['movement']) => {
  const physics = movement.physics;
  if (!physics?.enabled) return null;
  const preset = physics.preset && physics.preset !== 'custom' ? RUNTIME_PHYSICS_PRESETS[physics.preset] : null;
  return {
    enabled: true,
    bodyType: physics.bodyType,
    isStatic: physics.isStatic,
    density: physics.density,
    friction: physics.friction,
    restitution: physics.restitution,
    frictionAir: physics.frictionAir,
    isSensor: false,
    ...preset
  };
};


function PropSection({ label, theme, children }: { label: string, theme?: 'light' | 'dark', children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-2xl mb-4 transition-all ${theme === 'dark' ? 'bg-slate-800/20 border border-slate-800' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-1 h-3 rounded-full ${theme === 'dark' ? 'bg-indigo-500/50' : 'bg-indigo-400'}`} />
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
      <div className="space-y-3.5">
        {children}
      </div>
    </div>
  );
}

function PropRow({ label, title, theme, compact, children }: { label: string, title?: string, theme?: 'light' | 'dark', compact?: boolean, children: React.ReactNode }) {
  return (
    <div className="flex items-center group/prow" title={title}>
      {!compact && (
        <span className={`text-[10px] font-black uppercase tracking-tight shrink-0 mr-3 w-20 truncate ${theme === 'dark' ? 'text-slate-500 group-hover/prow:text-slate-400' : 'text-slate-400 group-hover/prow:text-slate-500'} transition-colors`}>
          {label}
        </span>
      )}
      {compact && (
        <span className={`text-[10px] font-black uppercase tracking-tight shrink-0 mr-1.5 w-4 text-center ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>
          {label}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, theme, children }: { isOpen: boolean, onClose: () => void, title: string, theme?: 'light' | 'dark', children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
          onClick={onClose} 
        />
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-lg border shadow-2xl rounded-[32px] overflow-hidden relative flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`px-8 py-6 border-b flex justify-between items-center ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="space-y-0.5">
            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Editor Panel</div>
            <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          </div>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function GameRuntime({ project, setProject }: { project: GameProject, setProject: React.Dispatch<React.SetStateAction<GameProject>> }) {
  const currentFrame = project.frames[project.currentFrameIndex] || project.frames[0] || {
    id: 'runtime-fallback',
    name: 'Back Unnamed 1',
    objects: [],
    events: [],
    backgroundColor: '#f8fafc',
    width: project.settings.width || 800,
    height: project.settings.height || 600
  };
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef<{ [key: string]: Matter.Body }>({});
  
  const [runtimeObjects, setRuntimeObjects] = useState(() => 
    currentFrame.objects.map(obj => ({
      ...obj,
      vx: 0,
      vy: 0,
      angle: obj.rotation,
      currentFrameIndex: 0,
      lastFrameUpdate: 0,
      keys: new Set<string>(),
      particlesList: [] as { x: number, y: number, vx: number, vy: number, age: number, maxAge: number }[]
    }))
  );
  const compiledExtensionHooks = useMemo(() => {
    return (project.extensions || [])
      .filter(ext => ext.enabled && ext.kind !== 'scratch' && ext.language === 'javascript')
      .map(ext => {
        try {
          const factory = new Function('return (runtime) => {\n' + ext.code + '\n  const startHook = typeof onStart === "function" ? onStart : null;\n  const frameHook = typeof onFrame === "function" ? onFrame : null;\n  if (runtime.phase === "start" && startHook) startHook(runtime);\n  if (runtime.phase === "frame" && frameHook) frameHook(runtime);\n};');
          const hook = factory();
          return { ext, hook };
        } catch (error) {
          console.error(`Extension ${ext.name} could not compile:`, error);
          return null;
        }
      })
      .filter((item): item is { ext: ProjectExtension; hook: (runtime: { phase: 'start' | 'frame'; project: GameProject; frame: GameFrame; setProject: React.Dispatch<React.SetStateAction<GameProject>>; Matter: typeof Matter; console: Console; }) => void } => Boolean(item));
  }, [project.extensions, setProject]);

  useEffect(() => {
    setRuntimeObjects(currentFrame.objects.map(obj => ({
      ...obj,
      vx: 0,
      vy: 0,
      angle: obj.rotation,
      currentFrameIndex: 0,
      lastFrameUpdate: 0,
      keys: new Set<string>(),
      particlesList: [] as { x: number, y: number, vx: number, vy: number, age: number, maxAge: number }[]
    })));
  }, [currentFrame]);
  
  useEffect(() => {
    // 1. Initialize Matter.js Engine
    const engine = Matter.Engine.create();
    engineRef.current = engine;
    
    // Default physics values
    engine.gravity.y = 1; // Default gravity
    
    // 2. Create Physics Bodies
    const bodies: { [key: string]: Matter.Body } = {};
    const worldBodies: Matter.Body[] = [];
    
    currentFrame.objects.forEach(obj => {
      const physics = getPhysicsConfig(obj.movement);
      if (physics?.enabled) {
        let body: Matter.Body;
        if (physics.bodyType === 'circle') {
          body = Matter.Bodies.circle(obj.x, obj.y, obj.width / 2, {
            isStatic: physics.isStatic,
            isSensor: physics.isSensor,
            density: physics.density,
            friction: physics.friction,
            restitution: physics.restitution,
            frictionAir: physics.frictionAir
          });
        } else {
          body = Matter.Bodies.rectangle(obj.x, obj.y, obj.width, obj.height, {
            isStatic: physics.isStatic,
            isSensor: physics.isSensor,
            density: physics.density,
            friction: physics.friction,
            restitution: physics.restitution,
            frictionAir: physics.frictionAir
          });
        }
        Matter.Body.setAngle(body, (obj.rotation * Math.PI) / 180);
        bodies[obj.id] = body;
        worldBodies.push(body);
      }
    });
    
    // Add walls
    const halfWidth = currentFrame.width / 2;
    const halfHeight = currentFrame.height / 2;
    const ground = Matter.Bodies.rectangle(0, halfHeight + 25, currentFrame.width, 50, { isStatic: true });
    const ceiling = Matter.Bodies.rectangle(0, -halfHeight - 25, currentFrame.width, 50, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(-halfWidth - 25, 0, 50, currentFrame.height, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(halfWidth + 25, 0, 50, currentFrame.height, { isStatic: true });
    
    Matter.World.add(engine.world, [...worldBodies, ground, ceiling, leftWall, rightWall]);
    bodiesRef.current = bodies;
    
    // 3. Input Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      setRuntimeObjects(prev => prev.map(obj => {
        const newKeys = new Set(obj.keys);
        newKeys.add(e.key);
        return { ...obj, keys: newKeys };
      }));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setRuntimeObjects(prev => prev.map(obj => {
        const newKeys = new Set(obj.keys);
        newKeys.delete(e.key);
        return { ...obj, keys: newKeys };
      }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const runExtensionHooks = (phase: 'start' | 'frame') => {
      const runtimeApi = {
        phase,
        project,
        frame: currentFrame,
        setProject,
        Matter,
        console
      };

      compiledExtensionHooks.forEach(({ ext, hook }) => {
        try {
          hook(runtimeApi);
        } catch (error) {
          console.error(`Extension ${ext.name} failed during ${phase}:`, error);
        }
      });
    };

    runExtensionHooks('start');
    
    // 4. Main Game Loop
    let frameId: number;
    let lastTime = performance.now();
    let isStartOfFrame = true;

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      const deltaTime = time - lastTime;
      lastTime = time;

      // Update Physics
      Matter.Engine.update(engine, 1000 / 60);
      runExtensionHooks('frame');

      setRuntimeObjects(prev => {
        let next = prev.map(obj => {
          let { id, x, y, vx, vy, angle, keys, movement, spriteSheet } = obj;
          const physics = getPhysicsConfig(movement);

          // A. Physics Sync (if enabled)
          const body = bodiesRef.current[id];
          if (body && physics?.enabled) {
            // Safety check for physics body
            if (isNaN(body.position.x) || isNaN(body.position.y) || Math.abs(body.position.x) > 10000 || Math.abs(body.position.y) > 10000) {
              Matter.Body.setPosition(body, { x: obj.x, y: obj.y });
              Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }
            
            x = body.position.x;
            y = body.position.y;
            angle = (body.angle * 180) / Math.PI;
            vx = body.velocity.x;
            vy = body.velocity.y;
          }

          // B. Built-in Movements (only if not strictly physics-controlled)
          if (!physics?.enabled || physics?.isStatic) {
            if (movement.type === 'eight_directions') {
              const speed = movement.speed / 2.5; 
              vx = 0; vy = 0;
              if (keys.has('ArrowUp') || keys.has('w')) vy = -speed;
              if (keys.has('ArrowDown') || keys.has('s')) vy = speed;
              if (keys.has('ArrowLeft') || keys.has('a')) vx = -speed;
              if (keys.has('ArrowRight') || keys.has('d')) vx = speed;
              if (vx !== 0 && vy !== 0) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
            }

            if (movement.type === 'platform') {
              const speed = movement.speed / 2.5;
              const gravity = movement.gravity || 0.8;
              const jump = movement.jumpStrength || 15;
              if (keys.has('ArrowLeft') || keys.has('a')) vx = -speed;
              else if (keys.has('ArrowRight') || keys.has('d')) vx = speed;
              else vx *= 0.8;
              vy += gravity;
              if (y + obj.height / 2 >= currentFrame.height / 2) {
                y = currentFrame.height / 2 - obj.height / 2;
                vy = 0;
                if (keys.has('ArrowUp') || keys.has('w')) vy = -jump;
              }
            }

            if (movement.type === 'bouncing_ball') {
               if (vx === 0 && vy === 0) { vx = movement.speed / 4; vy = movement.speed / 4; }
               if (x - obj.width / 2 <= -currentFrame.width / 2 || x + obj.width / 2 >= currentFrame.width / 2) vx *= -1;
               if (y - obj.height / 2 <= -currentFrame.height / 2 || y + obj.height / 2 >= currentFrame.height / 2) vy *= -1;
            }

            x += vx;
            y += vy;
          }

          // C. Animation Handling
          let currentFrameIdx = obj.currentFrameIndex;
          if (spriteSheet?.enabled && spriteSheet.totalFrames > 1) {
            const frameRatio = 1000 / spriteSheet.frameRate;
            if (time - obj.lastFrameUpdate > frameRatio) {
              currentFrameIdx = (currentFrameIdx + 1) % spriteSheet.totalFrames;
              obj.lastFrameUpdate = time;
            }
          }

          // D. Particle Handling
          let particlesList = obj.particlesList;
          if (obj.particles?.enabled) {
            // Update existing
            particlesList = particlesList.map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + (obj.particles?.gravity || 0),
              age: p.age + 1
            })).filter(p => p.age < p.maxAge);

            // Emit new
            if (particlesList.length < (obj.particles?.count || 0)) {
              const angle = Math.random() * (obj.particles?.spread || 360) * (Math.PI / 180);
              const speed = (obj.particles?.speed || 2) * (0.5 + Math.random());
              particlesList.push({
                x: obj.width / 2,
                y: obj.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                age: 0,
                maxAge: (obj.particles?.lifetime || 30) * (0.5 + Math.random())
              });
            }
          }

          // E. Safety clamping to prevent "disappearing" bug
          if (isNaN(x)) x = obj.x;
          if (isNaN(y)) y = obj.y;
          if (Math.abs(vx) > 100) vx = Math.sign(vx) * 100;
          if (Math.abs(vy) > 100) vy = Math.sign(vy) * 100;
          
          // Clamp to reasonable world boundaries
          x = Math.max(-currentFrame.width, Math.min(x, currentFrame.width));
          y = Math.max(-currentFrame.height, Math.min(y, currentFrame.height));

          return { ...obj, x, y, vx, vy, angle, currentFrameIndex: currentFrameIdx, particlesList };
        });

        // E. Events
        currentFrame.events.forEach(event => {
          if (!event.enabled) return;
          const allConditionsMet = event.conditions.every(condition => {
            switch (condition.type) {
              case 'always': return true;
              case 'at_start_of_frame': return isStartOfFrame;
              case 'timer': {
                const interval = Math.max(0.1, condition.params?.interval || 1);
                return Math.floor(time / (interval * 1000)) !== Math.floor((time - deltaTime) / (interval * 1000));
              }
              case 'screen_edge': {
                const o = next.find(o => o.id === condition.targetId);
                if (!o) return false;
                return o.x - o.width / 2 < -currentFrame.width / 2 || o.x + o.width / 2 > currentFrame.width / 2 || o.y - o.height / 2 < -currentFrame.height / 2 || o.y + o.height / 2 > currentFrame.height / 2;
              }
              case 'key_down': {
                const o = next.find(o => o.id === condition.targetId);
                return o ? o.keys.has(condition.params?.keyCode || '') : false;
              }
              case 'collision': {
                const o1 = next.find(o => o.id === condition.targetId);
                const o2 = next.find(o => o.id === condition.params?.targetId2);
                if (!o1 || !o2) return false;
                return o1.x - o1.width / 2 < o2.x + o2.width / 2 && o1.x + o1.width / 2 > o2.x - o2.width / 2 && o1.y - o1.height / 2 < o2.y + o2.height / 2 && o1.y + o1.height / 2 > o2.y - o2.height / 2;
              }
              case 'value_compare': {
                const valueName = condition.params?.valueName;
                const operator = condition.params?.operator || '==';
                const compareValue = condition.params?.value ?? 0;
                if (!valueName) return false;
                const current = project.globalValues.find(v => v.name === valueName)?.value ?? 0;
                if (operator === '>') return current > compareValue;
                if (operator === '<') return current < compareValue;
                return current === compareValue;
              }
              default: return false;
            }
          });

          if (allConditionsMet) {
            event.actions.forEach(action => {
              next = next.map(obj => {
                if (obj.id !== action.targetId) return obj;
                const body = bodiesRef.current[obj.id];
                switch (action.type) {
                  case 'move_x': {
                    const speed = action.params?.value || 5;
                    if (body) {
                      Matter.Body.translate(body, { x: speed, y: 0 });
                      Matter.Body.setVelocity(body, { x: 0, y: 0 }); // reset velocity for manual move
                    }
                    return { ...obj, x: obj.x + speed };
                  }
                  case 'move_y': {
                    const speed = action.params?.value || 5;
                    if (body) {
                      Matter.Body.translate(body, { x: 0, y: speed });
                      Matter.Body.setVelocity(body, { x: 0, y: 0 }); // reset velocity for manual move
                    }
                    return { ...obj, y: obj.y + speed };
                  }
                  case 'bounce': {
                    if (body) {
                      Matter.Body.setVelocity(body, { x: body.velocity.x * -1, y: body.velocity.y * -1 });
                    }
                    return obj;
                  }
                  case 'change_color': return { ...obj, color: action.params?.color || obj.color };
                  case 'play_sound': {
                    if (action.params?.valueName) new Audio(action.params.valueName).play().catch(() => {});
                    return obj;
                  }
                  case 'add_global_value': {
                    const valName = action.params?.valueName;
                    const valInc = action.params?.value || 1;
                    setProject(prevProject => {
                        const newGlobalValues = prevProject.globalValues.map(gv => 
                            gv.name === valName ? { ...gv, value: gv.value + valInc } : gv
                        );
                        return { ...prevProject, globalValues: newGlobalValues };
                    });
                    return obj;
                  }
                  case 'destroy': {
                    return { ...obj, isVisible: false };
                  }
                  default: return obj;
                }
              });
            });
          } else if (event.elseActions?.length) {
            event.elseActions.forEach(action => {
              next = next.map(obj => {
                if (obj.id !== action.targetId) return obj;
                const body = bodiesRef.current[obj.id];
                switch (action.type) {
                  case 'change_color': return { ...obj, color: action.params?.color || obj.color };
                  case 'play_sound': {
                    if (action.params?.valueName) new Audio(action.params.valueName).play().catch(() => {});
                    return obj;
                  }
                  case 'destroy': return { ...obj, isVisible: false };
                  case 'set_visible': return { ...obj, isVisible: action.params?.value !== 0 };
                  default:
                    return obj;
                }
              });
            });
          }
        });

        return next;
      });

      isStartOfFrame = false;
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameId);
      if (engineRef.current) Matter.Engine.clear(engineRef.current);
    };
  }, [currentFrame, compiledExtensionHooks, project, setProject]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(59,130,246,0.12), transparent 35%), linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          backgroundPosition: 'center'
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div
          className="relative overflow-hidden rounded-[22px] border border-white/10 shadow-[0_40px_120px_rgba(15,23,42,0.65)]"
          style={{ width: currentFrame.width, height: currentFrame.height, backgroundColor: currentFrame.backgroundColor }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(15,23,42,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            backgroundPosition: 'center'
          }} />

          <div className="absolute top-2 left-2 z-[1000] bg-black/60 backdrop-blur-md p-2 rounded border border-white/10 text-[8px] font-mono text-white pointer-events-none">
            <div>OBJECTS: {runtimeObjects.length}</div>
            <div>PHYSICS: {Object.keys(bodiesRef.current).length} ACTIVE</div>
          </div>

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 z-0">
            <div className="absolute w-[1px] h-full bg-slate-400 left-1/2 -translate-x-1/2" />
            <div className="absolute h-[1px] w-full bg-slate-400 top-1/2 -translate-y-1/2" />
            <div className="absolute w-2 h-2 border-2 border-slate-500 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute text-[8px] font-black text-slate-400 uppercase tracking-widest mt-4 ml-4 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              ORIGIN (0,0)
            </div>
          </div>

          {currentFrame.objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-full bg-white/80 text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] shadow-lg border border-slate-200">
                No objects in this frame
              </div>
            </div>
          )}

          {runtimeObjects.filter(o => o.isVisible).map(obj => {
            const spriteStyle: React.CSSProperties = {};
            if (obj.spriteSheet?.enabled && obj.imageUrl) {
              const col = obj.currentFrameIndex % obj.spriteSheet.columns;
              const row = Math.floor(obj.currentFrameIndex / obj.spriteSheet.columns);
              spriteStyle.backgroundImage = `url(${obj.imageUrl})`;
              spriteStyle.backgroundSize = `${obj.spriteSheet.columns * 100}% ${obj.spriteSheet.rows * 100}%`;
              const percentX = obj.spriteSheet.columns > 1 ? (col / (obj.spriteSheet.columns - 1)) * 100 : 0;
              const percentY = obj.spriteSheet.rows > 1 ? (row / (obj.spriteSheet.rows - 1)) * 100 : 0;
              spriteStyle.backgroundPosition = `${percentX}% ${percentY}%`;
            } else if (obj.imageUrl) {
              spriteStyle.backgroundImage = `url(${obj.imageUrl})`;
              spriteStyle.backgroundSize = 'contain';
              spriteStyle.backgroundRepeat = 'no-repeat';
              spriteStyle.backgroundPosition = 'center';
            }

            return (
              <div
                key={obj.id}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: obj.width,
                  height: obj.height,
                  backgroundColor: obj.type === 'string' || obj.imageUrl ? 'transparent' : obj.color,
                  opacity: obj.opacity,
                  zIndex: obj.zIndex,
                  overflow: 'hidden',
                  ...getShapeStyle(obj.shapeType, obj.customShape),
                  transform: `translate3d(${obj.x}px, ${obj.y}px, 0) translate(-50%, -50%) rotate(${obj.angle}deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: obj.textConfig?.textAlign === 'center' ? 'center' : (obj.textConfig?.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                  color: obj.color,
                  fontSize: obj.textConfig?.fontSize || 16,
                  fontFamily: obj.textConfig?.fontFamily || 'inherit',
                  ...spriteStyle
                }}
              >
                {obj.type === 'string' && obj.textConfig?.text}
                
                {obj.particles?.enabled && obj.particlesList.map((p, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 rounded-full pointer-events-none"
                    style={{
                      left: p.x,
                      top: p.y,
                      backgroundColor: obj.particles?.color || obj.color,
                      opacity: 1 - (p.age / p.maxAge)
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}





