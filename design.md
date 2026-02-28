# Design Document: Baweda Escape: Endless Run

## Overview

Baweda Escape: Endless Run is a browser-based endless runner game built using HTML5 Canvas API and vanilla JavaScript. The game follows a simple architecture with a main game loop that handles input, updates game state, and renders graphics at 60 frames per second. The design emphasizes modularity, making it easy for students to understand and extend.

The game uses a coordinate system where the player remains at a fixed vertical position while obstacles scroll toward them, creating the illusion of forward movement. The game world consists of three lanes, and all game objects (player, obstacles, powerups) are positioned within these lanes.

## Architecture

The game follows a component-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│           Game Manager                   │
│  (Orchestrates all game systems)        │
└─────────────────────────────────────────┘
           │
           ├──────────────┬──────────────┬──────────────┬──────────────┐
           │              │              │              │              │
    ┌──────▼─────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
    │   Input    │ │  Player    │ │ Obstacle  │ │  Scoring  │ │ Renderer  │
    │  Handler   │ │  System    │ │  System   │ │  System   │ │  System   │
    └────────────┘ └────────────┘ └───────────┘ └───────────┘ └───────────┘
                         │              │
                         │              │
                    ┌────▼──────────────▼────┐
                    │  Collision Detection   │
                    │       System           │
                    └────────────────────────┘
```

## Technology Stack

- **HTML5**: Structure and canvas element
- **CSS3**: Styling and responsive layout
- **JavaScript (ES6+)**: Game logic and interactions
- **Canvas API**: 2D rendering
- **LocalStorage API**: High score persistence
- **Optional**: Phaser.js (lightweight alternative for easier sprite management)

For this design, we'll use vanilla JavaScript with Canvas API to keep dependencies minimal and learning-focused.

## Components and Interfaces

### Game Manager

The central controller that initializes and coordinates all game systems.

```javascript
class GameManager {
  constructor(canvasId)
  init()
  start()
  pause()
  resume()
  restart()
  gameOver()
  update(deltaTime)
  render()
}
```

### Player System

Manages the player character's state, position, and animations.

```javascript
class Player {
  constructor(x, y, lane)
  moveLeft()
  moveRight()
  jump()
  slide()
  update(deltaTime)
  render(context)
  getCurrentLane()
  isJumping()
  isSliding()
  getBounds() // Returns collision box
}
```

### Input Handler

Processes keyboard and touch input and translates them to game commands.

```javascript
class InputHandler {
  constructor(player)
  setupKeyboardControls()
  setupTouchControls()
  handleKeyDown(event)
  handleKeyUp(event)
  handleTouchStart(event)
  handleTouchMove(event)
  handleTouchEnd(event)
}
```

### Obstacle System

Spawns, manages, and updates obstacles.

```javascript
class ObstacleManager {
  constructor()
  spawnObstacle()
  update(deltaTime)
  render(context)
  getActiveObstacles()
  removeOffscreenObstacles()
  ensureClearLane() // Ensures at least one lane is clear
}

class Obstacle {
  constructor(type, lane, y)
  update(deltaTime)
  render(context)
  getBounds() // Returns collision box
  isOffscreen()
}
```

### Powerup System

Manages powerup spawning, collection, and effects.

```javascript
class PowerupManager {
  constructor()
  spawnPowerup()
  update(deltaTime)
  render(context)
  getActivePowerups()
  removeOffscreenPowerups()
}

