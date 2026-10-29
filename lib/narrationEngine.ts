type NarrationListener = (payload: {
  title: string;
  message: string;
  phase?: string;
  roleDirective?: string;
  isAnnouncement?: boolean;
}) => void;

export interface AnnouncementStep {
  id: string;
  title: string;
  text: string;
  subtitle: string;
}

class NarrationEngine {
  private listeners: Set<NarrationListener> = new Set();
  private currentAudio: HTMLAudioElement | null = null;
  private isSequencePlaying = false;
  private lastSpokenText: string | null = null;
  private lastSpokenTime: number = 0;

  public subscribe(listener: NarrationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcastAnnouncement(title: string, message: string, phase?: string, roleDirective?: string) {
    this.listeners.forEach((fn) =>
      fn({ title, message, phase, roleDirective, isAnnouncement: true })
    );
    this.speak(message);
  }

  /**
   * Speak speech with zero echo, zero overlap, and bulletproof audio fallback
   */
  public async speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !text) {
      if (onEnd) onEnd();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      if (onEnd) onEnd();
      return;
    }

    const now = Date.now();
    // Prevent identical text from echoing or playing twice simultaneously within 1.5 seconds
    if (this.lastSpokenText === trimmed && now - this.lastSpokenTime < 1500) {
      if (onEnd) setTimeout(onEnd, 800);
      return;
    }

    this.lastSpokenText = trimmed;
    this.lastSpokenTime = now;

