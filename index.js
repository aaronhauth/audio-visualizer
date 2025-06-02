const { fromEvent, animationFrames, defer } = rxjs;
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

// Draw function (pure)
function drawBars(dataArray, bufferLength) {

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / BYTE_FREQUENCY_MAX) * canvas.height;
        const r = barHeight + 25;
        const g = 250 * (i / bufferLength);
        const b = 100;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

// Set up everything
resize$.pipe(
    switchMap(() => createAnalyserStream()),
    switchMap(({ analyser, dataArray, bufferLength }) =>
        animationFrames().pipe(
            tap(() => {
                analyser.getByteFrequencyData(dataArray);
                drawBars(dataArray, bufferLength);
            })
        )
    )
).subscribe({
    error: err => {
        alert("Microphone access failed or not supported.");
        console.error(err);
    }
});