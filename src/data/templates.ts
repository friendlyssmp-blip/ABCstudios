import { GameProject, GameObject, GameFrame, GameEvent } from '../types/game.ts';

/**
 * Pre-designed templates with functional gameplay and physics configurations.
 */
export const TEMPLATES_SHOWCASE: {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Specialist';
  features: string[];
  project: GameProject;
}[] = [
  {
    id: 'temp-physics-sandbox',
    name: 'Matter-JS Bouncy Balls Canvas',
    description: 'A physical sandbox showcasing gravity, restitution (bounciness), and friction presets using the Matter-JS subsystem.',
    difficulty: 'Intermediate',
    features: ['Matter-js Physics', 'Gravity Tuning', 'Collision Sound Events'],
    project: {
      id: 'temp-physics-sandbox',
      name: 'Matter-JS Bouncy Balls Canvas',
      currentFrameIndex: 0,
      globalEvents: [],
      globalValues: [
        { id: 'gv-bounces', name: 'Total Bounces', value: 0 }
      ],
      settings: {
        width: 800,
        height: 500,
        windowTitle: 'ABCstudio Physics Sandbox',
        fps: 60
      },
      frames: [
        {
          id: 'frame-1',
          name: 'Sandbox Zone',
          backgroundColor: '#1e293b',
          width: 800,
          height: 500,
          objects: [
            // Static Floor
            {
              id: 'obj-floor',
              name: 'Floor Obstacle',
              x: 400,
              y: 480,
              width: 760,
              height: 30,
              rotation: 0,
              color: '#475569',
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
                  restitution: 0.5,
                  frictionAir: 0.01,
                  preset: 'static'
                }
              }
            },
            // Left Wall
            {
              id: 'obj-lwall',
              name: 'Left Barrier',
              x: 20,
              y: 250,
              width: 30,
              height: 480,
              rotation: 0,
              color: '#475569',
              type: 'backdrop',
              opacity: 1,
              zIndex: 2,
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
                  restitution: 0.5,
                  frictionAir: 0.01,
                  preset: 'static'
                }
              }
            },
            // Right Wall
            {
              id: 'obj-rwall',
              name: 'Right Barrier',
              x: 780,
              y: 250,
              width: 30,
              height: 480,
              rotation: 0,
              color: '#475569',
              type: 'backdrop',
              opacity: 1,
              zIndex: 3,
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
                  restitution: 0.5,
                  frictionAir: 0.01,
                  preset: 'static'
                }
              }
            },
            // Bouncy Ball red
            {
              id: 'obj-ball-red',
              name: 'Bouncy Ball Red',
              x: 200,
              y: 100,
              width: 50,
              height: 50,
              rotation: 0,
              color: '#ef4444',
              type: 'active',
              opacity: 1,
              zIndex: 4,
              shapeType: 'circle',
              isVisible: true,
              alterableValues: [],
              movement: {
                type: 'bouncing_ball',
                speed: 5,
                acceleration: 1,
                deceleration: 1,
                bounceIntensity: 0.95,
                physics: {
                  enabled: true,
                  bodyType: 'circle',
                  isStatic: false,
                  density: 0.005,
                  friction: 0.01,
                  restitution: 0.95,
                  frictionAir: 0.002,
                  preset: 'bouncy'
                }
              }
            },
            // Bouncy Ball violet
            {
              id: 'obj-ball-violet',
              name: 'Heavy Block Violet',
              x: 550,
              y: 120,
              width: 60,
              height: 60,
              rotation: 0,
              color: '#8b5cf6',
              type: 'active',
              opacity: 1,
              zIndex: 5,
              shapeType: 'rounded-square',
              isVisible: true,
              alterableValues: [],
              movement: {
                type: 'bouncing_ball',
                speed: 4,
                acceleration: 1,
                deceleration: 1,
                bounceIntensity: 0.2,
                physics: {
                  enabled: true,
                  bodyType: 'rectangle',
                  isStatic: false,
                  density: 0.05,
                  friction: 0.4,
                  restitution: 0.2,
                  frictionAir: 0.005,
                  preset: 'heavy'
                }
              }
            },
            // Middle Slider / Anchor platform
            {
              id: 'obj-mid-platform',
              name: 'Slippery Incline',
              x: 380,
              y: 300,
              width: 250,
              height: 20,
              rotation: 20, // Slanted!
              color: '#06b6d4',
              type: 'backdrop',
              opacity: 1,
              zIndex: 6,
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
                  friction: 0.001, // Super slippery
                  restitution: 0.6,
                  frictionAir: 0.01,
                  preset: 'slippery'
                }
              }
            }
          ],
          events: [
            // Sound trigger on red ball colliding with Floor
            {
              id: 'event-bounce-sound',
              name: 'Ball Hits Barriers',
              enabled: true,
              conditions: [
                {
                  type: 'collision',
                  targetId: 'obj-ball-red',
                  params: {
                    targetId2: 'obj-floor'
                  }
                }
              ],
              actions: [
                {
                  id: 'action-bounce-sfx',
                  type: 'play_sound',
                  targetId: 'obj-ball-red',
                  params: {
                    valueName: 'https://www.soundjay.com/buttons/sounds/button-3.mp3'
                  }
                },
                {
                  id: 'action-inc-global',
                  type: 'add_global_value',
                  targetId: 'obj-ball-red',
                  params: {
                    valueName: 'Total Bounces',
                    value: 1
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'temp-arcade-clicker',
    name: 'Interactive Retro Clicker Game',
    description: 'An interactive micro-game where you press keys or click icons to spawn points, play synth playbacks, and score high values.',
    difficulty: 'Beginner',
    features: ['Mouse Click Actions', 'Counter Value Updating', 'Dynamic Colors'],
    project: {
      id: 'temp-arcade-clicker',
      name: 'Interactive Retro Clicker Game',
      currentFrameIndex: 0,
      globalEvents: [],
      globalValues: [
        { id: 'gv-points', name: 'Scored Points', value: 0 }
      ],
      settings: {
        width: 600,
        height: 400,
        windowTitle: 'Retro Arcade Clicker',
        fps: 60
      },
      frames: [
        {
          id: 'frame-1',
          name: 'Game Arc',
          backgroundColor: '#0f172a',
          width: 600,
          height: 400,
          objects: [
            // Center Core Button
            {
              id: 'obj-coin',
              name: 'Coin Core Widget',
              x: 300,
              y: 200,
              width: 100,
              height: 100,
              rotation: 0,
              color: '#fbbf24',
              type: 'active',
              opacity: 1,
              zIndex: 1,
              shapeType: 'circle',
              isVisible: true,
              alterableValues: [],
              movement: { type: 'static', speed: 0, acceleration: 0, deceleration: 0 }
            },
            // Left decor
            {
              id: 'obj-click-text',
              name: 'Helper Title Banner',
              x: 300,
              y: 80,
              width: 400,
              height: 40,
              rotation: 0,
              color: '#ffffff',
              type: 'string',
              opacity: 1,
              zIndex: 2,
              isVisible: true,
              textConfig: {
                text: 'CLICK THE GOLD CORE OR PRESS ENTER!',
                fontSize: 16,
                fontFamily: 'sans-serif',
                textAlign: 'center'
              },
              alterableValues: [],
              movement: { type: 'static', speed: 0, acceleration: 0, deceleration: 0 }
            }
          ],
          events: [
            // Event 1: Click Golden Core
            {
              id: 'event-core-click',
              name: 'Mouse Click core',
              enabled: true,
              conditions: [
                {
                  type: 'mouse_click',
                  targetId: 'obj-coin'
                }
              ],
              actions: [
                {
                  id: 'act-click-sound',
                  type: 'play_sound',
                  targetId: 'obj-coin',
                  params: {
                    valueName: 'https://www.soundjay.com/buttons/sounds/button-10.mp3'
                  }
                },
                {
                  id: 'act-score-points',
                  type: 'add_global_value',
                  targetId: 'obj-coin',
                  params: {
                    valueName: 'Scored Points',
                    value: 10
                  }
                },
                {
                  id: 'act-rotate-core',
                  type: 'change_color',
                  targetId: 'obj-coin',
                  params: {
                    color: '#34d399' // Turn green briefly when clicked
                  }
                }
              ]
            },
            // Event 2: Keyboard press
            {
              id: 'event-key-enter',
              name: 'Enter key clicker',
              enabled: true,
              conditions: [
                {
                  type: 'key_press',
                  params: {
                    keyCode: 'Enter'
                  }
                }
              ],
              actions: [
                {
                  id: 'act-key-sound',
                  type: 'play_sound',
                  targetId: 'obj-coin',
                  params: {
                    valueName: 'https://www.soundjay.com/buttons/sounds/button-5.mp3'
                  }
                },
                {
                  id: 'act-key-pts',
                  type: 'add_global_value',
                  targetId: 'obj-coin',
                  params: {
                    valueName: 'Scored Points',
                    value: 5
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
];
