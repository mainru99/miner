export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const initAudio = () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const sounds = {
    start: () => {
        try {
            const now = audioCtx.currentTime;
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.setValueAtTime(0.3, now);
            masterGain.gain.linearRampToValueAtTime(0, now + 1.5);

            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.linearRampToValueAtTime(2000, now + 1.0);

            osc.connect(filter);
            filter.connect(masterGain);
            osc.start(now);
            osc.stop(now + 1.5);
        } catch (e) { console.error(e); }
    },

    move: () => {
        try {
            const now = audioCtx.currentTime;
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.setValueAtTime(0.5, now);
            masterGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

            const bufferSize = audioCtx.sampleRate * 1.0;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.5;
            }

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, now);
            filter.frequency.linearRampToValueAtTime(50, now + 0.8);

            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(now);

            const sub = audioCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(60, now);
            sub.frequency.exponentialRampToValueAtTime(30, now + 0.8);

            const subGain = audioCtx.createGain();
            subGain.gain.setValueAtTime(0.3, now);
            subGain.gain.linearRampToValueAtTime(0, now + 0.8);

            sub.connect(subGain);
            subGain.connect(masterGain);
            sub.start(now);
            sub.stop(now + 1.0);
        } catch (e) { console.error(e); }
    },

    boom: () => {
        try {
            const now = audioCtx.currentTime;
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.setValueAtTime(1.0, now);
            masterGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

            const bufferSize = audioCtx.sampleRate * 2.0;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 1;
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(50, now + 1.5);

            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(now);
        } catch (e) { console.error(e); }
    },

    click: () => {
        try {
            const now = audioCtx.currentTime;
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);

            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) { console.error(e); }
    },

    win: () => {
        try {
            const now = audioCtx.currentTime;
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);

            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.1);

                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0, now + i * 0.1);
                gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 1.5);

                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 2.0);
            });
        } catch (e) { console.error(e); }
    }
};
