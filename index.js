const { fromEvent, animationFrames, defer, combineLatest } = rxjs;
const { map, tap, switchMap, startWith } = rxjs.operators;

const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

const BYTE_FREQUENCY_MAX = 255;

// Resize canvas reactively
const resize$ = fromEvent(window, "resize").pipe(
    startWith(null),
    tap(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    })
);

// Get audio stream and setup analyser node
function createAnalyserStream() {
    return defer(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return { analyser, dataArray, bufferLength };
    });
}

function createSmoothedArray(length) {
    return new Array(length).fill(0);
}

// Draw function (pure)
function drawBars(dataArray, bufferLength, smoothedArray, smoothingFactor = 0.15) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // Smooth each bar height
        const target = (dataArray[i] / BYTE_FREQUENCY_MAX) * canvas.height;
        smoothedArray[i] += (target - smoothedArray[i]) * smoothingFactor;

        const barHeight = smoothedArray[i];

        const r = dataArray[i] + 25;
        const g = 250 * (i / bufferLength);
        const b = 100;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

// Set up everything
combineLatest([createAnalyserStream(), resize$]).pipe(
    switchMap(([{ analyser, dataArray, bufferLength }]) => {
        const smoothedArray = createSmoothedArray(bufferLength);

        return animationFrames().pipe(
            tap(() => {
                analyser.getByteFrequencyData(dataArray);
                drawBars(dataArray, bufferLength, smoothedArray);
            })
        );
    })
).subscribe({
    error: err => {
        alert("Microphone access failed or not supported.");
        console.error(err);
    }
});