/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ObjectType = 'active' | 'backdrop' | 'counter' | 'string';
export type ProgrammingLanguage = 'javascript' | 'python';
export type ProjectExtensionKind = 'code' | 'scratch';
export type ProjectAssetKind = 'image' | 'sound';

export interface ProjectAssetEditorState {
  image?: {
    brightness: number;
    contrast: number;
    saturation: number;
    grayscale: number;
    hueRotate: number;
    blur: number;
    rotate: number;
    flipX: boolean;
    flipY: boolean;
  };
  sound?: {
    volume: number;
    loop: boolean;
    playbackRate: number;
    trimStart: number;
    trimEnd: number;
  };
}

export interface ProjectLibraryAsset {
  id: string;
  name: string;
  kind: ProjectAssetKind;
  sourceUrl: string;
  originalFileName?: string;
  createdAt: string;
  editorState?: ProjectAssetEditorState;
}

export interface ProjectExtension {
  id: string;
  name: string;
  language: ProgrammingLanguage;
  enabled: boolean;
  code: string;
  kind?: ProjectExtensionKind;
  sourceFileName?: string;
}

export interface CustomShapePoint {
  x: number;
  y: number;
  curve?: 'corner' | 'smooth';
  handleIn?: {
    x: number;
    y: number;
  };
  handleOut?: {
    x: number;
    y: number;
  };
}

export interface CustomShapeDefinition {
  id?: string;
  name: string;
  points: CustomShapePoint[];
  kind: 'polygon';
  fill?: string;
  createdAt?: string;
}

export type MovementType = 'static' | 'bouncing_ball' | 'eight_directions' | 'platform';

export interface Movement {
  type: MovementType;
  speed: number;
  acceleration: number;
  deceleration: number;
  bounceIntensity?: number;
  gravity?: number;
  jumpStrength?: number;
  physics?: {
    enabled: boolean;
    bodyType: 'rectangle' | 'circle';
    isStatic: boolean;
    density: number;
    friction: number;
    restitution: number;
    frictionAir: number;
    preset?: 'custom' | 'static' | 'rigid' | 'bouncy' | 'slippery' | 'heavy' | 'ice' | 'ghost' | 'trampoline' | 'pinball' | 'floaty';
    angularVelocity?: number;
    force?: { x: number; y: number };
  };
}

export interface AlterableValue {
  id: string;
  name: string;
  value: number;
}

export interface GameObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  type: ObjectType;
  opacity: number;
  zIndex: number;
  imageUrl?: string;
  shapeType?: string;
  customShape?: CustomShapeDefinition;
  sourceAssetId?: string;
  // Text Config
  textConfig?: {
    text: string;
    fontSize: number;
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
  };
  // Particle System
  particles?: {
    enabled: boolean;
    count: number;
    lifetime: number;
    speed: number;
    spread: number;
    color: string;
    gravity: number;
  };
  // Sprite Sheet
  spriteSheet?: {
    enabled: boolean;
    columns: number;
    rows: number;
    totalFrames: number;
    frameRate: number;
    currentFrame: number;
    isLooping: boolean;
  };
  // Clickteam Essentials
  alterableValues: AlterableValue[];
  isVisible: boolean;
  isLocked?: boolean;
  groupId?: string;
  movement: Movement;
}

export interface GameFrame {
  id: string;
  name: string;
  objects: GameObject[];
  events: GameEvent[];
  backgroundColor: string;
  width: number;
  height: number;
}

export type ConditionType = 
  | 'always' 
  | 'collision' 
  | 'screen_edge'
  | 'timer'
  | 'mouse_click'
  | 'key_down'
  | 'key_press'
  | 'value_compare'
  | 'at_start_of_frame';

export type ActionType = 
  | 'move_x' 
  | 'move_y' 
  | 'add_x'
  | 'add_y'
  | 'set_x' 
  | 'set_y' 
  | 'bounce' 
  | 'destroy'
  | 'change_color'
  | 'play_sound'
  | 'add_global_value'
  | 'sub_global_value'
  | 'set_global_value'
  | 'set_visible'
  | 'set_value'
  | 'add_value'
  | 'next_frame'
  | 'previous_frame'
  | 'set_text';

export interface GameCondition {
  type: ConditionType;
  targetId?: string; // The primary object the condition refers to
  params?: {
    targetId2?: string;
    edge?: 'top' | 'bottom' | 'left' | 'right';
    interval?: number;
    valueName?: string;
    operator?: '>' | '<' | '==';
    value?: number;
    keyCode?: string;
  };
}

export interface GameAction {
  id: string;
  type: ActionType;
  targetId: string;
  params?: {
    value?: number;
    color?: string;
    valueName?: string;
    text?: string;
  };
}

export interface GameEvent {
  id: string;
  name: string;
  conditions: GameCondition[];
  actions: GameAction[];
  elseActions?: GameAction[];
  enabled: boolean;
}

export interface GameProject {
  id: string;
  name: string;
  frames: GameFrame[];
  currentFrameIndex: number;
  globalEvents: GameEvent[];
  globalValues: AlterableValue[];
  extensions?: ProjectExtension[];
  libraryAssets?: ProjectLibraryAsset[];
  customShapes?: CustomShapeDefinition[];
  settings: {
    width: number;
    height: number;
    windowTitle: string;
    fps: number;
  };
}
