// The hall's 3D world behind Homer: a bright, toy-like Greek island in the spirit of
// Wii Sports (rounded hills, a stadion with a cheering crowd, a temple, the sea).
// It is interactive: the camera follows the pointer, a click on the sea sends a ripple,
// a click on the crowd makes it cheer, and the crowd bounces while Homer speaks.
// No WebGL: the caller's fallback (the painted SVG) is shown instead.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { createPoetRig, type HomerAction } from '../poets/rig'

type World3DProps = {
  /** Homer is talking: the crowd gets livelier. */
  speaking?: boolean
  /** Shown when WebGL isn't available. */
  fallback?: ReactNode
  /** 'hall' (default): low, behind Homer on his plaza. 'vista': high over the whole island (the landing page). */
  view?: 'hall' | 'vista'
  /** Homer stands on the plaza, in the world (sharing its camera, light and shadows), doing this. */
  homerAction?: HomerAction
  /** Clicking Homer's mouth (the hall's easter egg). */
  onHomerMouth?: () => void
}

const SKY_TOP = new THREE.Color(0x2f8fe8)
const SKY_HORIZON = new THREE.Color(0xc6ecff)
const GRASS = 0x7cc35a
const GRASS_DARK = 0x58a845
const MARBLE = 0xf6f0e2
const MARBLE_SHADE = 0xe2d6bd
const TRACK = 0xd9824f
const SEA = 0x1f9be0
const CYPRESS = 0x2f7a46
const OLIVE = 0x6aa84f
const SKIN = [0xf6d2b3, 0xeab68e, 0xd39a6c, 0xb07650, 0x8a5636, 0x5e3a23]
const CROWD = [0xe94b3c, 0xf5a623, 0x4a90e2, 0x7ed321, 0x9b59b6, 0xf8e71c, 0x50e3c2, 0xff6fa8, 0xffffff, 0x1abc9c]

const mat = (color: number, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })

/** Smooth rolling hills: a few sine waves, gentle like Wii Sports Resort's fields. */
const hill = (x: number, z: number) =>
  Math.sin(x * 0.045) * 1.6 + Math.cos(z * 0.06 + x * 0.02) * 1.3 + Math.sin((x + z) * 0.11) * 0.4
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** The ground's height everywhere: flat (y 0) around the plaza and the stadion, rolling hills further
 *  out, sloping under the sea at the far shore. Trees and temples stand on exactly this. */
const groundHeight = (x: number, z: number) => {
  const flat = clamp01((Math.hypot(x * 0.8, z + 12) - 40) / 30)
  const shore = clamp01((-z - 70) / 30)
  return hill(x, z) * flat * (1 - shore) - shore * 2.6
}
// Homer on the plaza: his feet, and his size (about 5.2 units tall: body height 6.06 x 0.86).
const HOMER_SPOT = new THREE.Vector3(0, 0.4, 9)
const HOMER_SCALE = 0.86

