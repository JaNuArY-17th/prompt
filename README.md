# 2.5D Action Shooter Game

A modern 2.5D top-down action-shooting game built with **Phaser 3**, **Vite**, **Node.js**, and **Socket.io**. Features isometric "diamond" grid gameplay with Matter.js physics, following a "gameplay-first" development approach.

## 🎮 Game Features

### Core Gameplay
- **2.5D Isometric Perspective**: Top-down view with proper depth sorting
- **WASD Movement**: Smooth character movement with Matter.js physics
- **Mouse-Aimed Shooting**: Point and click to fire bullets
- **Melee Combat**: Right-click for close-range attacks
- **Multiple Enemy Types**: Different AI behaviors and attack patterns
- **Weapon System**: Reload mechanics and ammo management

### Technical Features
- **Phaser 3**: Modern game framework with WebGL rendering
- **Matter.js Physics**: Realistic collision detection and movement
- **Isometric Grid System**: Diamond-shaped tile layout for 2.5D effect
- **Depth Sorting**: Proper Z-ordering for 2.5D visuals
- **Object Pooling**: Efficient bullet management for performance
- **Modular Architecture**: Clean separation of concerns

## 🏗️ Project Structure

```
2d-action-shooter/
├── client/                 # Frontend (Phaser game)
│   ├── src/
│   │   ├── config/        # Game configuration
│   │   ├── scenes/        # Phaser scenes
│   │   ├── entities/      # Game objects (Player, Enemy)
│   │   ├── systems/       # Game systems (Input, Bullets)
│   │   ├── utils/         # Utility functions
│   │   └── assets/        # Game assets
│   ├── package.json
│   └── vite.config.js
├── server/                # Backend (Node.js + Socket.io)
│   ├── src/
│   │   └── index.js      # Server entry point
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone or create the project structure** (already done if you're reading this)

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Start the development servers**:
   ```bash
   npm run dev
   ```

   This will start both:
   - Frontend (Vite): http://localhost:3000
   - Backend (Node.js): http://localhost:3001

### Individual Commands

**Frontend only:**
```bash
cd client
npm run dev
```

**Backend only:**
```bash
cd server
npm run dev
```

**Build for production:**
```bash
npm run build
```

## 🎯 Controls

| Input | Action |
|-------|--------|
| **WASD** | Move player |
| **Mouse** | Aim direction |
| **Left Click** | Shoot |
| **Right Click** | Melee attack |
| **R** | Reload weapon |
| **ESC** | Pause game |
| **Space** | Start game (main menu) |

## 🏆 Game Systems

### Player System
- **Health**: 100 HP with visual feedback
- **Movement**: WASD controls with diagonal normalization
- **Weapons**: Pistol with 30 rounds, reload system
- **Melee**: Close-range attack with knockback effect

### Enemy AI
- **Patrol State**: Random movement when player not detected
- **Chase State**: Pursue player when in range
- **Attack State**: Melee or ranged attacks
- **Flee State**: Retreat when health is low

### Physics & Collision
- **Matter.js Integration**: Realistic physics simulation
- **Collision Detection**: Bullets vs walls, enemies, player
- **Depth Sorting**: 2.5D visual layering based on Y position

### Visual Effects
- **Screen Shake**: Combat feedback
- **Particle Effects**: Bullet impacts and enemy deaths
- **Muzzle Flash**: Shooting visual feedback
- **Damage Tinting**: Visual damage indication

## 🔧 Development

### Adding New Features

**New Enemy Type:**
1. Modify `client/src/entities/Enemy.js`
2. Add new case to `initializeByType()` method
3. Implement unique behavior in AI states

**New Weapon:**
1. Extend `Player.js` weapon system
2. Add weapon switching logic
3. Create weapon-specific bullet behavior

**New Level:**
1. Modify `GameScene.js` `createWorld()` method
2. Design isometric tile layout
3. Add new enemy spawn points

### Code Architecture

The project follows a modular architecture:

- **Scenes**: Manage different game states (Menu, Game, UI)
- **Entities**: Game objects with behavior (Player, Enemy)
- **Systems**: Reusable game logic (Input, Bullets)
- **Config**: Centralized game settings

## 🌐 Multiplayer (Future Feature)

The backend is set up for potential multiplayer features:
- Player synchronization
- Real-time bullet sharing
- High score leaderboards
- Room-based gameplay

## 📦 Dependencies

### Frontend
- **Phaser**: Game framework
- **Matter.js**: Physics engine
- **Socket.io-client**: Multiplayer communication
- **Vite**: Build tool and dev server

### Backend
- **Express**: Web server
- **Socket.io**: Real-time communication
- **CORS**: Cross-origin resource sharing
- **Dotenv**: Environment configuration

## 🎨 Asset Guidelines

For custom assets (when replacing placeholders):
- **Tiles**: 64x32 pixels (isometric diamond shape)
- **Characters**: 32x32 pixels
- **Bullets**: 8x8 pixels
- **Style**: 128-bit pixel art aesthetic

## 🐛 Troubleshooting

**Game doesn't start:**
- Check console for errors
- Ensure all dependencies are installed
- Verify ports 3000 and 3001 are available

**Physics issues:**
- Enable debug mode in `GameConfig.js`: `debug: true`
- Check collision body sizes and labels

**Performance issues:**
- Monitor bullet count in console
- Adjust `maxBullets` in `BulletSystem.js`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Add console logs for debugging
5. Test thoroughly before submitting

## 📝 License

MIT License - Feel free to use this project as a learning resource or starting point for your own games!

---

**Happy Game Development!** 🎮✨ 