class Powerup {
  constructor(type, lane, y)
  update(deltaTime)
  render(context)
  getBounds()
  activate(player)
  isOffscreen()
}
```

### Collision Detection System

Checks for intersections between game objects.

```javascript
class CollisionDetector {
  checkCollision(rect1, rect2) // Returns boolean
  checkPlayerObstacleCollisions(player, obstacles)
  checkPlayerPowerupCollisions(player, powerups)
}
```

### Scoring System

Tracks score, distance, and multipliers.

```javascript
class ScoreManager {
  constructor()
  addDistanceScore(distance)
  addCoinScore(coinValue)
  applyMultiplier(survivalTime)
  getScore()
  getHighScore()
  saveHighScore()
  reset()
}
```

### Chaser System

Manages the pursuing officer character.

```javascript
class Chaser {
  constructor()
  update(deltaTime, playerCollisions)
  render(context)
  getDistance() // Distance from player
  isCatchingPlayer() // Returns boolean
}
```

### Renderer System

Handles all drawing operations.

```javascript
class Renderer {
  constructor(canvas)
  clear()
  drawBackground()
  drawRoad()
  drawUI(score, distance, chaserDistance)
  drawGameOver(finalScore, highScore)
  drawStartMenu()
  drawPauseMenu()
}
```

## Data Models

### Player State

```javascript
{
  x: number,              // X position on canvas
  y: number,              // Y position on canvas
  lane: number,           // Current lane (0, 1, or 2)
  width: number,          // Collision box width
  height: number,         // Collision box height
  velocityY: number,      // Vertical velocity for jumping
  isJumping: boolean,
  isSliding: boolean,
  speed: number,          // Movement speed
  health: number,         // Player health (optional)
  animationFrame: number, // Current animation frame
  animationTimer: number  // Timer for animation updates
}
```

### Obstacle State

```javascript
{
  type: string,           // 'barrier', 'cone', 'vehicle', 'bin'
  x: number,              // X position
  y: number,              // Y position
  lane: number,           // Lane position (0, 1, or 2)
  width: number,          // Collision box width
  height: number,         // Collision box height
  speed: number,          // Movement speed toward player
  canJumpOver: boolean,   // Can player jump over this?
  canSlideUnder: boolean  // Can player slide under this?
}
```

### Powerup State

```javascript
{
  type: string,           // 'energy_drink', 'coin_magnet', 'slow_motion'
  x: number,
  y: number,
  lane: number,
  width: number,
  height: number,
  speed: number,
  duration: number,       // Effect duration in milliseconds
  value: number           // Score value for coins
}
```

### Game State

```javascript
{
  state: string,          // 'menu', 'playing', 'paused', 'gameover'
  score: number,
  distance: number,
  highScore: number,
  gameSpeed: number,      // Current game speed
  baseSpeed: number,      // Base movement speed
  speedMultiplier: number,
  survivalTime: number,   // Time survived in milliseconds
  isPaused: boolean
}
```

## Game Loop

The game loop runs at 60 FPS using `requestAnimationFrame`:

```
1. Calculate deltaTime (time since last frame)
2. Process Input
   - Check keyboard/touch events
   - Update player commands
3. Update Game State
   - Update player position and animation
   - Update obstacles (move toward player)
   - Update powerups (move toward player)
   - Spawn new obstacles/powerups based on timers
   - Check collisions
   - Update chaser position
   - Update score based on distance
   - Remove offscreen objects
4. Render
   - Clear canvas
   - Draw background
   - Draw road
   - Draw obstacles
   - Draw powerups
   - Draw player
   - Draw chaser
   - Draw UI (score, distance, etc.)
5. Check Game Over Conditions
   - Player caught by chaser
   - Too many collisions
6. Request next frame
```

## Pseudocode for Main Systems

### Main Game Loop

```
function gameLoop(currentTime):
    if game.state != 'playing':
        return
    
    deltaTime = currentTime - lastFrameTime
    lastFrameTime = currentTime
    
    // Update
    player.update(deltaTime)
    obstacleManager.update(deltaTime)
    powerupManager.update(deltaTime)
    chaser.update(deltaTime, player.collisionCount)
    
    // Collision detection
    obstacles = obstacleManager.getActiveObstacles()
    for each obstacle in obstacles:
        if collisionDetector.checkCollision(player.getBounds(), obstacle.getBounds()):
            if player.isJumping and obstacle.canJumpOver:
                continue
            if player.isSliding and obstacle.canSlideUnder:
                continue
            handleCollision(obstacle)
    
    powerups = powerupManager.getActivePowerups()
    for each powerup in powerups:
        if collisionDetector.checkCollision(player.getBounds(), powerup.getBounds()):
            powerup.activate(player)
            scoreManager.addCoinScore(powerup.value)
            powerupManager.remove(powerup)
    
    // Update score
    scoreManager.addDistanceScore(deltaTime * gameSpeed)
    scoreManager.applyMultiplier(survivalTime)
    
    // Check game over
    if chaser.isCatchingPlayer() or player.health <= 0:
        gameOver()
        return
    
    // Render
    renderer.clear()
    renderer.drawBackground()
    renderer.drawRoad()
    obstacleManager.render(context)
    powerupManager.render(context)
    player.render(context)
    chaser.render(context)
    renderer.drawUI(scoreManager.getScore(), distance, chaser.getDistance())
    
    requestAnimationFrame(gameLoop)
