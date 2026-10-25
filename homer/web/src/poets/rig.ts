// A poet's 3D body: Homer's skeleton and poses, with an appearance (hair, beard, robe) so other
// poets share the rig. Used standalone (Homer3D: the arena panel, the landing cards) and inside
// the hall's 3D world (World3D), where it shares the world's camera, light and shadows.
//
// Units: the rig's root sits at the poet's feet. Height is about 6.06 body units times `scale`.

import * as THREE from 'three'

/** What the poet is doing. The hall and the arena pick one from the context. */
export type HomerAction =
  | 'idle' // standing, breathing, glancing at the pointer
  | 'welcome' // waves the poets in
  | 'listen' // hands clasped, leaning in while a poet gets ready
  | 'judge' // sits on his throne, chin on hand
  | 'verdict' // seated, points at the poet as the verdict lands
  | 'sing' // arms wide, singing the stitched song
  | 'laurel' // holds up the laurel wreath for the champion
  | 'cheer' // both arms up

export type PoetLook = {
  skin: number
  skinLight: number
  hair: number
  /** Curly crown (Homer), short cropped (Virgil). */
  hairStyle: 'curls' | 'short'
  beard: 'full' | 'none'
  robe: number
  sash: number
  legs: number
  shoes: number
  headband: boolean
  /** A laurel crown on the head (Virgil). */
  crown: boolean
}

export const HOMER_LOOK: PoetLook = {
  skin: 0xe8a26f, skinLight: 0xf1b681, hair: 0xf1eee4, hairStyle: 'curls', beard: 'full',
  robe: 0xf1eee4, sash: 0x174f9f, legs: 0x24364f, shoes: 0x252321, headband: true, crown: false,
}
// Hesiod, the farmer-poet of Ascra: dark greying hair and beard, an earthy tunic.
export const HESIOD_LOOK: PoetLook = {
  skin: 0xd9935f, skinLight: 0xe6a874, hair: 0x5b4a3c, hairStyle: 'curls', beard: 'full',
  robe: 0xcdb98c, sash: 0x4f7a3a, legs: 0x6a5238, shoes: 0x4a3626, headband: false, crown: false,
}
// Virgil of Mantua: clean-shaven, short dark hair, a laurel crown and a white toga with a crimson band.
export const VIRGIL_LOOK: PoetLook = {
  skin: 0xeab38a, skinLight: 0xf3c49c, hair: 0x3f2e22, hairStyle: 'short', beard: 'none',
  robe: 0xf6f2e8, sash: 0x8c2335, legs: 0xd8cdb4, shoes: 0x6b4a2e, headband: false, crown: true,
}

const material = (color: number, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 })

/** Every joint the rig animates, in radians, plus how far the poet is sitting (0 standing, 1 seated). */
type Pose = {
  sit: number
  torsoX: number
  torsoZ: number
  headX: number
  headZ: number
  lShoulderX: number
  lShoulderY: number
  lShoulderZ: number
  lElbowX: number
  rShoulderX: number
  rShoulderY: number
  rShoulderZ: number
  rElbowX: number
  hipX: number
  kneeX: number
  wreath: number
  /** Turns the whole body; seated, he faces the poets three-quarters on so the pose reads. */
  yaw: number
}

const REST: Pose = {
  sit: 0, torsoX: 0, torsoZ: 0, headX: 0, headZ: 0,
  lShoulderX: 0, lShoulderY: 0, lShoulderZ: -0.08, lElbowX: -0.15,
  rShoulderX: 0, rShoulderY: 0, rShoulderZ: 0.08, rElbowX: -0.15,
  hipX: 0, kneeX: 0, wreath: 0, yaw: 0,
}

