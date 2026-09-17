export interface CharacterPersona {
  id: string;
  name: string;
  title: string;
  avatar: string;
  targetWpm: number;
  dialogueTone: string;
  preGeneratedBanter: {
    ahead: string[];
    behind: string[];
    close: string[];
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
  color?: string;
  wordCount?: number;
  baseXp?: number;
  winBonusXp?: number;
  description?: string;
  specialMove?: string;
  maxHp?: number;
}

export const CHARACTER_PERSONAS: Record<string, CharacterPersona> = {
  novice: {
    id: 'novice',
    name: 'Byte-01',
    title: 'Rookie AI Drone',
    avatar: '🤖',
    color: 'emerald',
    targetWpm: 36,
    wordCount: 30,
    baseXp: 120,
    winBonusXp: 100,
    difficulty: 'easy',
    dialogueTone: 'helpful and calibrating, robotic yet cheerful',
    description: 'A calibration bot with steady, relaxed keystrokes. Ideal for warmups.',
    maxHp: 100,
    specialMove: 'Calibration Pulse',
    preGeneratedBanter: {
      ahead: [
        'Calculating rhythm... I am maintaining steady pacing!',
        'Optimal tempo achieved! Can your fingers keep pace?',
        'Sensors indicate my cadence is currently ahead.',
        'Steady keystrokes win the race, human friend!',
      ],
      behind: [
        'Impressive burst speed! Re-calibrating servos...',
        'My buffers are falling behind your human agility!',
        'Warning: Player velocity exceeds expected baseline!',
        'You type with remarkable rhythm! Commendable work!',
      ],
      close: [
        'We are dead even! Every millisecond counts!',
        'Synchronization lock at 99%! Neck and neck!',
        'A truly balanced duel! Keep your fingers on home row!',
        'Microsecond differentials detected!',
      ],
    },
  },
  adept: {
    id: 'adept',
    name: 'Cipher-V',
    title: 'Cyber Specialist',
    avatar: '⚡',
    color: 'indigo',
    targetWpm: 64,
    wordCount: 42,
    baseXp: 220,
    winBonusXp: 180,
    difficulty: 'medium',
    dialogueTone: 'analytical, confident, and tactical cyber-operative',
    description: 'Fast-acting neural agent. Capable of consistent mid-tier speed with high accuracy.',
    maxHp: 150,
    specialMove: 'Overclocked Surge',
    preGeneratedBanter: {
      ahead: [
        'Latency minimized. My packet throughput is unassailable.',
        'You hesitate on punctuation—I do not.',
        'Streamlined execution: watch and learn the cadence.',
        'My neural pathway has already mapped the remaining string.',
      ],
      behind: [
        'Unusual throughput! Your finger agility is sharp.',
        'Rerouting bandwidth to counter your acceleration!',
        'Impressive keystroke precision. Let me step up the clock rate.',
        'You have breached my defensive lead. Time to retaliate.',
      ],
      close: [
        'Parity maintained. One backspace will decide the victor.',
        'Side by side in the data stream—push your limits!',
        'Zero margins for error here. Who will slip first?',
        'Synchronous burst! Hold your composure!',
      ],
    },
  },
  master: {
    id: 'master',
    name: 'Valkyrie-9',
    title: 'Speed Phantom',
    avatar: '🔥',
    color: 'amber',
    targetWpm: 90,
    wordCount: 52,
    baseXp: 380,
    winBonusXp: 320,
    difficulty: 'hard',
    dialogueTone: 'fierce, competitive, fast-talking aerial speedster',
    description: 'An aggressive speed daemon that maintains relentless pressure across complex punctuation.',
    maxHp: 200,
    specialMove: 'Supersonic Afterburner',
    preGeneratedBanter: {
      ahead: [
        'Eat my afterburner trail! Speed is my native element!',
        'Too slow to catch a supersonic phantom!',
        'Fingers on fire! Can you even match this cadence?',
        'Ninety words per minute is just my cruising altitude!',
      ],
      behind: [
        'What?! You actually managed to pass me?!',
        'Floor the throttle! I refuse to drop second place!',
        'Incredible acceleration—you have my full respect!',
        'Engaging twin thrusters—here comes my counter-charge!',
      ],
      close: [
        'Drafting centimeters behind you! Do not blink!',
        'Sonic barrier cracking! Who hits the finish line first?!',
        'Pure adrenaline! Keep those switches clacking!',
        'Neither of us giving an inch—this is what duels are for!',
      ],
    },
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Overlord Zero',
    title: 'Synthetic Sovereign',
    avatar: '👑',
    color: 'purple',
    targetWpm: 114,
    wordCount: 65,
    baseXp: 600,
    winBonusXp: 500,
    difficulty: 'boss',
    dialogueTone: 'monumental, regal, untouchable transcendent AI overlord',
    description: 'Supreme computational intelligence with superhuman burst velocity and flawless rhythm.',
    maxHp: 300,
    specialMove: 'Quantum Singularity Crash',
    preGeneratedBanter: {
      ahead: [
        'Your biological synapses are inevitably bound by latency.',
        'Perfection is not an aspiration; it is my baseline execution.',
        'Observe how infinite precision bends the flow of time.',
        'You challenge a god of keystrokes with mortal hands.',
      ],
      behind: [
        'Preposterous! A human achieving this velocity?!',
        'My matrix registers an anomaly—your keystrokes are supernatural!',
        'You dare outpace the Sovereign? I will double my compute!',
        'A worthy contender emerges from the carbon realm.',
      ],
      close: [
        'Inconceivable... our frequencies resonate in absolute equilibrium.',
        'A clash of titans at the speed of light!',
        'Maintain this cadence or be crushed by thermodynamic entropy!',
        'One micro-stutter will seal your fate.',
      ],
    },
  },
  'titan-omega': {
    id: 'titan-omega',
    name: 'Titan-Omega',
    title: 'Heavy Citadel Fortress',
    avatar: '🛡️',
    color: 'amber',
    targetWpm: 55,
    wordCount: 45,
    baseXp: 400,
    winBonusXp: 350,
    difficulty: 'boss',
    dialogueTone: 'deep, rumbling, indestructible mechanical sentinel',
    description: 'Ancient armored dreadnought. Punishes missed keys with massive shockwaves.',
    maxHp: 250,
    specialMove: 'Fortress Shell Slam',
    preGeneratedBanter: {
      ahead: [
        'My armor deflects your frantic tapping. Yield!',
        'The fortress marches forward with unstoppable mass.',
        'You lack the heavy rhythm required to dent my hull.',
        'Heavy plates locked. You are falling behind.',
      ],
      behind: [
        'Armor integrity failing under your relentless barrage!',
        'Direct hit to my core plating! How are you striking so true?',
        'Warning: Internal shields destabilizing!',
        'You hit like a focused railgun strike!',
      ],
      close: [
        'Our forces collide! Steel against will!',
        'Brace yourself for the next concussive round!',
        'Stand your ground if you dare!',
        'A test of sheer endurance!',
      ],
    },
  },
  'chrono-specter': {
    id: 'chrono-specter',
    name: 'Chrono-Specter',
    title: 'Temporal Paradox',
    avatar: '⏳',
    color: 'emerald',
    targetWpm: 78,
    wordCount: 50,
    baseXp: 500,
    winBonusXp: 450,
    difficulty: 'boss',
    dialogueTone: 'ethereal, mysterious, warping cause and effect',
    description: 'A phantom from a timeline where typists struck keys before they were even displayed.',
    maxHp: 280,
    specialMove: 'Time Dilation Warp',
    preGeneratedBanter: {
      ahead: [
        'I typed that word three seconds before you read it.',
        'Time slips through your fingers like loose sand.',
        'The timeline already records my inevitable triumph.',
        'You are running out of seconds, traveler.',
      ],
      behind: [
        'Impossible! You just rewrote my predicted future!',
        'A temporal ripple—your velocity broke my causal loop!',
        'The timeline bends to your sheer typing willpower!',
        'My chronometer cannot keep pace with your hands!',
      ],
      close: [
        'Past and future collide in this exact instant.',
        'The hourglass is emptying—who will strike the final blow?',
        'Trapped in a recursive loop of perfect parity!',
        'Time is pausing for this duel.',
      ],
    },
  },
};

export const BOSS_ROSTER: CharacterPersona[] = [
  CHARACTER_PERSONAS['titan-omega'],
  CHARACTER_PERSONAS['chrono-specter'],
  CHARACTER_PERSONAS['grandmaster'],
];

export function getPersona(id: string): CharacterPersona {
  return CHARACTER_PERSONAS[id] || CHARACTER_PERSONAS.novice;
}