```

### Player Movement

```
function Player.moveLeft():
    if currentLane > 0:
        targetLane = currentLane - 1
        targetX = getLaneXPosition(targetLane)
        animateMovement(targetX)
        currentLane = targetLane

function Player.moveRight():
    if currentLane < 2:
        targetLane = currentLane + 1
        targetX = getLaneXPosition(targetLane)
        animateMovement(targetX)
        currentLane = targetLane

function Player.jump():
    if not isJumping and not isSliding:
        isJumping = true
        velocityY = -jumpForce
        playJumpAnimation()

function Player.slide():
    if not isJumping and not isSliding:
        isSliding = true
        slideTimer = slideDuration
        playSlideAnimation()

function Player.update(deltaTime):
    // Handle jumping physics
    if isJumping:
        velocityY += gravity * deltaTime
        y += velocityY * deltaTime
        if y >= groundY:
            y = groundY
            velocityY = 0
            isJumping = false
    
    // Handle sliding
    if isSliding:
        slideTimer -= deltaTime
        if slideTimer <= 0:
            isSliding = false
    
    // Update animation
    animationTimer += deltaTime
    if animationTimer >= animationSpeed:
        animationFrame = (animationFrame + 1) % totalFrames
        animationTimer = 0
```

### Obstacle Spawning

```
function ObstacleManager.update(deltaTime):
    spawnTimer += deltaTime
    
    // Spawn new obstacle
    if spawnTimer >= spawnInterval:
        spawnObstacle()
        spawnTimer = 0
        spawnInterval = calculateNextSpawnInterval()
    
    // Update existing obstacles
    for each obstacle in activeObstacles:
        obstacle.y += obstacle.speed * deltaTime
        
        if obstacle.isOffscreen():
            removeObstacle(obstacle)

function ObstacleManager.spawnObstacle():
    // Select random obstacle type
    obstacleType = selectRandom(['barrier', 'cone', 'vehicle', 'bin'])
    
    // Select random lane
    availableLanes = [0, 1, 2]
    
    // Ensure at least one lane is clear
    if lastObstacleRow.y - spawnY < minSafeDistance:
        occupiedLanes = getOccupiedLanes(lastObstacleRow)
        availableLanes = removeOccupiedLanes(availableLanes, occupiedLanes)
    
    lane = selectRandom(availableLanes)
    
    // Create obstacle
    obstacle = new Obstacle(obstacleType, lane, spawnY)
    activeObstacles.add(obstacle)
    
    // Track for lane clearing logic
    lastObstacleRow.add(obstacle)

function calculateNextSpawnInterval():
    // Gradually decrease spawn interval as game progresses
    baseInterval = 2000 // milliseconds
    minInterval = 800
    speedFactor = min(survivalTime / 60000, 1.0) // Max at 1 minute
    return baseInterval - (baseInterval - minInterval) * speedFactor
```

### Collision Detection

```
function CollisionDetector.checkCollision(rect1, rect2):
    return rect1.x < rect2.x + rect2.width and
           rect1.x + rect1.width > rect2.x and
           rect1.y < rect2.y + rect2.height and
           rect1.y + rect1.height > rect2.y

function CollisionDetector.checkPlayerObstacleCollisions(player, obstacles):
    playerBounds = player.getBounds()
    collisions = []
    
    for each obstacle in obstacles:
        obstacleBounds = obstacle.getBounds()
        
        if checkCollision(playerBounds, obstacleBounds):
            // Check if player can avoid collision
            if player.isJumping and obstacle.canJumpOver:
                continue
            if player.isSliding and obstacle.canSlideUnder:
                continue
            
            collisions.add(obstacle)
    
    return collisions
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Lane Movement Boundaries

*For any* player state and movement command (left or right), executing the movement should result in the player being in a valid lane (0, 1, or 2), and boundary movements should be ignored (leftmost lane ignores left, rightmost lane ignores right).