// Signs: a shoulder's negative X swings the arm forward (toward the viewer); Z swings it out to
// the side (left arm negative, right arm positive); a negative elbow X bends the forearm forward.
const SEATED = { sit: 1, hipX: -1.5, kneeX: 1.5, yaw: 0.55 }
export const POSES: Record<HomerAction, Partial<Pose>> = {
  idle: {},
  welcome: { rShoulderZ: 2.35, rShoulderX: -0.2, rElbowX: -0.35, lShoulderZ: -0.3, lElbowX: -0.6, headZ: -0.05 },
  listen: { lShoulderX: -0.55, lShoulderY: 0.5, lShoulderZ: 0.1, lElbowX: -1.35, rShoulderX: -0.55, rShoulderY: -0.5, rShoulderZ: -0.1, rElbowX: -1.35, torsoX: 0.06, headX: 0.06 },
  judge: { ...SEATED, torsoX: 0.12, headX: 0.12, headZ: 0.08, rShoulderX: -0.95, rShoulderY: -0.35, rShoulderZ: -0.15, rElbowX: -2.15, lShoulderX: -0.75, lShoulderZ: -0.05, lElbowX: -0.55 },
  verdict: { ...SEATED, torsoX: -0.04, headX: -0.05, rShoulderX: -1.45, rShoulderZ: 0.35, rElbowX: -0.1, lShoulderX: -0.75, lShoulderZ: -0.05, lElbowX: -0.55 },
  sing: { torsoX: -0.06, headX: -0.18, lShoulderX: -0.35, lShoulderZ: -1.85, lElbowX: -0.35, rShoulderX: -0.35, rShoulderZ: 1.85, rElbowX: -0.35 },
  laurel: { headX: 0.08, torsoX: 0.04, lShoulderX: -1.3, lShoulderY: 0.4, lShoulderZ: 0.1, lElbowX: -0.35, rShoulderX: -1.3, rShoulderY: -0.4, rShoulderZ: -0.1, rElbowX: -0.35, wreath: 1 },
  cheer: { headX: -0.15, lShoulderZ: -2.65, lElbowX: -0.2, rShoulderZ: 2.65, rElbowX: -0.2 },
}

/** The hall's mode reactions, as actions. */
const MODE_ACTION: Record<'bard' | 'judge' | 'battle', HomerAction> = { bard: 'listen', judge: 'judge', battle: 'welcome' }

// Dev only: ?homer=judge (or any action) pins the pose, for styling without running a battle.
const DEV_ACTION = import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('homer') as HomerAction | null) : null

/** The action to show: the dev override, else the explicit action, else the hall's mode reaction. */
export function resolveAction(mode: 'bard' | 'judge' | 'battle' | null, action?: HomerAction): HomerAction {
  if (DEV_ACTION && DEV_ACTION in POSES) return DEV_ACTION
  return action ?? (mode ? MODE_ACTION[mode] : 'welcome')
}

export type RigInput = {
  /** Seconds since the rig started. */
  time: number
  /** Seconds since the last update (0 on the first). */
  dt: number
  speaking: boolean
  action: HomerAction
  /** Seconds since the action changed. */
  age: number
  /** Where the pointer is, -1..1 each way: he glances toward it. */
  look: THREE.Vector2
  /** 1, or less for prefers-reduced-motion. */
  motion: number
}

export type PoetRig = {
  root: THREE.Group
  /** An invisible target over the mouth and beard, for clicks (the hall's Iliad easter egg). */
  mouthHitbox: THREE.Mesh
  update: (input: RigInput) => void
  /** True while any joint is still blending toward its target. */
  settling: () => boolean
}

