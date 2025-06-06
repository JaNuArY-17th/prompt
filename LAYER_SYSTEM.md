# Game Layer System Documentation

## Depth System Overview

Both Chapter 1 (GameScene) and Chapter 2 (Chapter2Scene) now use a consistent depth/layering system for proper visual ordering in the isometric view.

## Layer Depths

### Background Layers (Negative Depths)
- **Base Tiles**: `-1000 + y * 10 + x`
  - Ground textures, water, basic terrain
  - Lowest depth to appear behind everything

### Game Objects (Positive Depths)
- **Regular Obstacles**: `y * 10 + x`
  - Trees, rocks, decorative objects
  - Basic Y-sorting for proper depth ordering

- **Buildings & Warehouses**: `20000 + y * 10 + x`
  - Houses, warehouses, major structures
  - Higher depth to prevent players walking "on top"
  - Building icons: `20000 + y * 10 + x + 1`
  - Building details: `20000 + y * 10 + x + 2`

- **Decorations**: `10000 + worldPos.y`
  - Environmental props, signs, small objects
  - Uses world position for accurate sorting

### Dynamic Entities
- **Player**: `10000 + this.y` (auto-updated)
  - Dynamically updates depth based on Y position
  - Handles Y-sorting for proper depth ordering

- **Enemies**: `10000 + this.y` (auto-updated) 
  - Same system as player for consistent sorting
  - Enemy health bars: `50000+` (UI elements)

- **Hostages**: `100`
  - Static depth for rescued NPCs
  - Hostage indicators: `50000+` (UI elements)

- **Granaries**: `50`
  - Static depth for destructible objects
  - Health bars: `200+`

### Projectiles & Effects
- **Bullets**: `10000`
  - Player and enemy bullets at same depth
  - Above most game objects but below UI

- **Effects**: `15000+`
  - Explosion effects, muzzle flashes
  - Death effects, destruction visuals

### UI Elements (High Depths)
- **Game UI**: `50000+`
  - Interaction prompts
  - Damage indicators  
  - Completion messages
  - Player/enemy health bars

- **System UI**: `100000+`
  - Pause overlay: `100000`
  - Pause text: `100001`
  - Always on top elements

## Implementation Details

### Automatic Updates
- **Player & Enemies**: Call `updateDepth()` automatically in their update loops
- **Static Objects**: Set depth once during creation
- **UI Elements**: Use fixed high depths to stay above gameplay

### Y-Sorting Formula
```javascript
// For dynamic entities (player, enemies)
depth = 10000 + this.y

// For static objects with position
depth = baseDepth + y * 10 + x

// For UI elements
depth = 50000 + // additional offset if needed
```

### Chapter-Specific Implementations

#### Chapter 1 (GameScene)
- Uses TileSystem for automatic depth assignment
- Warehouses get building-level depth (20000+)
- All entities follow the depth system automatically

#### Chapter 2 (Chapter2Scene)
- Blackboard houses use stone depth (10000 + worldPos.y) - UPDATED
- House icons and blackboard symbols properly layered above houses
- Interaction prompts use UI-level depth (50000+)
- Completion feedback uses UI-level depth (50000+)
- Uses Sister Sáu Nhung assets from chapter2-main directory
- Tree density increased by 1000% for dense forest environment

## Benefits

1. **Consistent Visual Ordering**: Both chapters have identical depth behavior
2. **Proper Isometric Rendering**: Y-sorting ensures correct depth perception
3. **UI Always Visible**: High depth values keep UI above gameplay
4. **Scalable System**: Easy to add new object types with appropriate depths
5. **Performance**: Static depths avoid unnecessary recalculations

## Adding New Objects

When adding new game objects, use these guidelines:

- **Ground elements**: Use negative depths (-1000 range)
- **Small decorations**: Use Y-sorting range (0-10000)
- **Large buildings**: Use building range (20000+)
- **Moving entities**: Use dynamic range (10000 + Y position)
- **UI elements**: Use UI range (50000+)
- **System overlays**: Use system range (100000+) 