**Validates: Requirements 1.1, 1.2, 1.5, 1.6**

### Property 2: Action State Transitions

*For any* valid player state where the player is not currently jumping or sliding, executing a jump or slide command should transition the player to the corresponding action state (isJumping or isSliding becomes true).

**Validates: Requirements 1.3, 1.4**

### Property 3: Constant Forward Movement

*For any* game frame during active gameplay, the player's forward movement speed should remain constant and equal to the configured base speed (unless modified by powerups).

**Validates: Requirements 1.7**

### Property 4: Valid Obstacle Spawning

*For any* spawned obstacle, it should have a valid lane assignment (0, 1, or 2) and a valid obstacle type from the defined set ('barrier', 'cone', 'vehicle', 'bin').

**Validates: Requirements 2.2, 2.3**

### Property 5: Obstacle Movement Speed

*For any* active obstacle, its movement speed toward the player should match the current game speed.

**Validates: Requirements 2.4**

### Property 6: Offscreen Object Cleanup

*For any* obstacle or powerup that moves past the player's position and goes offscreen, it should be removed from the active game objects list.

**Validates: Requirements 2.5**

### Property 7: Lane Clearance Guarantee

*For any* row of obstacles spawned at the same Y position, at least one lane (0, 1, or 2) must remain unoccupied, ensuring the player can always pass.

**Validates: Requirements 2.6**

### Property 8: Collision Detection

*For any* player position and obstacle position, if their bounding boxes intersect and the player is not avoiding the obstacle (via jump or slide), a collision should be registered.

**Validates: Requirements 3.1**

### Property 9: Collision Consequences

*For any* registered collision, the game state should change (either player health decreases or game ends).

**Validates: Requirements 3.2**

### Property 10: Collision Avoidance

*For any* obstacle that can be jumped over, if the player is in the jumping state when intersecting with it, no collision should be registered. Similarly, for any obstacle that can be slid under, if the player is in the sliding state, no collision should be registered.

**Validates: Requirements 3.3, 3.4**

### Property 11: Powerup Effect Activation

*For any* powerup type, when the player intersects with it, the corresponding powerup effect should be activated and the powerup should be removed from the game.

**Validates: Requirements 4.2**

### Property 12: Powerup Effect Expiration Round-Trip

*For any* powerup effect with a duration, after the effect expires, the game state should return to its pre-powerup behavior (speed, coin collection, etc.).

**Validates: Requirements 4.6**

### Property 13: Score Increases with Distance

*For any* two game states where the second state has greater distance traveled than the first, the score in the second state should be greater than or equal to the score in the first state.

**Validates: Requirements 5.1**

### Property 14: Coin Collection Increases Score

*For any* game state before and after collecting a coin, the score after collection should be greater than the score before collection.

**Validates: Requirements 5.2**

### Property 15: Survival Time Affects Score

*For any* two game states with the same distance traveled but different survival times, the state with longer survival time should have a higher score (due to multiplier).

**Validates: Requirements 5.3**

### Property 16: High Score Persistence Round-Trip

*For any* high score value saved to local storage, loading the high score should return the same value.

**Validates: Requirements 5.5**

### Property 17: Chaser Distance Decreases with Collisions

*For any* game state before and after a collision, the chaser's distance from the player should decrease (chaser moves closer).

**Validates: Requirements 6.2**

### Property 18: Chaser Catch Ends Game

*For any* game state where the chaser's distance reaches zero or becomes negative, the game should transition to the game over state.

**Validates: Requirements 6.3**

### Property 19: Game State Reset on Restart

*For any* game state at game over, clicking restart should reset all game variables (score, distance, obstacles, powerups, player position) to their initial values.

**Validates: Requirements 7.4**

### Property 20: Pause-Resume Round-Trip

*For any* game state, pausing and then immediately resuming should preserve the game state (player position, obstacles, score, etc.).

**Validates: Requirements 7.5, 7.6**

### Property 21: Jump Arc Trajectory

*For any* jump action, the player's Y position should follow a parabolic arc (decreasing Y with negative velocity, then increasing Y with positive velocity due to gravity).

**Validates: Requirements 8.2**

### Property 22: Canvas Scaling Responsiveness

*For any* browser window resize event, the game canvas dimensions should scale proportionally to maintain the aspect ratio.