export function createPoetRig(look: PoetLook = HOMER_LOOK, scale = 0.46): PoetRig {
  const root = new THREE.Group()
  const body = new THREE.Group()
  const FEET = 2.16 // body units from mid-chest down to the soles
  const restY = FEET * scale
  body.scale.setScalar(scale)
  body.position.y = restY
  root.add(body)

  const skin = material(look.skin, 0.82)
  const skinLight = material(look.skinLight, 0.8)
  const hair = material(look.hair, 0.9)
  const robe = material(look.robe, 0.9)
  const sashMaterial = material(look.sash, 0.7)
  const legsMaterial = material(look.legs, 0.76)
  const dark = material(0x252321, 0.84)
  const shoes = material(look.shoes, 0.84)
  const mouthDark = material(0x4b241c, 0.9)
  const marble = material(0xf4eee0, 0.55)
  const marbleShade = material(0xdccfb4, 0.6)
  const leaf = material(0x4f8a35, 0.7)
  const leafLight = material(0x79b04e, 0.7)
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x292522 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xc99c32, roughness: 0.38, metalness: 0.38 })

  const addMesh = (
    geometry: THREE.BufferGeometry,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    position: [number, number, number],
    meshScale: [number, number, number] = [1, 1, 1],
  ) => {
    const mesh = new THREE.Mesh(geometry, meshMaterial)
    mesh.position.set(...position)
    mesh.scale.set(...meshScale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const group = (parent: THREE.Object3D, position: [number, number, number]) => {
    const g = new THREE.Group()
    g.position.set(...position)
    parent.add(g)
    return g
  }

  const sphere = new THREE.SphereGeometry(1, 32, 24)
  const capsule = new THREE.CapsuleGeometry(0.5, 1, 8, 20)

  // Skeleton. Coordinates are the body's own; y = 0 is mid-chest.
  // hips (y -0.7) carries the torso and the legs; sitting lowers the hips by a thigh's length.
  const HIPS_Y = -0.7
  const THIGH = 0.68
  const hips = group(body, [0, HIPS_Y, 0])
  const torso = group(hips, [0, 0, 0])
  addMesh(sphere, legsMaterial, hips, [0, -0.02, -0.06], [0.64, 0.34, 0.5])

  // Torso: robe, neck, sash and pin (positions relative to the hips).
  addMesh(new THREE.CylinderGeometry(0.78, 0.58, 1.42, 32), robe, torso, [0, 0.8, -0.05], [1, 1, 0.78])
  addMesh(capsule, skin, torso, [0, 1.6, -0.12], [0.28, 0.34, 0.28])
  const sash = addMesh(capsule, sashMaterial, torso, [-0.28, 0.78, 0.57], [0.2, 0.82, 0.12])
  sash.rotation.z = -0.2
  addMesh(sphere, gold, torso, [-0.5, 1.38, 0.65], [0.17, 0.17, 0.085])

  // Arms: shoulder > upper arm > elbow > forearm > hand. side -1 is the viewer's left.
  const arm = (side: -1 | 1) => {
    addMesh(sphere, robe, torso, [side * 0.76, 0.98, -0.01], [0.33, 0.34, 0.3])
    const shoulder = group(torso, [side * 0.8, 0.95, 0.02])
    addMesh(new THREE.CapsuleGeometry(0.16, 0.3, 8, 18), skinLight, shoulder, [0, -0.28, 0])
    const elbow = group(shoulder, [0, -0.55, 0])
    addMesh(new THREE.CapsuleGeometry(0.15, 0.26, 8, 18), skinLight, elbow, [0, -0.22, 0])
    const hand = group(elbow, [0, -0.47, 0.02])
    addMesh(sphere, skinLight, hand, [0, 0, 0], [0.2, 0.2, 0.19])
    return { shoulder, elbow }
  }
  const left = arm(-1)
  const right = arm(1)

  // Legs: hip > thigh > knee > shin > sandal.
  const leg = (side: -1 | 1) => {
    const hip = group(hips, [side * 0.3, -0.1, -0.06])
    addMesh(capsule, legsMaterial, hip, [0, -0.34, 0], [0.23, 0.36, 0.24])
    const knee = group(hip, [0, -THIGH, 0])
    addMesh(capsule, legsMaterial, knee, [0, -0.3, 0], [0.22, 0.34, 0.23])
    addMesh(sphere, shoes, knee, [0, -0.62, 0.17], [0.3, 0.18, 0.42])
    return { hip, knee }
  }
  const legs = [leg(-1), leg(1)]

  // Head: everything above the neck pivots here. headInner shifts back to the original
  // coordinates so the face keeps its hand-placed positions.
  const NECK_Y = 1.15
  const headPivot = group(torso, [0, NECK_Y - HIPS_Y, 0])
  const headInner = group(headPivot, [0, -NECK_Y, 0])
  addMesh(sphere, skinLight, headInner, [0, 2.25, 0.08], [1.1, 1.34, 1])

  if (look.hairStyle === 'curls') {
    addMesh(sphere, hair, headInner, [0, 2.62, -0.3], [1.28, 1.48, 0.91])
    const curls: Array<[number, number, number, number]> = [
      [-0.92, 3.2, -0.03, 0.38], [-0.62, 3.5, -0.08, 0.4], [-0.22, 3.64, -0.1, 0.41],
      [0.22, 3.64, -0.1, 0.41], [0.62, 3.5, -0.08, 0.4], [0.92, 3.2, -0.03, 0.38],
      [-1.05, 2.84, 0, 0.36], [1.05, 2.84, 0, 0.36], [-1.06, 2.5, 0.02, 0.32], [1.06, 2.5, 0.02, 0.32],
    ]
    curls.forEach(([x, y, z, size]) => addMesh(sphere, hair, headInner, [x, y, z], [size, size * 1.08, size * 0.82]))
  } else {
    // Short cropped hair: a cap over the crown and the back of the head, with a fringe.
    addMesh(sphere, hair, headInner, [0, 2.5, -0.12], [1.16, 1.32, 1.02])
    addMesh(sphere, hair, headInner, [0, 3.05, 0.42], [0.95, 0.42, 0.62])
  }

  if (look.headband) {
    const band = addMesh(new THREE.TorusGeometry(1.02, 0.045, 10, 48, Math.PI), material(0x67452c), headInner, [0, 3.38, 0.75], [1, 0.18, 1])
    band.rotation.z = Math.PI
  }
  if (look.crown) {
    // A laurel crown resting on the hair, leaves pointing back.
    const crown = group(headInner, [0, 3.12, 0.05])
    crown.rotation.x = -0.25
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      const m = addMesh(sphere, i % 2 ? leaf : leafLight, crown, [Math.cos(a) * 1.08, 0, Math.sin(a) * 0.98], [0.2, 0.06, 0.09])
      m.rotation.y = -a + (i % 2 ? 0.6 : -0.6)
    }
  }

  const eyeGeometry = new THREE.CircleGeometry(1, 28)
  const leftEye = addMesh(eyeGeometry, eyeMaterial, headInner, [-0.4, 2.48, 1.095], [0.105, 0.145, 1])
  const rightEye = addMesh(eyeGeometry, eyeMaterial, headInner, [0.4, 2.48, 1.095], [0.105, 0.145, 1])

  const browGeometry = new THREE.CapsuleGeometry(0.045, 0.38, 5, 12)
  const leftBrow = addMesh(browGeometry, dark, headInner, [-0.4, 2.78, 1.04], [1, 1, 0.45])
  leftBrow.rotation.z = Math.PI / 2 - 0.15
  const rightBrow = addMesh(browGeometry, dark, headInner, [0.4, 2.78, 1.04], [1, 1, 0.45])
  rightBrow.rotation.z = Math.PI / 2 + 0.15

  const tube = (points: Array<[number, number, number]>, radius: number, meshMaterial: THREE.Material, parent: THREE.Object3D = headInner) =>
    addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 16, radius, 8), meshMaterial, parent, [0, 0, 0])
  tube([[-0.58, 2.58, 1.055], [-0.42, 2.66, 1.09], [-0.25, 2.57, 1.06]], 0.022, dark)
  tube([[0.25, 2.57, 1.06], [0.42, 2.66, 1.09], [0.58, 2.58, 1.055]], 0.022, dark)
  tube([[0.035, 2.48, 1.075], [0.01, 2.27, 1.115], [-0.08, 2.03, 1.12], [0.055, 1.98, 1.115]], 0.024, dark)

  const mouthRig = group(headInner, [0, 1.73, 1.08])
  const mouthOpening = addMesh(new THREE.CapsuleGeometry(0.065, 0.18, 8, 20), mouthDark, mouthRig, [0, 0, 0], [1, 1, 0.35])
  mouthOpening.rotation.z = Math.PI / 2

  const jaw = group(headInner, [0, 1.55, 0.88])
  // Click target: covers the mouth, moustache and beard; invisible but still hit by raycasts.
  const mouthHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), new THREE.MeshBasicMaterial({ visible: false }))
  mouthHitbox.position.set(0, 1.62, 1.02)
  mouthHitbox.scale.set(1.15, 0.85, 0.55)
  headInner.add(mouthHitbox)
  if (look.beard === 'full') {
    tube([[0, 1.86, 1.105], [-0.18, 1.91, 1.105], [-0.38, 1.81, 1.06]], 0.09, hair)
    tube([[0, 1.86, 1.105], [0.18, 1.91, 1.105], [0.38, 1.81, 1.06]], 0.09, hair)
    const beardCurls: Array<[number, number, number, number]> = [
      [-0.6, -0.08, 0.06, 0.33], [-0.4, -0.4, 0.08, 0.35], [-0.14, -0.58, 0.1, 0.38],
      [0.14, -0.58, 0.1, 0.38], [0.4, -0.4, 0.08, 0.35], [0.6, -0.08, 0.06, 0.33],
    ]
    beardCurls.forEach(([x, y, z, size]) => addMesh(sphere, hair, jaw, [x, y, z], [size, size * 1.16, size * 0.72]))
  } else {
    // Clean-shaven: a chin, so the jaw still moves when he speaks.
    addMesh(sphere, skinLight, jaw, [0, -0.15, 0.02], [0.42, 0.26, 0.24])
  }

  // A soft contact shadow under the feet, for standalone canvases with nothing to cast onto.
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 64
  const shadowPaint = shadowCanvas.getContext('2d')!
  const shadowGradient = shadowPaint.createRadialGradient(32, 32, 0, 32, 32, 32)
  shadowGradient.addColorStop(0, 'rgba(20, 40, 50, 0.75)')
  shadowGradient.addColorStop(0.5, 'rgba(20, 40, 50, 0.35)')
  shadowGradient.addColorStop(1, 'rgba(20, 40, 50, 0)')
  shadowPaint.fillStyle = shadowGradient
  shadowPaint.fillRect(0, 0, 64, 64)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  )
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.set(0, -FEET + 0.01, 0.05)
  contactShadow.renderOrder = -1
  body.add(contactShadow)

  // The judge's throne: marble, gold trim. It rises into place when he sits.
  const throne = group(body, [0, -FEET, 0])
  const seatTop = HIPS_Y - THIGH - 0.13 + FEET
  addMesh(new THREE.BoxGeometry(1.8, seatTop, 1.2), marble, throne, [0, seatTop / 2, 0.22])
  addMesh(new THREE.BoxGeometry(1.95, 0.1, 1.3), gold, throne, [0, seatTop + 0.02, 0.22])
  addMesh(new THREE.BoxGeometry(1.8, 2.3, 0.28), marble, throne, [0, seatTop + 1.15, -0.5])
  addMesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 16), marbleShade, throne, [-0.95, seatTop + 1.0, -0.5])
  addMesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 16), marbleShade, throne, [0.95, seatTop + 1.0, -0.5])
  addMesh(sphere, gold, throne, [-0.95, seatTop + 2.35, -0.5], [0.22, 0.22, 0.22])
  addMesh(sphere, gold, throne, [0.95, seatTop + 2.35, -0.5], [0.22, 0.22, 0.22])
  throne.scale.setScalar(0.001)
  throne.visible = false

  // The laurel wreath he holds up for the champion: a ring of leaves.
  const wreath = group(torso, [0, 1.05, 1.3])
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2
    const m = addMesh(sphere, i % 2 ? leaf : leafLight, wreath, [Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0], [0.15, 0.07, 0.06])
    m.rotation.z = a + Math.PI / 2 + (i % 2 ? 0.5 : -0.5)
  }
  addMesh(sphere, gold, wreath, [0, -0.58, 0.04], [0.09, 0.09, 0.06])
  wreath.scale.setScalar(0.001)
  wreath.visible = false

  const pose: Pose = { ...REST }
  const target: Pose = { ...REST }
  const keys = Object.keys(REST) as Array<keyof Pose>

  const update = ({ time, dt, speaking, action, age, look: pointer, motion }: RigInput) => {
    // Target = rest, then the action's pose, then live overlays.
    Object.assign(target, REST, POSES[action])
    if (action === 'welcome') {
      // A wave every few seconds; between waves the arm comes back down.
      const waving = age < 3 || age % 5 < 1.8
      if (!waving) Object.assign(target, { rShoulderZ: REST.rShoulderZ, rShoulderX: 0, rElbowX: REST.rElbowX, lShoulderZ: REST.lShoulderZ, lElbowX: REST.lElbowX })
      else target.rElbowX = -0.35 + Math.sin(time * 9) * 0.45 * motion
    }
    if (speaking) {
      // Talking with his hands: whichever arm is free gestures with the speech.
      const g = (0.5 + 0.5 * Math.sin(time * 2.6)) * motion
      const h = (0.5 + 0.5 * Math.sin(time * 2.1 + 1.7)) * motion
      if (action === 'idle' || action === 'listen' || (action === 'welcome' && target.rShoulderZ < 1)) {
        target.rShoulderX += -0.45 * g
        target.rShoulderZ += 0.2 * g
        target.rElbowX += -0.75 * g
        target.lShoulderX += -0.35 * h
        target.lShoulderZ -= 0.15 * h
        target.lElbowX += -0.6 * h
      } else if (action === 'judge' || action === 'verdict') {
        target.lShoulderX += -0.45 * h
        target.lShoulderZ -= 0.3 * h
        target.lElbowX += -0.5 * h
      } else if (action === 'sing') {
        target.lShoulderZ -= 0.25 * g
        target.rShoulderZ += 0.25 * h
      }
      target.torsoZ += Math.sin(time * 1.3) * 0.03 * motion
      target.headX += Math.sin(time * 3.1) * 0.03 * motion
    }
    if (action === 'cheer') target.lShoulderZ -= Math.sin(time * 8) * 0.15 * motion
    if (action === 'laurel') {
      const lift = Math.max(0, Math.sin(time * 1.8)) * 0.18 * motion
      target.lShoulderX -= lift
      target.rShoulderX -= lift
    }
    if (action === 'sing') target.torsoZ += Math.sin(time * 1.6) * 0.06 * motion

    const k = 1 - Math.exp(-dt * (action === 'welcome' ? 9 : 6))
    for (const key of keys) pose[key] += (target[key] - pose[key]) * k

    // Apply the pose.
    hips.position.y = HIPS_Y - pose.sit * THIGH
    body.rotation.y = pose.yaw
    // Seated and turned, the throne's back sticks out to his right: shift him so it stays in frame.
    body.position.x = pose.sit * 0.22 * (scale / 0.46)
    torso.rotation.set(pose.torsoX, 0, pose.torsoZ)
    headPivot.rotation.set(pose.headX + pointer.y * 0.08, pointer.x * 0.22, pose.headZ)
    left.shoulder.rotation.set(pose.lShoulderX, pose.lShoulderY, pose.lShoulderZ)
    left.elbow.rotation.set(pose.lElbowX, 0, 0)
    right.shoulder.rotation.set(pose.rShoulderX, pose.rShoulderY, pose.rShoulderZ)
    right.elbow.rotation.set(pose.rElbowX, 0, 0)
    legs.forEach(({ hip, knee }) => {
      hip.rotation.x = pose.hipX
      knee.rotation.x = pose.kneeX
    })
    const throneScale = THREE.MathUtils.smoothstep(pose.sit, 0.05, 0.6)
    // Seated, the throne's base widens the shadow.
    contactShadow.scale.set(2.6 + throneScale * 0.9, 1.7 + throneScale * 0.6, 1)
    throne.visible = throneScale > 0.01
    throne.scale.setScalar(Math.max(0.001, throneScale))
    wreath.visible = pose.wreath > 0.02
    wreath.scale.setScalar(Math.max(0.001, pose.wreath))
    wreath.rotation.z = Math.sin(time * 1.5) * 0.05
    // Offered up to the champion: a slow lift and settle.
    wreath.position.y = 1.05 + Math.max(0, Math.sin(time * 1.8)) * 0.12 * motion

    // Breathing, the mouth, blinking.
    const voice = speaking ? 0.48 + Math.sin(time * 12.4) * 0.22 + Math.sin(time * 19.1) * 0.12 : 0
    jaw.position.y = 1.55 - voice * 0.055
    jaw.rotation.x = voice * 0.035
    mouthRig.scale.y = 0.55 + voice * 0.55
    const breath = Math.sin(time * 1.8) * motion
    body.position.y = restY + (breath * 0.018 + (action === 'cheer' ? Math.abs(Math.sin(time * 5)) * 0.08 * motion : 0)) * (scale / 0.46)
    torso.scale.set(1 + breath * 0.008, 1 + breath * 0.012, 1 + breath * 0.008)

    const blinkCycle = time % 4.8
    const blink = blinkCycle > 4.58 ? Math.max(0.06, Math.abs(blinkCycle - 4.69) * 9) : 1
    leftEye.scale.y = 0.145 * blink
    rightEye.scale.y = 0.145 * blink
  }

  return { root, mouthHitbox, update, settling: () => keys.some((k) => Math.abs(pose[k] - target[k]) > 0.002) }
}
