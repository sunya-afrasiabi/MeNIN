import { useCallback, useEffect, useRef, useState } from 'react'
import ArenaPanel from './Arena'
import Homer3D, { type HomerAction } from './Homer3D'
import { resolveAction } from './poets/rig'
import World3D from './world/World3D'
import JoinCard from './JoinCard'
import Landing from './Landing'
import { FIELD_EVENTS } from './lib/arena'
import { hasTestFlight, joinCodeFromPath, TESTFLIGHT_URL } from './lib/links'
import MusicToggle from './MusicToggle'
import { useMusic } from './music'
import { reciteIliad, type IliadLine, type Recital } from './poets/iliad'


type HomerMode = 'bard' | 'judge' | 'battle'

const modes: Array<{
  id: HomerMode
  label: string
  description: string
  response: string
}> = [
  // Bard is off the website for now (Matus: "it keeps saying do some app???"); it lives in the phone app's lessons.
  {
    id: 'battle',
    label: 'Host a battle',
    description: 'This screen is the arena. Phones join with the app',
    response: 'Open the hall. I’ll call the poets in.',
  },
]

function AegeanScene() {
  return (
    <svg className="scene-landscape" viewBox="0 0 1000 1000" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f96ea" />
          <stop offset=".55" stopColor="#72c2f1" />
          <stop offset="1" stopColor="#b9e5f7" />
        </linearGradient>
        <radialGradient id="sunWash" cx="78%" cy="10%" r="65%">
          <stop offset="0" stopColor="#fff8cc" stopOpacity=".72" />
          <stop offset=".28" stopColor="#fff8d8" stopOpacity=".18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ca1e7" />
          <stop offset=".5" stopColor="#178bd6" />
          <stop offset="1" stopColor="#086dbb" />
        </linearGradient>
        <linearGradient id="mountain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#82b5df" />
          <stop offset="1" stopColor="#4a8fc9" />
        </linearGradient>
        <linearGradient id="cliff" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4dfb5" />
          <stop offset=".52" stopColor="#d2b77f" />
          <stop offset="1" stopColor="#ad9568" />
        </linearGradient>
        <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#91bd76" />
          <stop offset="1" stopColor="#4f8a5d" />
        </linearGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1d0" />
          <stop offset=".5" stopColor="#e3cda3" />
          <stop offset="1" stopColor="#bfa67b" />
        </linearGradient>
        <linearGradient id="column" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c6ad80" />
          <stop offset=".35" stopColor="#fff0cb" />
          <stop offset=".72" stopColor="#e3cba0" />
          <stop offset="1" stopColor="#af9469" />
        </linearGradient>
        <filter id="sceneSoft"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="sceneShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#35617b" floodOpacity=".22" />
        </filter>
      </defs>

      <rect width="1000" height="560" fill="url(#sky)" />
      <rect width="1000" height="560" fill="url(#sunWash)" />
      <circle cx="795" cy="96" r="55" fill="#fff7cf" opacity=".35" filter="url(#sceneSoft)" />

      <g opacity=".62" filter="url(#sceneSoft)">
        <path d="M575 556 700 434l53 55 75-93 172 160Z" fill="url(#mountain)" />
        <path d="m700 556 112-90 49 44 75-70 64 69v47Z" fill="#6ea9d5" />
      </g>

      <rect y="530" width="1000" height="270" fill="url(#sea)" />
      <path d="M0 535c160 8 326-8 488 0s328-8 512 0" fill="none" stroke="#d9f5ff" strokeWidth="5" opacity=".55" />
      {[570, 610, 655, 710].map((y, index) => (
        <path key={y} d={`M${430 + index * 24} ${y}c120-12 280 12 430 0`} fill="none" stroke="#bcecff" strokeWidth={3 - index * .35} opacity={.34 - index * .04} />
      ))}

      <g filter="url(#sceneShadow)">
        <path d="M-30 555V350L92 268l166 31 116 103 47 153Z" fill="url(#cliff)" />
        <path d="M-20 555V432l127-53 164 35 103 141Z" fill="#8aa770" />
        <path d="M-20 512 89 462l133 17 101 76H-20Z" fill="url(#green)" />
        <path d="M0 422c69-32 132-36 190-13 66 26 128 19 187-8v63c-81 31-151 31-214 8-57-21-111-14-163 18Z" fill="#79a568" />
      </g>

      <g transform="translate(36 211)" filter="url(#sceneShadow)">
        <path d="m0 55 107-48 111 48Z" fill="#f8e8c3" />
        <path d="M12 55h195v18H12Z" fill="url(#stone)" />
        <rect x="24" y="73" width="172" height="96" fill="#d8c092" />
        {[37, 68, 99, 130, 161].map((x) => (
          <g key={x}>
            <rect x={x} y="77" width="18" height="92" rx="7" fill="url(#column)" />
            <rect x={x - 5} y="72" width="28" height="10" rx="3" fill="#f2dfb7" />
            <rect x={x - 4} y="164" width="26" height="9" rx="2" fill="#c7aa78" />
          </g>
        ))}
        <path d="M2 169h216v18H2Z" fill="url(#stone)" />
        <path d="M-12 187h240v20H-12Z" fill="#c8ae7e" />
      </g>

      {[278, 320, 361, 401].map((x, index) => (
        <path key={x} d={`M${x} 502h${12 + index * 2}l-3-139h-7Z`} fill="#34765d" opacity=".94" />
      ))}
      {[45, 101, 173, 240, 323].map((x, index) => (
        <g key={x}>
          <ellipse cx={x} cy={470 + (index % 2) * 30} rx={24 + (index % 3) * 5} ry={29 + (index % 2) * 5} fill="#4f8b62" />
          <ellipse cx={x - 7} cy={462 + (index % 2) * 30} rx="10" ry="12" fill="#77ac74" opacity=".75" />
        </g>
      ))}

      <g transform="translate(825 545)" filter="url(#sceneShadow)">
        <path d="M0 38h95L78 53H18Z" fill="#795438" />
        <path d="M48-68v109" stroke="#8b6848" strokeWidth="5" />
        <path d="m53-58 37 67H53Z" fill="#fff4d7" />
        <path d="m43-43-27 51h27Z" fill="#f7dca8" />
      </g>

      <rect y="738" width="1000" height="262" fill="url(#stone)" />
      <path d="M0 802h1000M0 878h1000M160 738 66 1000M398 738l-35 262M647 738l54 262M830 738l119 262" stroke="#ae946b" strokeWidth="3" opacity=".38" />
      <rect y="696" width="1000" height="48" fill="url(#stone)" filter="url(#sceneShadow)" />
      <rect y="688" width="1000" height="13" fill="#fff1d2" />
      <rect x="934" width="66" height="1000" fill="url(#column)" filter="url(#sceneShadow)" />
      <rect x="922" width="16" height="1000" fill="#ead4aa" />
    </svg>
  )
}