**Validates: Requirements 9.3**

## Error Handling

### Input Validation

- Validate lane boundaries before moving player
- Ignore invalid movement commands (e.g., left when already in leftmost lane)
- Handle rapid key presses gracefully (debounce if necessary)

### Collision Handling

- Check player state (jumping/sliding) before registering collision
- Ensure collision detection handles edge cases (player at lane boundaries)
- Prevent multiple collisions with the same obstacle in a single frame

### State Management

- Validate state transitions (menu → playing → paused → gameover)
- Prevent invalid state transitions (e.g., pause when not playing)
- Handle browser tab visibility changes (auto-pause when tab loses focus)

### Asset Loading

- Display loading screen while assets load
- Handle missing or failed asset loads gracefully
- Provide fallback graphics if images fail to load

### LocalStorage

- Check if localStorage is available before using
- Handle quota exceeded errors
- Provide default high score if localStorage is unavailable

### Performance

- Limit maximum number of active obstacles/powerups
- Remove offscreen objects immediately to prevent memory leaks
- Use object pooling for frequently created/destroyed objects

## Testing Strategy

### Dual Testing Approach

The game will use both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across many randomized inputs.

### Property-Based Testing

We will use a property-based testing library appropriate for JavaScript:

- **Library**: fast-check (JavaScript property-based testing library)
- **Configuration**: Minimum 100 iterations per property test
- **Tagging**: Each test must reference its design document property

Tag format: `// Feature: baweda-escape-endless-run, Property {number}: {property_text}`

Each correctness property listed above must be implemented by a single property-based test.

### Unit Testing

Unit tests should focus on:

- Specific examples that demonstrate correct behavior (e.g., specific powerup effects)
- Integration points between components (e.g., input handler → player system)
- Edge cases (e.g., boundary movements, empty game states)
- Error conditions (e.g., invalid input, missing assets)

Avoid writing too many unit tests for scenarios that property-based tests already cover. Focus unit tests on concrete examples and integration scenarios.

### Test Coverage Areas

1. **Player Movement Tests**
   - Property: Lane movement boundaries (Property 1)
   - Property: Action state transitions (Property 2)
   - Unit: Specific movement sequences
   - Unit: Edge cases (rapid key presses, simultaneous inputs)

2. **Obstacle System Tests**
   - Property: Valid obstacle spawning (Property 4)
   - Property: Lane clearance guarantee (Property 7)
   - Property: Offscreen cleanup (Property 6)
   - Unit: Specific obstacle configurations
   - Unit: Spawn timing edge cases

3. **Collision Detection Tests**
   - Property: Collision detection (Property 8)
   - Property: Collision avoidance (Property 10)
   - Unit: Specific collision scenarios
   - Unit: Edge cases (player at lane boundaries)

4. **Powerup System Tests**
   - Property: Powerup effect activation (Property 11)
   - Property: Powerup expiration round-trip (Property 12)
   - Unit: Energy drink effect example
   - Unit: Coin magnet effect example
   - Unit: Slow motion effect example

5. **Scoring System Tests**
   - Property: Score increases with distance (Property 13)
   - Property: Coin collection increases score (Property 14)
   - Property: High score persistence (Property 16)
   - Unit: Specific score calculations

6. **Game State Tests**
   - Property: Game state reset (Property 19)
   - Property: Pause-resume round-trip (Property 20)
   - Unit: State transition examples (menu → playing → gameover)
   - Unit: Invalid state transition handling

7. **Chaser System Tests**
   - Property: Chaser distance decreases with collisions (Property 17)
   - Property: Chaser catch ends game (Property 18)
   - Unit: Initial chaser position example
   - Unit: Specific chaser behavior scenarios

8. **Responsive Design Tests**
   - Property: Canvas scaling responsiveness (Property 22)
   - Unit: Desktop keyboard input example
   - Unit: Mobile touch input example

### Testing Tools

- **Test Framework**: Jest or Mocha
- **Property-Based Testing**: fast-check
- **Assertion Library**: Chai or Jest's built-in assertions
- **Test Coverage**: Istanbul/nyc

### Continuous Testing

- Run tests on every code change
- Maintain minimum 80% code coverage
- Run property tests with 100+ iterations in CI/CD pipeline
