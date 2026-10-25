// The hall's easter egg: click Homer's mouth and he recites the opening of the Iliad (1.1-7) in
// Ancient Greek. The voice is the arena's (HomerVoice, Cartesia), which is trained on English, so
// each line is sent as a respelling of the restored ancient pronunciation, lowercase and hyphenated
// (as the SPEC does for mēnin: "may-nin"; capitals get spelled out). The captions show the Greek.

import { HomerVoice } from '../lib/voice'

export type IliadLine = { greek: string; spoken: string }

export const ILIAD_OPENING: IliadLine[] = [
  { greek: 'μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος', spoken: 'may-nin ah-ay-deh, theh-ah, pay-lay-yah-deh-oh ah-khee-lay-oss,' },
  { greek: 'οὐλομένην, ἣ μυρί᾽ Ἀχαιοῖς ἄλγε᾽ ἔθηκε,', spoken: 'oo-lo-meh-nayn, hay moo-ree ah-khai-oys al-geh eh-thay-keh,' },
  { greek: 'πολλὰς δ᾽ ἰφθίμους ψυχὰς Ἄϊδι προΐαψεν', spoken: 'pol-las dif-thee-moos psoo-khas ah-ee-dee pro-ee-ap-sen' },
  { greek: 'ἡρώων, αὐτοὺς δὲ ἑλώρια τεῦχε κύνεσσιν', spoken: 'hay-roh-ohn, ow-toos deh heh-loh-ree-ah tyoo-kheh koo-nes-sin' },
  { greek: 'οἰωνοῖσί τε πᾶσι, Διὸς δ᾽ ἐτελείετο βουλή,', spoken: 'oy-oh-noy-see teh pah-see, dee-oss deh-teh-lay-eh-toh boo-lay,' },
  { greek: 'ἐξ οὗ δὴ τὰ πρῶτα διαστήτην ἐρίσαντε', spoken: 'ex oo day tah proh-tah dee-as-tay-tayn eh-ree-san-teh' },
  { greek: 'Ἀτρεΐδης τε ἄναξ ἀνδρῶν καὶ δῖος Ἀχιλλεύς.', spoken: 'ah-treh-ee-days teh ah-nax an-drohn kai dee-oss ah-khil-lyoos.' },
]

/** How long a line stays up when the voice can't be reached (captions only). */
const SILENT_LINE_MS = 4200

export type Recital = { stop: () => void; done: Promise<void> }

/**
 * Recite the seven lines. `onLine` gets each line as it starts (and null at the end); `onVoice`
 * says whether audio is actually playing. Call from a click, so the browser lets audio start.
 */
export function reciteIliad(onLine: (line: IliadLine | null, index: number) => void, onVoice: (speaking: boolean) => void): Recital {
  let stopped = false
  let ctx: AudioContext | null = null
  let voice: HomerVoice | null = null
  try {
    ctx = new AudioContext()
    voice = new HomerVoice(ctx)
  } catch {
    voice = null
  }
  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const run = async () => {
    let silent = voice === null
    for (let i = 0; i < ILIAD_OPENING.length && !stopped; i++) {
      const line = ILIAD_OPENING[i]
      onLine(line, i)
      if (!silent && voice) {
        try {
          await voice.speak(line.spoken, () => onVoice(true))
          onVoice(false)
          await wait(250) // a breath between lines
          continue
        } catch (error) {
          if (stopped) break
          // No voice (agent unreachable, credits out): the rest is captions, his mouth still moving.
          console.warn('Iliad recital without voice:', error)
          silent = true
        }
      }
      onVoice(true)
      await wait(SILENT_LINE_MS)
      onVoice(false)
    }
    onVoice(false)
    onLine(null, ILIAD_OPENING.length)
    voice?.close()
    void ctx?.close()
  }

  const done = run()
  return {
    done,
    stop: () => {
      stopped = true
      voice?.hush()
    },
  }
}