/** What Homer does on the arena, from the room's phase: he waves poets in, sits on his throne to
 *  listen and judge, points as the verdict lands, sings the finale and presents the laurel. */
function homerActionFor(phase: string | null, event: string | null): HomerAction {
  const field = event !== null && FIELD_EVENTS.includes(event)
  switch (phase) {
    case 'dealing':
    case 'ready':
      return 'listen'
    case 'speaking':
      return field ? 'cheer' : 'judge'
    case 'judging':
      return field ? 'idle' : 'judge'
    case 'scored':
      return field ? 'cheer' : 'verdict'
    case 'round_end':
      return 'idle'
    case 'finale':
      return field ? 'cheer' : 'sing'
    case 'finished':
      return 'laurel'
    default:
      return 'welcome' // no room yet, or the lobby
  }
}

function ModePage({
  mode,
  onBack,
}: {
  mode: HomerMode
  onBack: () => void
}) {
  const info = modes.find((item) => item.id === mode)!
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hallStatus, setHallStatus] = useState('') // the arena's plain-words wait ("Homer is dealing…")
  const [homerAction, setHomerAction] = useState<HomerAction>('welcome')
  const onPhase = useCallback((phase: string | null, event: string | null) => setHomerAction(homerActionFor(phase, event)), [])
  const [answer, setAnswer] = useState<string | null>(null)
  const [heard, setHeard] = useState(false)
  const [coachLine, setCoachLine] = useState(
    mode === 'bard'
      ? 'Say it out loud. Hit the capitals.'
      : 'Open the hall, and the poets come to me.',
  )

  const speak = (line: string) => {
    setCoachLine(line)
    setIsSpeaking(true)
    window.setTimeout(() => setIsSpeaking(false), 2200)
  }

  const bardContent = (
    <>
      <div className="workspace-heading">
        <span>Lesson 1 of 6</span>
        <h2>The four-beat line</h2>
        <p>Say it out loud. How many hits?</p>
      </div>
      <div className="meter-demo drill-line" aria-label="Four-beat drill">
        <strong>WINE</strong>
        <span>-dark</span>
        <strong>SEA</strong>
        <span className="break">/</span>
        <span>took my</span>
        <strong>BROTH</strong>
        <span>-er’s</span>
        <strong>SHIP</strong>
      </div>
      <div className="choice-grid">
        {['Three', 'Four', 'Five'].map((choice) => (
          <button
            key={choice}
            className={answer === choice ? 'active' : ''}
            onClick={() => setAnswer(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
      <button
        className="primary-action"
        disabled={!answer}
        onClick={() => {
          if (answer === 'Four') {
            speak('Four hits. A breath in the middle. That’s the line I sang the Iliad in.')
            setHeard(true)
          } else {
            speak('Say it louder. Count the capitals.')
          }
        }}
      >
        Check answer
      </button>
      {heard && (
        <p className="wired-note">
          Lessons 2 to 6 use your voice, over the beat. They’re in the app.{' '}
          {hasTestFlight() && (
            <a className="testflight" href={TESTFLIGHT_URL} target="_blank" rel="noreferrer">
              Get it on TestFlight
            </a>
          )}
        </p>
      )}
    </>
  )

  const battleContent = <ArenaPanel onLine={setCoachLine} onSpeaking={setIsSpeaking} onStatus={setHallStatus} onPhase={onPhase} />

  return (
    <main className={`mode-screen ${mode}`}>
      {/* The arena's live sea covers this from the lobby on, so it stays the light SVG (no third WebGL canvas). */}
      <div className="mode-scene" aria-hidden="true"><AegeanScene /></div>
      <header className="mode-topbar">
        <button className="mode-back" onClick={onBack}>‹ Main menu</button>
        <div><span>MeNIN</span><strong>{info.label}</strong></div>
        <MusicToggle hush={mode === 'bard'} />
      </header>
      <div className="mode-layout">
        <aside className="coach-stage" data-waiting={hallStatus ? 'true' : undefined}>
          <Homer3D speaking={isSpeaking} mode={mode} action={mode === 'battle' ? homerAction : undefined} />
          <div className="coach-dialogue">
            <span>Homer</span>
            <p>{coachLine}</p>
            {hallStatus && <small className="hall-status">{hallStatus}</small>}
          </div>
        </aside>
        <section className="workspace">
          {mode === 'bard' ? bardContent : battleContent}
        </section>
      </div>
    </main>
  )
}

// The landing page (the Poets' Hall) lives at /, each poet's hall at /<poet>. The server serves
// index.html for unknown paths, so a reload on /homer stays in Homer's hall.
const onPoetPath = () => window.location.pathname.replace(/\/+$/, '') === '/homer'

export default function App() {
  const [inHall, setInHall] = useState(onPoetPath)
  useEffect(() => {
    const sync = () => setInHall(onPoetPath())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const goTo = (path: string) => {
    window.history.pushState(null, '', path)
    setInHall(onPoetPath())
  }

  const joinCode = joinCodeFromPath(window.location.pathname)
  if (!joinCode && !inHall) return <Landing onChoose={(poet) => goTo(`/${poet}`)} />
  return <HomerHall joinCode={joinCode} onBack={() => goTo('/')} />
}

function HomerHall({ joinCode, onBack }: { joinCode: string | null; onBack: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<HomerMode | null>(null)
  const [activeMode, setActiveMode] = useState<HomerMode | null>(null)
  const selected = modes.find((mode) => mode.id === selectedMode)
  const onlyMode = modes.length === 1 ? modes[0] : null

  // Easter egg: click Homer's mouth and he recites the Iliad's first seven lines in Greek.
  const [recital, setRecital] = useState<{ line: IliadLine; index: number } | null>(null)
  const [reciting, setReciting] = useState(false) // his voice (or the silent fallback) is going
  const recitalRef = useRef<Recital | null>(null)
  const startRecital = useCallback(() => {
    if (recitalRef.current) return // already reciting
    const run = reciteIliad(
      (line, index) => setRecital(line ? { line, index } : null),
      (speaking) => setReciting(speaking),
    )
    recitalRef.current = run
    void run.done.finally(() => {
      recitalRef.current = null
    })
  }, [])
  useEffect(() => () => recitalRef.current?.stop(), [])
  useEffect(() => {
    if (activeMode) recitalRef.current?.stop() // leaving for the arena ends the recital
  }, [activeMode])
  useMusic({ duck: recital !== null })

  const fullMessage =
    recital?.line.greek ??
    selected?.response ??
    'I’m Homer. I made the Iliad up out loud. Your turn.'
  const [spokenMessage, setSpokenMessage] = useState('')

  useEffect(() => {
    setSpokenMessage('')
    let character = 0
    const timer = window.setInterval(() => {
      character += 1
      setSpokenMessage(fullMessage.slice(0, character))
      if (character >= fullMessage.length) window.clearInterval(timer)
    }, 28)

    return () => window.clearInterval(timer)
  }, [fullMessage])

  const isSpeaking = spokenMessage.length < fullMessage.length || reciting

  if (joinCode) {
    return (
      <main className="scene">
        <div className="animated-background" aria-hidden="true">
          <World3D fallback={<div className="scene-artboard"><AegeanScene /></div>} />
        </div>
        <header className="nameplate" aria-label="Homer">
          <span>Homer</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </header>
        <section className="dialogue join-dialogue" aria-label={`Join room ${joinCode}`}>
          <JoinCard code={joinCode} />
        </section>
      </main>
    )
  }

  if (activeMode) {
    return <ModePage mode={activeMode} onBack={() => setActiveMode(null)} />
  }

  return (
    <main className="scene">
      <div className="animated-background" aria-hidden="true">
        {/* Homer stands inside the world, on the plaza: one camera, one light, real shadows. */}
        <World3D
          speaking={isSpeaking}
          homerAction={recital ? 'sing' : resolveAction(selectedMode)}
          onHomerMouth={startRecital}
          fallback={<div className="scene-artboard"><AegeanScene /></div>}
        />
      </div>

      <MusicToggle className="floating" />
      <button className="back-to-poets" type="button" onClick={onBack}>‹ All poets</button>

      <header className="nameplate" aria-label="Homer">
        <span>Homer</span>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
      </header>

      <section className={`dialogue${onlyMode ? ' single-path' : ''}`} aria-labelledby="dialogue-title">
        <div className="dialogue-copy">
          <p className="welcome">{recital ? `Iliad 1.${recital.index + 1}` : selected ? selected.label : 'Homer speaks'}</p>
          <h1 id="dialogue-title" lang={recital ? 'grc' : undefined} className={recital ? 'greek-line' : undefined}>
            {spokenMessage}<span className="typing-cursor" />
          </h1>
        </div>

        {/* One path: a direct button, no dropdown. The dropdown comes back once there are more. */}
        {onlyMode ? (
          <div className="mode-select">
            <button className="select-trigger single" type="button" onClick={() => setActiveMode(onlyMode.id)}>
              <span>
                <small>Your path</small>
                <strong>{onlyMode.label}</strong>
              </span>
              <span className="path-go" aria-hidden="true">›</span>
            </button>
          </div>
        ) : (
          <div className="mode-select">
            <button
              className="select-trigger"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((open) => !open)}
            >
              <span>
                <small>Choose your path</small>
                <strong>{selected?.label ?? 'Select a mode'}</strong>
              </span>
              <span className={`select-arrow ${isOpen ? 'open' : ''}`} aria-hidden="true" />
            </button>

            {isOpen && (
              <div className="dropdown" role="listbox" aria-label="Homer mode">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    className={selectedMode === mode.id ? 'selected' : ''}
                    type="button"
                    role="option"
                    aria-selected={selectedMode === mode.id}
                    onClick={() => {
                      setSelectedMode(mode.id)
                      setIsOpen(false)
                    }}
                  >
                    <span className="option-mark" aria-hidden="true" />
                    <span>
                      <strong>{mode.label}</strong>
                      <small>{mode.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* The A button confirms a dropdown pick; with one path the path button is the action. */}
        {!onlyMode && (
          <button
            className="continue-button"
            type="button"
            aria-label={selected ? `Continue to ${selected.label}` : 'Select a mode'}
            onClick={() => (selected ? setActiveMode(selected.id) : setIsOpen(true))}
          >
            A
          </button>
        )}
      </section>
    </main>
  )
}
