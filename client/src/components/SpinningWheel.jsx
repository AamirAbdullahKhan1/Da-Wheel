import { useRef, useEffect, useCallback } from 'react';

const SEGMENT_COLORS = [
    '#1a1044', '#20144f', '#16103d', '#1e1247',
    '#130e38', '#221558', '#190f40', '#1c1148',
    '#14103a', '#241762',
];

const SEGMENT_BORDER = 'rgba(108, 99, 255, 0.6)';

function drawWheel(ctx, canvas, rotation, allThemes = [], fullThemes = []) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 10;
    const numSegments = allThemes.length || 1;
    const degPerSegment = 360 / numSegments;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSegments; i++) {
        const startAngle = (rotation + i * degPerSegment) * (Math.PI / 180);
        const endAngle = (rotation + (i + 1) * degPerSegment) * (Math.PI / 180);
        const midAngle = (startAngle + endAngle) / 2;
        const theme = allThemes[i];
        const isFull = theme ? fullThemes.includes(theme) : false;

        // Segment fill — grayed out if full
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = isFull ? '#111118' : SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        ctx.fill();

        // Segment border
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = isFull ? 'rgba(255,255,255,0.06)' : SEGMENT_BORDER;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Outer glow arc
        if (!isFull) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.strokeStyle = 'rgba(108, 99, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Text
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);
        ctx.textAlign = 'right';

        const words = theme ? theme.split(' ') : [''];
        const textRadius = radius * 0.78;
        const fontSize = radius < 150 ? 9 : 11;

        if (isFull) {
            // Strikethrough style for full themes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = `500 ${fontSize}px Inter, sans-serif`;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        }

        if (words.length === 1) {
            ctx.fillText(words[0], textRadius, fontSize / 3);
        } else if (words.length === 2) {
            ctx.fillText(words[0], textRadius, -fontSize * 0.6);
            ctx.fillText(words[1], textRadius, fontSize * 0.8);
        } else {
            const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
            ctx.fillText(line1, textRadius, -fontSize * 0.6);
            ctx.fillText(line2, textRadius, fontSize * 0.8);
        }

        // Draw strikethrough line for full themes
        if (isFull) {
            const textWidth = ctx.measureText(
                words.length === 1 ? words[0] : words.slice(0, Math.ceil(words.length / 2)).join(' ')
            ).width;
            ctx.beginPath();
            ctx.moveTo(textRadius - textWidth, 0);
            ctx.lineTo(textRadius, 0);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    // Center circle
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.18);
    grad.addColorStop(0, '#8b84ff');
    grad.addColorStop(1, '#6C63FF');
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
}

// allThemes: full ordered list from DB; availableThemes: subset not yet full
export default function SpinningWheel({ disabled, onSpinComplete, allThemes = [], availableThemes = [] }) {
    const canvasRef = useRef(null);
    const rotationRef = useRef(0);
    const animRef = useRef(null);
    const isSpinningRef = useRef(false);
    // Derive fullThemes from the difference
    const fullThemes = allThemes.filter(t => !availableThemes.includes(t));
    const degPerSegment = allThemes.length ? 360 / allThemes.length : 36;

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawWheel(ctx, canvas, rotationRef.current, allThemes, fullThemes);
    }, [allThemes.join(','), fullThemes.join(',')]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const size = Math.min(canvas.parentElement?.clientWidth || 400, 420);
        canvas.width = size;
        canvas.height = size;
        draw();
    }, [draw]);

    useEffect(() => {
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, []);

    function spin() {
        if (isSpinningRef.current || disabled) return;
        if (availableThemes.length === 0 || allThemes.length === 0) return;
        isSpinningRef.current = true;

        // Pick from AVAILABLE themes only (not full)
        const targetTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
        const targetIndex = allThemes.indexOf(targetTheme);

        // Align pointer (right, 0°) to mid of target segment
        const targetMid = targetIndex * degPerSegment + degPerSegment / 2;
        const extraSpins = 5 + Math.floor(Math.random() * 5);
        const targetRotation = rotationRef.current + (extraSpins * 360) + (360 - targetMid - rotationRef.current % 360);

        const start = performance.now();
        const duration = 5000 + Math.random() * 2000;
        const startRotation = rotationRef.current;
        const totalDelta = targetRotation - startRotation;

        function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

        function animate(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            rotationRef.current = startRotation + totalDelta * easeOut(progress);
            draw();
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                isSpinningRef.current = false;
                rotationRef.current = rotationRef.current % 360;
                onSpinComplete(targetTheme);
            }
        }

        animRef.current = requestAnimationFrame(animate);
    }

    return (
        <div className="wheel-canvas-wrapper">
            <canvas
                ref={canvasRef}
                className="wheel-canvas"
                id="spin-canvas"
                onClick={!disabled ? spin : undefined}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
            />
            <div className="wheel-pointer">▶</div>
        </div>
    );
}
