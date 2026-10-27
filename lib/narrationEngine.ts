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
  private customTtsEndpoint: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isSequencePlaying = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('night_has_come_custom_tts');
      if (stored) {
        this.customTtsEndpoint = stored;
      }
    }
  }

  public setCustomTtsEndpoint(endpoint: string | null) {
    this.customTtsEndpoint = endpoint;
    if (typeof window !== 'undefined') {
      if (endpoint) {
        localStorage.setItem('night_has_come_custom_tts', endpoint);
      } else {
        localStorage.removeItem('night_has_come_custom_tts');
      }
    }
  }

  public getCustomTtsEndpoint(): string | null {
    return this.customTtsEndpoint;
  }

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

  public async speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !text) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    // 1. PRIMARY: Original TTS endpoint /api/tts with Joey voice (ttsmp3)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Joey' }),
      });

      if (res.ok) {
        const data = await res.json();
        const src = data.audioUrl || (data.audio?.startsWith('data:') ? data.audio : data.audio ? `data:audio/mpeg;base64,${data.audio}` : null);
        if (src) {
          const audio = new Audio(src);
          this.currentAudio = audio;
          let finished = false;

          const finish = () => {
            if (!finished) {
              finished = true;
              if (onEnd) onEnd();
            }
          };

          audio.onended = finish;
          audio.onerror = () => {
            this.speakFallback(text, onEnd);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Audio playback waiting for user gesture or blocked, falling back:', err);
              this.speakFallback(text, onEnd);
            });
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Primary /api/tts endpoint call failed, using fallback:', err);
    }

    // 2. Fallback to Web Speech API or timeout
    this.speakFallback(text, onEnd);
  }

  private speakFallback(text: string, onEnd?: () => void) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Joey') ||
              v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('David') ||
              v.name.includes('Daniel') ||
              v.name.includes('Male'))
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        let finished = false;
        const finish = () => {
          if (!finished) {
            finished = true;
            if (onEnd) onEnd();
          }
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        const estimatedDurationMs = Math.max(2000, (text.split(' ').length / 2.5) * 1000 + 1200);
        setTimeout(finish, estimatedDurationMs);

        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('Speech synthesis error in fallback:', e);
      }
    }

    if (onEnd) setTimeout(onEnd, 3000);
  }

  public stop() {
    this.isSequencePlaying = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
        setTimeout(playNext, 600);
      });
    };

    playNext();
  }

  /**
   * Full Game Start Rules & Warning Narration Sequence (Post 30s Warmup)
   */
  public getGameStartRulesSequence(): AnnouncementStep[] {
    return [
      {
        id: 'start',
        title: 'GAME OFFICIALLY STARTED',
        subtitle: 'The 60-second warmup is over. The retreat center lockdown has commenced!',
        text: 'The 60-second warmup is finished. The game has officially started!',
      },
      {
        id: 'warning',
        title: '⚠️ CRITICAL WARNING',
        subtitle: 'Everyone must follow the rules, otherwise you will face instant execution!',
        text: 'Attention all guests! Everyone must follow the rules, otherwise you will be immediately eliminated and face instant execution!',
      },
      {
        id: 'objective',
        title: 'RULE 1: OBJECTIVE',
        subtitle: 'Citizens must vote out all Mafia. Mafia must eliminate Citizens to gain control.',
        text: 'Rule 1: Citizens must work together to find and vote out every Mafia member. The Mafia wins if they eliminate the Citizens.',
      },
      {
        id: 'roles',
        title: 'RULE 2: SPECIAL ROLES',
        subtitle: 'Mafia strikes at night. Doctor shields from death. Police investigates true identities.',
        text: 'Rule 2: Each night, the Mafia secretly strikes. The Doctor can shield and heal one person. The Police investigates suspects in secret.',
      },
      {
        id: 'cycle',
        title: 'RULE 3: DAILY CYCLE & VOTING',
        subtitle: 'Night Curfew, Morning Casualty Report, Discussion, and Voting before Curfew.',
        text: 'Rule 3: During discussion, share clues and cross-examine alibis. During voting, everyone votes on who to eliminate. The player with the most votes is executed!',
      },
      {
        id: 'ready',
        title: 'PREPARE YOURSELVES: GAME HAS BEGUN',
        subtitle: 'Be ready! Enter your quarters, keep doors locked, and prepare for night curfew.',
        text: 'Be ready! The game has officially begun! Prepare for night curfew, head to your quarters, and stay on guard.',
      },
    ];
  }

  /**
   * Instructions for EVERYONE during each phase
   */
  public getGeneralInstruction(phase: string, dayNumber = 1): { title: string; subtitle: string; voice: string } {
    switch (phase) {
      case 'Warmup':
        return {
          title: 'PRE-GAME WARMUP (60 SECONDS)',
          subtitle: 'All required players have joined! The game will start in 60 seconds. Late entry is closed.',
          voice: 'All required players have joined. The game will be starting in 60 seconds, and no further players will be accepted after the match has begun.',
        };
      case 'Night':
        return {
          title: `NIGHT ${dayNumber}: CURFEW HAS FALLEN`,
          subtitle: 'Lights are out. Return to your rooms, keep doors locked, and await the morning light.',
          voice: 'Night curfew is in effect. All citizens, remain indoors. Special roles, deploy your actions in secret.',
        };
      case 'Morning':
        return {
          title: `DAY ${dayNumber}: MORNING ROLL CALL`,
          subtitle: 'The siren sounds. Check the casualties and see who survived the night.',
          voice: 'Morning has broken. The sirens sound. Review the casualties to see who survived the night.',
        };
      case 'Discussion':
        return {
          title: `DAY ${dayNumber}: OPEN INVESTIGATION & DISCUSSION`,
          subtitle: 'Interrogate suspects, verify alibis, and share clues. Trust no one blindly.',
          voice: 'Discussion time has begun. Share your alibis, question suspicious behavior, and find the killers.',
        };
      case 'Voting':
        return {
          title: `DAY ${dayNumber}: CURFEW VOTING IN SESSION`,
          subtitle: 'Cast your vote before the timer expires. The student with the most votes will be executed.',
          voice: 'Voting is now open. Cast your vote on who you suspect the most. Every vote counts.',
        };
      case 'Execution':
        return {
          title: `DAY ${dayNumber}: EXECUTION OF THE CONDEMNED`,
          subtitle: 'The votes have been sealed. The condemned student faces instant execution.',
          voice: 'The votes have been finalized. The condemned student is sentenced to execution.',
        };
      case 'GameEnd':
        return {
          title: 'SIMULATION TERMINATED',
          subtitle: 'The retreat center night has reached its final conclusion.',
          voice: 'The retreat center simulation has concluded. The survivors have been decided.',
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
   * Role-specific instructions for the current player during each phase.
   * STRICT ANTI-SPOIL GUARANTEE: Never includes usernames, only role guidance!
   */
  public getRoleInstruction(role: string | null | undefined, phase: string): string {
    const userRole = role || 'Citizen';

    switch (userRole) {
      case 'Mafia':
        switch (phase) {
          case 'Warmup':
            return 'Mafia Directive: Memorize room layouts and locate isolated chambers for tonight.';
          case 'Night':
            return 'Mafia Directive: Move through the shadows and eliminate your target victim.';
          case 'Morning':
            return 'Mafia Directive: Observe how survivors react to the casualty. Feign surprise.';
          case 'Discussion':
            return 'Mafia Directive: Blend in with the Citizens. Fabricate alibis and misdirect suspicion.';
          case 'Voting':
            return 'Mafia Directive: Vote together with the crowd or frame an innocent target to secure survival.';
          case 'Execution':
            return 'Mafia Directive: One less threat in Yooil Manor. Prepare for the next curfew.';
          default:
            return 'Mafia Directive: Eliminate citizens until the mafia outnumbers them.';
        }

      case 'Doctor':
        switch (phase) {
          case 'Warmup':
            return 'Doctor Directive: Take note of trustworthy guests you may need to shield.';
          case 'Night':
            return 'Doctor Directive: Deploy medical aid! Choose one player to protect from the Mafia tonight.';
          case 'Morning':
            return 'Doctor Directive: Confirm whether your protected patient survived the night.';
          case 'Discussion':
            return 'Doctor Directive: Keep your medical identity discreet so the Mafia does not target you.';
          case 'Voting':
            return 'Doctor Directive: Cast your vote against suspects to keep innocent survivors alive.';
          case 'Execution':
            return 'Doctor Directive: A student was sentenced. Analyze the remaining survivor count.';
          default:
            return 'Doctor Directive: Protect key players each night to keep Citizens alive.';
        }

      case 'Police':
      case 'Detective':
        switch (phase) {
          case 'Warmup':
            return 'Police Directive: Watch player movements and identify suspicious pairs.';
          case 'Night':
            return 'Police Directive: Conduct secret investigation! Inspect a suspect to reveal their true role.';
          case 'Morning':
            return 'Police Directive: Review your investigation results from last night.';
          case 'Discussion':
            return 'Police Directive: Guide citizens toward suspects without prematurely exposing your badge.';
          case 'Voting':
            return 'Police Directive: Use verified intelligence to lead the vote against confirmed culprits.';
          case 'Execution':
            return 'Police Directive: Justice has been carried out. Keep searching for remaining Mafia.';
          default:
            return 'Police Directive: Investigate suspects each night to unmask the Mafia.';
        }

      case 'Citizen':
      default:
        switch (phase) {
          case 'Warmup':
            return 'Citizen Directive: Explore the manor, build rapport, and note where guests gather.';
          case 'Night':
            return 'Citizen Directive: Keep your chamber door locked and remain alert. Listen for footsteps.';
          case 'Morning':
            return 'Citizen Directive: Check the casualty report and observe who looks guilty.';
          case 'Discussion':
            return 'Citizen Directive: Cross-examine alibis, question strange movements, and deduce clues.';
          case 'Voting':
            return 'Citizen Directive: Vote for the most suspicious player. Eliminate all Mafia to win!';
          case 'Execution':
            return 'Citizen Directive: Observe the execution. Did the manor eliminate an innocent or a killer?';
          default:
            return 'Citizen Directive: Work together with innocent survivors to find and eliminate all Mafia.';
        }
    }
  }

  /**
   * Final Game End announcement:
   * Announce winner team and loser team, and EXPLICITLY CONGRATULATE WINNERS BY SAYING THEIR USERNAMES!
   * Strictly congratulates ONLY those players who were in this game session.
   */
  public narrateGameEnd(
    winnerTeam: 'Citizens' | 'Mafia',
    winningPlayers: { username: string }[],
    _losingPlayers: { username: string }[],
    onEnd?: () => void
  ) {
    const winnerNames = winningPlayers.map((p) => p.username).filter(Boolean);
    let winnerNamesText = 'the surviving champions';

    if (winnerNames.length === 1) {
      winnerNamesText = winnerNames[0];
    } else if (winnerNames.length === 2) {
      winnerNamesText = `${winnerNames[0]} and ${winnerNames[1]}`;
    } else if (winnerNames.length > 2) {
      winnerNamesText = `${winnerNames.slice(0, -1).join(', ')}, and ${winnerNames[winnerNames.length - 1]}`;
    }

    const speech =
      winnerTeam === 'Citizens'
        ? `Game Over! The Citizens have won the game! All Mafia members have been successfully eliminated! Congratulations to our victorious winners: ${winnerNamesText}! You have survived Yooil Manor and outsmarted the darkness!`
        : `Game Over! The Mafia has won the game! The Citizens were unable to survive the night! Congratulations to our victorious winners: ${winnerNamesText}! You have conquered the retreat center!`;

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