export default function World3D({ speaking = false, fallback = null, view = 'hall', homerAction, onHomerMouth }: World3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const speakingRef = useRef(speaking)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])
  const hasHomer = homerAction !== undefined
  const onHomerMouthRef = useRef(onHomerMouth)
  useEffect(() => {
    onHomerMouthRef.current = onHomerMouth
  }, [onHomerMouth])
  const actionRef = useRef<HomerAction>(homerAction ?? 'idle')
  const actionStarted = useRef(performance.now())
  useEffect(() => {
    if (homerAction && homerAction !== actionRef.current) {
      actionRef.current = homerAction
      actionStarted.current = performance.now()
    }
  }, [homerAction])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    } catch (error) {
      console.warn('MeNIN world off:', error)
      setFailed(true)
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xd4efff, 90, 300)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600)
    const vista = view === 'vista'
    // Hall: low, like a Wii Sports camera, so Homer on the plaza fills the frame above the dialogue.
    const cameraHome = vista ? new THREE.Vector3(-10, 22, 46) : new THREE.Vector3(0, 2.7, 24)
    const lookAt = vista ? new THREE.Vector3(8, 0, -45) : new THREE.Vector3(0, 2.0, -21)
    camera.position.copy(cameraHome)

    // Sky dome: a vertical gradient, brightest at the horizon.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: SKY_TOP }, horizon: { value: SKY_HORIZON } },
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main(){ float h = clamp(normalize(vPos).y * 1.8, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
      }),
    )
    scene.add(sky)

    // Sun: a soft disc with a glow, top right like the painted scene.
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 128
    const glowPaint = glowCanvas.getContext('2d')!
    const glowGradient = glowPaint.createRadialGradient(64, 64, 0, 64, 64, 64)
    glowGradient.addColorStop(0, 'rgba(255, 249, 220, 0.9)')
    glowGradient.addColorStop(0.25, 'rgba(255, 246, 210, 0.45)')
    glowGradient.addColorStop(1, 'rgba(255, 246, 210, 0)')
    glowPaint.fillStyle = glowGradient
    glowPaint.fillRect(0, 0, 128, 128)
    const glowTexture = new THREE.CanvasTexture(glowCanvas)
    glowTexture.colorSpace = THREE.SRGBColorSpace
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, fog: false, depthWrite: false, transparent: true }))
    sunGlow.scale.setScalar(90)
    sunGlow.position.set(120, 95, -330)
    scene.add(sunGlow)
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(11, 32), new THREE.MeshBasicMaterial({ color: 0xfffbe8, fog: false }))
    sunDisc.position.set(120, 95, -329)
    scene.add(sunDisc)

    scene.add(new THREE.HemisphereLight(0xd7f0ff, 0x6f9a4a, 1.9))
    const sun = new THREE.DirectionalLight(0xfff0d4, 2.6)
    sun.position.set(30, 45, 20)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 30, bottom: -30, near: 1, far: 140 })
    sun.shadow.bias = -0.0008
    scene.add(sun)

    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = scene, shadows = true): T => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = shadows
          child.receiveShadow = true
        }
      })
      parent.add(object)
      return object
    }

    // Ground: rolling green hills with light and dark patches.
    const groundGeometry = new THREE.PlaneGeometry(260, 160, 90, 60)
    groundGeometry.rotateX(-Math.PI / 2)
    const groundColors: number[] = []
    const light = new THREE.Color(GRASS)
    const darkGrass = new THREE.Color(GRASS_DARK)
    const tint = new THREE.Color()
    const sand = new THREE.Color(0xf1dfa8)
    const gPos = groundGeometry.attributes.position
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i)
      const z = gPos.getZ(i) - 40
      // Toward the far edge the land slopes under the sea, leaving a sandy shore.
      const shore = clamp01((-z - 70) / 30)
      gPos.setY(i, groundHeight(x, z))
      tint.copy(light).lerp(darkGrass, 0.5 + 0.5 * Math.sin(x * 0.17 + Math.cos(z * 0.13) * 2))
      if (shore > 0.45) tint.lerp(sand, Math.min(1, (shore - 0.45) * 4))
      groundColors.push(tint.r, tint.g, tint.b)
    }
    groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3))
    groundGeometry.computeVertexNormals()
    const ground = add(new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })))
    ground.position.z = -40
    ground.castShadow = false

    // The sea beyond the land, gently waving.
    const seaGeometry = new THREE.PlaneGeometry(700, 260, 70, 26)
    seaGeometry.rotateX(-Math.PI / 2)
    const seaBase = Float32Array.from(seaGeometry.attributes.position.array)
    const sea = new THREE.Mesh(seaGeometry, new THREE.MeshStandardMaterial({ color: SEA, roughness: 0.35, metalness: 0.05 }))
    sea.position.set(0, -1.1, -225)
    sea.receiveShadow = true
    scene.add(sea)

    // The marble plaza Homer stands on, front and centre.
    const plaza = new THREE.Group()
    add(new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 0.8, 72), mat(MARBLE, 0.6)), plaza)
    add(new THREE.Mesh(new THREE.CylinderGeometry(8.7, 9.3, 0.5, 72), mat(MARBLE_SHADE, 0.7)), plaza).position.y = -0.5
    const inlay = add(new THREE.Mesh(new THREE.RingGeometry(4.6, 5.0, 72), mat(0xd7b46a, 0.5)), plaza, false)
    inlay.rotation.x = -Math.PI / 2
    inlay.position.y = 0.41
    // Homer stands at its centre (HOMER_SPOT).
    plaza.position.set(HOMER_SPOT.x, 0, HOMER_SPOT.z)
    scene.add(plaza)

    // The stadion: a running track with white lanes, a green infield and tiered stands.
    const stadion = new THREE.Group()
    stadion.position.set(-6, 0, -34)
    const oval = (rx: number, rz: number) => {
      const shape = new THREE.Shape()
      shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0)
      return shape
    }
    const trackShape = oval(30, 13)
    trackShape.holes.push(oval(24, 8.5) as unknown as THREE.Path)
    const track = add(new THREE.Mesh(new THREE.ShapeGeometry(trackShape, 64), mat(TRACK, 0.9)), stadion, false)
    track.rotation.x = -Math.PI / 2
    track.position.y = 0.05
    const infield = add(new THREE.Mesh(new THREE.ShapeGeometry(oval(24, 8.5), 64), mat(0x8fd067, 0.95)), stadion, false)
    infield.rotation.x = -Math.PI / 2
    infield.position.y = 0.06
    for (let lane = 1; lane < 4; lane++) {
      const f = lane / 4
      const lineShape = oval(24 + 6 * f + 0.12, 8.5 + 4.5 * f + 0.12)
      lineShape.holes.push(oval(24 + 6 * f - 0.12, 8.5 + 4.5 * f - 0.12) as unknown as THREE.Path)
      const line = add(new THREE.Mesh(new THREE.ShapeGeometry(lineShape, 64), mat(0xffffff, 0.8)), stadion, false)
      line.rotation.x = -Math.PI / 2
      line.position.y = 0.08
    }
    // Stands: stepped marble rows around the far half of the track. Each row is a hollow
    // half-ellipse ring, a step higher than the one in front, so every spectator sits on top of one.
    const ROWS = 4
    const ROW_DEPTH = 1.6
    const ROW_RISE = 0.85
    const STAND_RX = 31.2 // just outside the track (30 x 13)
    const STAND_RZ = 14.2
    const halfRing = (rx0: number, rz0: number, rx1: number, rz1: number) => {
      // Shape y > 0 becomes the far side (world z < 0) once the extrusion is turned upright.
      const shape = new THREE.Shape()
      const steps = 48
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI
        if (i === 0) shape.moveTo(Math.cos(a) * rx1, Math.sin(a) * rz1)
        else shape.lineTo(Math.cos(a) * rx1, Math.sin(a) * rz1)
      }
      for (let i = steps; i >= 0; i--) {
        const a = (i / steps) * Math.PI
        shape.lineTo(Math.cos(a) * rx0, Math.sin(a) * rz0)
      }
      shape.closePath()
      return shape
    }
    for (let row = 0; row < ROWS; row++) {
      const inner = row * ROW_DEPTH
      const height = (row + 1) * ROW_RISE
      const geometry = new THREE.ExtrudeGeometry(
        halfRing(STAND_RX + inner, STAND_RZ + inner, STAND_RX + inner + ROW_DEPTH, STAND_RZ + inner + ROW_DEPTH),
        { depth: height, bevelEnabled: false, curveSegments: 1 },
      )
      geometry.rotateX(-Math.PI / 2)
      add(new THREE.Mesh(geometry, mat(row % 2 ? MARBLE_SHADE : MARBLE, 0.7)), stadion)
    }
    // A low wall behind the top row.
    const wallInner = ROWS * ROW_DEPTH
    const wall = new THREE.ExtrudeGeometry(
      halfRing(STAND_RX + wallInner, STAND_RZ + wallInner, STAND_RX + wallInner + 0.5, STAND_RZ + wallInner + 0.5),
      { depth: (ROWS + 1.4) * ROW_RISE, bevelEnabled: false, curveSegments: 1 },
    )
    wall.rotateX(-Math.PI / 2)
    add(new THREE.Mesh(wall, mat(MARBLE_SHADE, 0.7)), stadion)
    scene.add(stadion)

    // The crowd: Mii-like spectators (a bright body and a skin head), one per seat, evenly spaced along
    // each row with a little jitter, sitting on the step (body bottom on the step's top).
    const SEATS_PER_ROW = 38
    const crowdCount = ROWS * SEATS_PER_ROW
    const BODY_HALF = 0.32 + 0.45 / 2 // capsule radius + half its straight length
    const crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.32, 0.45, 4, 8), mat(0xffffff, 0.75), crowdCount)
    const crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 12, 8), mat(0xffffff, 0.7), crowdCount)
    const crowdSeats: Array<{ x: number; y: number; z: number; phase: number; jump: number }> = []
    const crowdColor = new THREE.Color()
    for (let i = 0; i < crowdCount; i++) {
      const row = Math.floor(i / SEATS_PER_ROW)
      const seat = i % SEATS_PER_ROW
      const a = Math.PI * (0.05 + 0.9 * ((seat + 0.5 + (Math.random() - 0.5) * 0.4) / SEATS_PER_ROW))
      // The middle of the row's step, a touch toward the back so they sit in front of the next riser.
      const mid = row * ROW_DEPTH + ROW_DEPTH * 0.6
      crowdSeats.push({
        x: Math.cos(a) * (STAND_RX + mid),
        y: (row + 1) * ROW_RISE + BODY_HALF,
        z: -Math.sin(a) * (STAND_RZ + mid),
        phase: Math.random() * Math.PI * 2,
        jump: 0,
      })
      crowdBody.setColorAt(i, crowdColor.setHex(CROWD[(i * 7) % CROWD.length]))
      crowdHead.setColorAt(i, crowdColor.setHex(SKIN[(i * 5 + row) % SKIN.length]))
    }
    crowdBody.castShadow = true
    stadion.add(crowdBody, crowdHead)
    const crowdMatrix = new THREE.Matrix4()

    // A temple on the hill to the right, and a smaller one far left.
    const temple = (columns: number) => {
      const group = new THREE.Group()
      const width = columns * 1.6
      add(new THREE.Mesh(new THREE.BoxGeometry(width + 1.6, 0.6, 6.4), mat(MARBLE_SHADE)), group).position.y = 0.3
      add(new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.5, 5.8), mat(MARBLE)), group).position.y = 0.85
      const column = new THREE.CylinderGeometry(0.32, 0.38, 4.2, 16)
      for (let c = 0; c < columns; c++) {
        for (const z of [-2.2, 2.2]) {
          add(new THREE.Mesh(column, mat(MARBLE, 0.6)), group).position.set(-width / 2 + 0.8 + c * 1.6, 3.2, z)
        }
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.6, 5.8), mat(MARBLE)), group).position.y = 5.6
      const pediment = new THREE.Shape()
      pediment.moveTo(-(width + 1.2) / 2, 0)
      pediment.lineTo((width + 1.2) / 2, 0)
      pediment.lineTo(0, 1.6)
      pediment.closePath()
      const roof = add(new THREE.Mesh(new THREE.ExtrudeGeometry(pediment, { depth: 6, bevelEnabled: false }), mat(0xd96c4a, 0.8)), group)
      roof.position.set(0, 5.9, -3)
      return group
    }
    const bigTemple = add(temple(6))
    bigTemple.position.set(30, groundHeight(30, -50) - 0.3, -50)
    bigTemple.rotation.y = -0.35
    const smallTemple = add(temple(4))
    smallTemple.position.set(-58, groundHeight(-58, -78) - 0.3, -78)
    smallTemple.rotation.y = 0.5
    smallTemple.scale.setScalar(0.9)

    // Trees: tall cypresses and round olives, each swaying a little.
    const trees: THREE.Object3D[] = []
    const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.6, 8)
    const cypress = (x: number, z: number, h = 6) => {
      const tree = new THREE.Group()
      add(new THREE.Mesh(trunkGeometry, mat(0x7a5634)), tree).position.y = 0.8
      const crown = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(CYPRESS, 0.9)), tree)
      crown.scale.set(1.1, h / 2, 1.1)
      crown.position.y = h / 2 + 1
      tree.position.set(x, groundHeight(x, z), z)
      trees.push(add(tree))
    }
    const olive = (x: number, z: number, s = 1) => {
      const tree = new THREE.Group()
      add(new THREE.Mesh(trunkGeometry, mat(0x8a6a44)), tree).position.y = 0.8
      ;[[0, 2.4, 0, 1.6], [-1, 2.1, 0.4, 1.1], [1.05, 2.2, -0.3, 1.2], [0.2, 3.1, -0.4, 1.1]].forEach(([px, py, pz, r]) => {
        add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(OLIVE, 0.9)), tree).position.set(px, py, pz)
      })
      tree.scale.setScalar(s)
      tree.position.set(x, groundHeight(x, z), z)
      trees.push(add(tree))
    }
    ;[[-16, -10], [-19, -16], [16, -12], [19, -18], [38, -40], [24, -44], [-44, -30], [-36, -52]].forEach(([x, z]) => cypress(x, z, 5 + ((x + z) & 3)))
    ;[[-22, 2], [21, 0], [-28, -6], [27, -8], [44, -62], [-30, -60], [46, -30], [-50, -16]].forEach(([x, z], i) => olive(x, z, 0.9 + (i % 3) * 0.2))

    // Islands and mountains out at sea, softened by the fog.
    const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x4f9a63, roughness: 0.95 })
    ;[[-80, -150, 20, 9], [60, -165, 26, 12], [130, -190, 34, 16], [-150, -200, 30, 13]].forEach(([x, z, r, h]) => {
      const island = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), islandMaterial)
      island.scale.set(r, h, r * 0.6)
      island.position.set(x, -1, z)
      scene.add(island)
    })

    // Sailboats bobbing on the sea.
    const boats: Array<{ group: THREE.Group; speed: number; base: number }> = []
    const boat = (x: number, z: number, speed: number) => {
      const group = new THREE.Group()
      const hull = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.2, 4, 12), mat(0x8b5a35)), group)
      hull.rotation.z = Math.PI / 2
      hull.scale.set(1, 1, 0.55)
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), mat(0x6b4a2e)), group).position.y = 3
      const sailShape = new THREE.Shape()
      sailShape.moveTo(0, 0)
      sailShape.lineTo(2.8, 0)
      sailShape.lineTo(0, 5)
      sailShape.closePath()
      const sail = add(new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: 0xfff6dd, side: THREE.DoubleSide, roughness: 0.8 })), group)
      sail.position.set(0.15, 0.8, 0)
      group.position.set(x, -0.4, z)
      scene.add(group)
      boats.push({ group, speed, base: x })
    }
    boat(46, -130, 1.2)
    boat(-60, -150, -0.8)
    boat(110, -170, 0.6)

    // Puffy clouds made of spheres, drifting across.
    const clouds: THREE.Group[] = []
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25, fog: false })
    const puff = new THREE.SphereGeometry(1, 16, 12)
    for (let i = 0; i < 9; i++) {
      const group = new THREE.Group()
      const n = 4 + (i % 3)
      for (let p = 0; p < n; p++) {
        const m = new THREE.Mesh(puff, cloudMaterial)
        const r = 3 + Math.random() * 3
        m.scale.set(r * 1.3, r, r)
        m.position.set(p * 4 - n * 2 + Math.random(), Math.random() * 2, Math.random() * 2)
        group.add(m)
      }
      group.position.set(-220 + i * 55 + Math.random() * 20, 45 + Math.random() * 30, -160 - Math.random() * 120)
      scene.add(group)
      clouds.push(group)
    }

    // Gulls: little Vs that circle, and scatter when the sea is clicked.
    // Wings are thin boxes, not planes, so a gull never turns edge-on into a streak.
    const gullMaterial = mat(0xf4f1ea, 0.8)
    const gullBodyGeometry = new THREE.SphereGeometry(0.22, 10, 8)
    const gullWing = new THREE.BoxGeometry(1.3, 0.08, 0.42)
    gullWing.translate(0.65, 0, 0)
    const gulls = Array.from({ length: 6 }, (_, i) => {
      const group = new THREE.Group()
      const body = new THREE.Mesh(gullBodyGeometry, gullMaterial)
      body.scale.set(1, 0.8, 2)
      const left = new THREE.Mesh(gullWing, gullMaterial)
      const right = new THREE.Mesh(gullWing, gullMaterial)
      right.rotation.y = Math.PI
      group.add(body, left, right)
      scene.add(group)
      return { group, left, right, radius: 18 + i * 6, height: 22 + (i % 3) * 5, speed: 0.12 + i * 0.02, angle: i * 1.3, scatter: 0 }
    })

    // Ripples on the sea where it's clicked.
    const ripples: Array<{ mesh: THREE.Mesh; age: number }> = []
    const rippleGeometry = new THREE.RingGeometry(0.85, 1, 48)
    rippleGeometry.rotateX(-Math.PI / 2)

    // Homer himself, on the plaza.
    const rig = hasHomer ? createPoetRig(undefined, HOMER_SCALE) : null
    if (rig) {
      rig.root.position.copy(HOMER_SPOT)
      scene.add(rig.root)
    }

    // Pointer: the camera leans toward it (parallax); clicks hit the sea or the crowd.
    const pointer = new THREE.Vector2(0, 0)
    const pointerTarget = new THREE.Vector2(0, 0)
    const raycaster = new THREE.Raycaster()
    const onMove = (event: PointerEvent) => {
      pointerTarget.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
      wake()
    }
    const crowdHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 32, 1, true, Math.PI * 0.5, Math.PI),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    )
    crowdHitbox.scale.set(STAND_RX + wallInner, (ROWS + 2) * ROW_RISE, STAND_RZ + wallInner)
    crowdHitbox.position.y = ((ROWS + 2) * ROW_RISE) / 2
    stadion.add(crowdHitbox)
    const cheer = (strength = 1) => crowdSeats.forEach((seat) => (seat.jump = Math.max(seat.jump, strength * (0.6 + Math.random() * 0.4))))
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (target?.closest('button, a, input, select, textarea, [role="listbox"], .dialogue, .workspace, .game-strip, .mode-topbar')) return
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width) return
      const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      if (rig && raycaster.intersectObject(rig.mouthHitbox).length) {
        onHomerMouthRef.current?.()
      } else if (raycaster.intersectObject(crowdHitbox).length) {
        cheer(1.3)
      } else {
        const hit = raycaster.intersectObject(sea)[0]
        if (hit) {
          const mesh = new THREE.Mesh(rippleGeometry, new THREE.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.9, depthWrite: false }))
          mesh.position.copy(hit.point).setY(-0.2)
          scene.add(mesh)
          ripples.push({ mesh, age: 0 })
          gulls.forEach((gull) => (gull.scatter = 1))
        }
      }
      wake()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('click', onClick)

    const resize = () => {
      const { clientWidth, clientHeight } = mount
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      // Narrow (portrait) screens: pull back so the plaza and stands still fit.
      camera.fov = camera.aspect < 1 ? 52 : 38
      camera.updateProjectionMatrix()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    // Render at full rate while something moves because of the user; otherwise 30 fps is plenty.
    let awakeUntil = 0
    const wake = () => (awakeUntil = performance.now() + 1500)
    const clock = new THREE.Clock()
    let frame = 0
    let last = -1
    const seaPos = seaGeometry.attributes.position
    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (document.hidden || !mount.offsetWidth) return
      const time = clock.getElapsedTime()
      step(time)
    }
    const step = (time: number, force = false) => {
      const live = performance.now() < awakeUntil || speakingRef.current || ripples.length > 0
      if (!force && !live && time - last < 1 / 30) return
      const dt = last < 0 ? 0 : Math.min(Math.max(time - last, 0), 0.1)
      last = Math.max(last, time)
      const motion = reducedMotion ? 0.15 : 1

      pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 3))
      // The hall's camera leans less, so Homer stays put above the dialogue.
      const lean = vista ? 1 : 0.5
      camera.position.set(cameraHome.x + pointer.x * 2.4 * lean, cameraHome.y - pointer.y * 1.1 * lean + Math.sin(time * 0.2) * 0.15 * motion * lean, cameraHome.z)
      camera.lookAt(lookAt.x + pointer.x * 1.2 * lean, lookAt.y - pointer.y * 0.5 * lean, lookAt.z)
      rig?.update({ time, dt, speaking: speakingRef.current, action: actionRef.current, age: (performance.now() - actionStarted.current) / 1000, look: pointer, motion })

      for (let i = 0; i < seaPos.count; i++) {
        const x = seaBase[i * 3], z = seaBase[i * 3 + 2]
        seaPos.setY(i, (Math.sin(x * 0.05 + time * 0.9) + Math.cos(z * 0.08 + time * 0.7)) * 0.35 * motion)
      }
      seaPos.needsUpdate = true
      seaGeometry.computeVertexNormals()

      const lively = speakingRef.current ? 1 : 0
      crowdSeats.forEach((seat, i) => {
        seat.jump = Math.max(0, seat.jump - dt * 0.6)
        const bounce = Math.max(0, Math.sin(time * (6 + lively * 4) + seat.phase)) * (0.08 + lively * 0.25 + seat.jump * 0.9) * motion
        crowdMatrix.makeTranslation(seat.x, seat.y + bounce, seat.z)
        crowdBody.setMatrixAt(i, crowdMatrix)
        crowdMatrix.makeTranslation(seat.x, seat.y + bounce + 0.72, seat.z)
        crowdHead.setMatrixAt(i, crowdMatrix)
      })
      crowdBody.instanceMatrix.needsUpdate = true
      crowdHead.instanceMatrix.needsUpdate = true

      trees.forEach((tree, i) => (tree.rotation.z = Math.sin(time * 0.8 + i) * 0.02 * motion))
      boats.forEach((b, i) => {
        b.group.position.x = b.base + Math.sin(time * 0.02 * b.speed + i) * 40 * motion
        b.group.position.y = -0.5 + Math.sin(time * 1.1 + i) * 0.25 * motion
        b.group.rotation.z = Math.sin(time * 0.9 + i) * 0.05 * motion
      })
      clouds.forEach((cloud) => {
        cloud.position.x += dt * 1.6 * motion
        if (cloud.position.x > 260) cloud.position.x = -260
      })
      gulls.forEach((gull) => {
        gull.scatter = Math.max(0, gull.scatter - dt * 0.35)
        gull.angle += dt * (gull.speed + gull.scatter * 0.9) * motion
        const r = gull.radius + gull.scatter * 25
        gull.group.position.set(Math.cos(gull.angle) * r, gull.height + gull.scatter * 10, -60 + Math.sin(gull.angle) * r * 0.5)
        gull.group.rotation.y = -gull.angle
        const flap = Math.sin(time * (5 + gull.scatter * 8) + gull.radius) * 0.5
        gull.left.rotation.z = flap
        gull.right.rotation.z = -flap
      })
      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i]
        ripple.age += dt
        ripple.mesh.scale.setScalar(1 + ripple.age * 9)
        ;(ripple.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - ripple.age * 0.45)
        if (ripple.age > 2) {
          scene.remove(ripple.mesh)
          ;(ripple.mesh.material as THREE.Material).dispose()
          ripples.splice(i, 1)
        }
      }

      renderer.render(scene, camera)
    }
    animate()
    // Dev only: step the hall's Homer by hand (the loop pauses while the page isn't on screen).
    if (import.meta.env.DEV && rig) {
      let fake = clock.getElapsedTime()
      ;(window as unknown as Record<string, unknown>).__homer = {
        advance: (seconds = 1) => {
          for (let t = 0; t < seconds; t += 1 / 30) step((fake = Math.max(fake, clock.getElapsedTime()) + 1 / 30), true)
        },
        set: (next: HomerAction) => {
          actionRef.current = next
          actionStarted.current = performance.now()
        },
        /** Where Homer's mouth is on screen (client px), for testing the easter egg's click. */
        mouth: () => {
          const p = new THREE.Vector3()
          rig.mouthHitbox.getWorldPosition(p).project(camera)
          const rect = renderer.domElement.getBoundingClientRect()
          return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height }
        },
      }
    }

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('click', onClick)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((entry) => entry.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [view])

  if (failed) return <>{fallback}</>
  return <div className="world-3d" ref={mountRef} aria-hidden="true" />
}