    // Immediately stop any currently playing narration audio and cancel browser speech
    this.stop();

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        this.currentAudio = null;
        if (onEnd) onEnd();
      }
    };

    // Client-side Browser SpeechSynthesis Fallback Function
    const fallbackToSpeechSynthesis = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(trimmed);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.lang = 'en-US';

          // Try to select an English voice
          const voices = window.speechSynthesis.getVoices();
          const enVoice = voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Google') && v.name.includes('Natural')) ||
            voices.find((v) => v.lang.startsWith('en'));
          if (enVoice) {
            utterance.voice = enVoice;
          }

          utterance.onend = () => finish();
          utterance.onerror = () => finish();

          window.speechSynthesis.speak(utterance);
          return;
        } catch (_) {
          finish();
        }
      } else {
        finish();
      }
    };

    // 1. Attempt Primary Voice API endpoint
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, voice: 'Joey' }),
      });

      if (res.ok) {
        const data = await res.json();
        const src =
          data.audioUrl ||
          (data.audio?.startsWith('data:')
            ? data.audio
            : data.audio
            ? `data:audio/mpeg;base64,${data.audio}`
            : null);

        if (src) {
          const audio = new Audio(src);
          this.currentAudio = audio;

          audio.onended = finish;
          audio.onerror = () => {
            console.warn('Audio tag playback error, attempting browser speech synthesis');
            fallbackToSpeechSynthesis();
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((playErr) => {
              console.warn('Autoplay prevented or audio blocked:', playErr);
              fallbackToSpeechSynthesis();
            });
          }
          return;
        }
      }
    } catch (err) {
      console.warn('/api/tts fetch error:', err);
    }

    // 2. If endpoint fails, use Browser Speech Synthesis
    fallbackToSpeechSynthesis();
  }

  public stop() {
    this.isSequencePlaying = false;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  /**
   * Speak a sequential series of announcement steps.
   */
  public speakSequence(
    steps: AnnouncementStep[],
    onStepChange?: (index: number) => void,
    onComplete?: () => void
  ) {
    this.stop();
    this.isSequencePlaying = true;
    let currentIndex = 0;

    const playNext = () => {
      if (!this.isSequencePlaying) return;
      if (currentIndex >= steps.length) {
        this.isSequencePlaying = false;
        if (onComplete) onComplete();
        return;
      }

      const currentStep = steps[currentIndex];
      if (onStepChange) onStepChange(currentIndex);

      this.listeners.forEach((fn) =>
        fn({
          title: currentStep.title,
          message: currentStep.subtitle,
          isAnnouncement: true,
        })
      );

      this.speak(currentStep.text, () => {
        if (!this.isSequencePlaying) return;
        currentIndex++;
        setTimeout(playNext, 500);
      });
    };

    playNext();
  }

  /**
   * Full Game Start Rules & Warning Narration Sequence (Simple English, direct and clear)
   */
  public getGameStartRulesSequence(): AnnouncementStep[] {
    return [
      {
        id: 'start',
        title: 'GAME OFFICIALLY STARTED',
        subtitle: 'The 60-second warmup has ended. The game has officially started!',
        text: 'The 60-second warmup is over. The game has officially started!',
      },
      {
        id: 'warning',
        title: '⚠️ CRITICAL WARNING',
        subtitle: 'Everyone must follow the rules, otherwise you will face instant execution!',
        text: 'Everyone must follow the rules, otherwise you will face instant execution!',
      },
      {
        id: 'objective',
        title: 'RULE 1: OBJECTIVE',
        subtitle: 'Citizens must vote out all Mafia. Mafia must eliminate Citizens to gain control.',
        text: 'Rule 1: Objective. Citizens must work together to find and vote out every Mafia member. Mafia wins if they eliminate Citizens.',
      },
      {
        id: 'roles',
        title: 'RULE 2: SPECIAL ROLES',
        subtitle: 'Mafia strikes secretly at night. Doctor shields from death. Police investigates true identities.',
        text: 'Rule 2: Special Roles. Each night, the Mafia secretly attacks. The Doctor can shield and protect one person. The Police investigates suspects to uncover their true identity.',
      },
      {
        id: 'cycle',
        title: 'RULE 3: DAILY ROUND CYCLE & VOTING',
        subtitle: 'Night Curfew, Morning Roll Call, Open Discussion, and Curfew Voting.',
        text: 'Rule 3: Daily Round Cycle. Talk and share clues during discussion. During voting, vote for who to eliminate. The player with the highest votes is executed!',
      },
      {
        id: 'ready',
        title: 'BE READY: GAME HAS BEGUN',
        subtitle: 'Go to your room immediately, keep doors locked, and prepare for night curfew!',
        text: 'Be ready! The game has begun! Go to your room, lock your door, and prepare for night!',
      },
    ];
  }

  /**
   * Instructions for EVERYONE during each phase (Clear, simple English)
   */
  public getGeneralInstruction(phase: string, dayNumber = 1): { title: string; subtitle: string; voice: string } {
    switch (phase) {
      case 'Warmup':
        return {
          title: 'PRE-GAME WARMUP (60 SECONDS)',
          subtitle: 'All required players have joined! The game will start in 60 seconds.',
          voice: 'All required players have joined! The game will start in 60 seconds. No new players can join once the game begins.',
        };
      case 'Night':
        return {
          title: `NIGHT ${dayNumber}: CURFEW HAS FALLEN`,
          subtitle: 'Lights are out. Return to your rooms, keep doors locked, and await morning.',
          voice: 'Night has fallen. Go inside your room and lock your door. Special roles, choose your target now.',
        };
      case 'Morning':
        return {
          title: `DAY ${dayNumber}: MORNING ROLL CALL`,
          subtitle: 'The siren sounds. Check the casualties and see who survived the night.',
          voice: 'Morning has come. The sirens are sounding. Check who survived the night.',
        };
      case 'Discussion':
        return {
          title: `DAY ${dayNumber}: OPEN INVESTIGATION & DISCUSSION`,
          subtitle: 'Talk with everyone, question suspicious alibis, and find the killers.',
          voice: 'Discussion time has begun. Talk with everyone and find the Mafia.',
        };
      case 'Voting':
        return {
          title: `DAY ${dayNumber}: CURFEW VOTING IN SESSION`,
          subtitle: 'Cast your vote before time runs out. The player with the most votes will be executed.',
          voice: 'Voting is now open. Cast your vote for the most suspicious player.',
        };
      case 'Execution':
        return {
          title: `DAY ${dayNumber}: EXECUTION OF THE CONDEMNED`,
          subtitle: 'The votes have been sealed. The condemned student faces instant execution.',
          voice: 'The votes are in. The player with the most votes has been executed.',
        };
      case 'GameEnd':
        return {
          title: 'SIMULATION CONCLUDED',
          subtitle: 'The retreat center night has reached its final conclusion.',
          voice: 'The game has ended. The survivors have been decided.',
        };
      default:
        return {
          title: 'YOOIL RETREAT CENTER',
          subtitle: 'Follow the rules. Do not cross the perimeter boundary.',
          voice: 'Follow all retreat center instructions.',
        };
    }
  }

  /**
   * Role-specific instructions for the current player during each phase (Simple English)
   */
  public getRoleInstruction(role: string | null | undefined, phase: string): string {
    const userRole = role || 'Citizen';

    switch (userRole) {
      case 'Mafia':
        switch (phase) {
          case 'Warmup':
            return 'Mafia: Memorize the room layouts and find quiet corners for tonight.';
          case 'Night':
            return 'Mafia: Move secretly in the dark and choose your victim.';
          case 'Morning':
            return 'Mafia: See how survivors react to the death. Act innocent.';
          case 'Discussion':
            return 'Mafia: Blend in with the Citizens. Give fake alibis and misdirect suspicion.';
          case 'Voting':
            return 'Mafia: Vote with the crowd or vote out an innocent player to stay safe.';
          case 'Execution':
            return 'Mafia: One less threat in the manor. Prepare for the next night.';
          default:
            return 'Mafia: Eliminate Citizens until you outnumber them.';
        }

      case 'Doctor':
        switch (phase) {
          case 'Warmup':
            return 'Doctor: Notice players who seem trustworthy so you can protect them.';
          case 'Night':
            return 'Doctor: Choose one player to shield and protect from the Mafia tonight.';
          case 'Morning':
            return 'Doctor: Check if the player you protected survived the night.';
          case 'Discussion':
            return 'Doctor: Keep your role secret so the Mafia does not target you.';
          case 'Voting':
            return 'Doctor: Vote out suspects to keep innocent players alive.';
          case 'Execution':
            return 'Doctor: A player was eliminated. Count the remaining survivors.';
          default:
            return 'Doctor: Protect players each night to keep Citizens alive.';
        }

      case 'Police':
      case 'Detective':
        switch (phase) {
          case 'Warmup':
            return 'Police: Watch player movements and notice suspicious behavior.';
          case 'Night':
            return 'Police: Check one suspect secretly tonight to learn their true identity.';
          case 'Morning':
            return 'Police: Review your secret investigation result from last night.';
          case 'Discussion':
            return 'Police: Lead Citizens toward the Mafia without revealing your role too early.';
          case 'Voting':
            return 'Police: Vote against suspects you know are Mafia.';
          case 'Execution':
            return 'Police: Justice was served. Keep searching for the remaining Mafia.';
          default:
            return 'Police: Investigate suspects each night to unmask the Mafia.';
        }

      case 'Citizen':
      default:
        switch (phase) {
          case 'Warmup':
            return 'Citizen: Walk around the manor and get to know the other players.';
          case 'Night':
            return 'Citizen: Keep your room door locked and listen carefully for footsteps.';
          case 'Morning':
            return 'Citizen: Check the morning death report and see who looks guilty.';
          case 'Discussion':
            return 'Citizen: Ask questions, check alibis, and find clues together.';
          case 'Voting':
            return 'Citizen: Vote for the most suspicious player. Eliminate all Mafia to win!';
          case 'Execution':
            return 'Citizen: Watch the execution. Did the group eliminate an innocent or a Mafia?';
          default:
            return 'Citizen: Work with innocent players to find and eliminate all Mafia.';
        }
    }
  }

  /**
   * Final Game End announcement in clear simple English
   */
  public narrateGameEnd(
    winnerTeam: 'Citizens' | 'Mafia',
    winningPlayers: { username: string }[],
    _losingPlayers: { username: string }[],
    onEnd?: () => void
  ) {
    const winnerNames = winningPlayers.map((p) => p.username).filter(Boolean);
    let winnerNamesText = 'the surviving players';

    if (winnerNames.length === 1) {
      winnerNamesText = winnerNames[0];
    } else if (winnerNames.length === 2) {
      winnerNamesText = `${winnerNames[0]} and ${winnerNames[1]}`;
    } else if (winnerNames.length > 2) {
      winnerNamesText = `${winnerNames.slice(0, -1).join(', ')}, and ${winnerNames[winnerNames.length - 1]}`;
    }

    const speech =
      winnerTeam === 'Citizens'
        ? `Game over! The Citizens have won! All Mafia members are eliminated! Congratulations to our winners: ${winnerNamesText}! You survived Yooil Manor!`
        : `Game over! The Mafia has won! All Citizens have been defeated! Congratulations to our winners: ${winnerNamesText}! You took control of Yooil Manor!`;

    this.speak(speech, onEnd);
  }

  public narrateRulesExplanation() {
    const sequence = this.getGameStartRulesSequence();
    this.speakSequence(sequence);
  }

  public getPhaseNarration(phase: string, dayNumber = 1): { title: string; subtitle: string } {
    const info = this.getGeneralInstruction(phase, dayNumber);
    return { title: info.title, subtitle: info.subtitle };
  }
}

export const narrationEngine = new NarrationEngine();
