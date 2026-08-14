import React, { useEffect, useRef } from 'react';

export function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particles (representing data packets and bio-luminescent water ions)
    const particleCount = 45;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: -Math.random() * 0.8 - 0.2, // Drift upwards like bubbles/data
        alpha: Math.random() * 0.6 + 0.2,
        color: Math.random() > 0.4 ? '#00E5FF' : '#10B981'
      });
    }

    // Sensor Nodes (interactive floating monitoring points)
    const sensorNodes = [
      { x: 0.18, y: 0.45, label: 'NODE_001 [pH/TDS]', pulse: 0, status: 'HIGH', color: '#EF4444' },
      { x: 0.52, y: 0.32, label: 'AI_ISOLATION_FOREST', pulse: 1.5, status: 'ACTIVE', color: '#00E5FF' },
      { x: 0.82, y: 0.55, label: 'NODE_002 [Turbidity]', pulse: 3.0, status: 'STABLE', color: '#10B981' },
      { x: 0.35, y: 0.72, label: 'COMMUNITY_FEED', pulse: 4.2, status: 'NORMAL', color: '#F59E0B' },
      { x: 0.68, y: 0.78, label: 'WEATHER_CACHE', pulse: 2.1, status: 'SYNCED', color: '#38BDF8' }
    ];

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle background wave gradients
      const waveGradient = ctx.createLinearGradient(0, height - 120, 0, height);
      waveGradient.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
      waveGradient.addColorStop(1, 'rgba(0, 229, 255, 0.08)');

      ctx.fillStyle = waveGradient;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const y = height - 70 + Math.sin(x * 0.006 + time) * 20 + Math.cos(x * 0.01 + time * 1.5) * 12;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Second overlay wave in emerald
      ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 25) {
        const y = height - 50 + Math.sin(x * 0.008 - time * 0.8) * 18;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 2. Draw connecting data lines between sensor nodes
      const actualNodes = sensorNodes.map(n => ({
        ...n,
        currentX: n.x * width,
        currentY: n.y * height + Math.sin(time + n.pulse) * 8
      }));

      // Connect each node with animated cyber streams
      for (let i = 0; i < actualNodes.length; i++) {
        for (let j = i + 1; j < actualNodes.length; j++) {
          const n1 = actualNodes[i];
          const n2 = actualNodes[j];

          const lineGradient = ctx.createLinearGradient(n1.currentX, n1.currentY, n2.currentX, n2.currentY);
          lineGradient.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
          lineGradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
          lineGradient.addColorStop(1, 'rgba(16, 185, 129, 0.25)');

          ctx.strokeStyle = lineGradient;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 6]);
          ctx.lineDashOffset = -time * 15;

          ctx.beginPath();
          ctx.moveTo(n1.currentX, n1.currentY);
          ctx.lineTo(n2.currentX, n2.currentY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 3. Draw sensor nodes with glowing radar pulses
      actualNodes.forEach(node => {
        const pulseSize = (Math.sin(time * 2 + node.pulse) + 1) * 8 + 6;

        // Outer radar pulse ring
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(node.currentX, node.currentY, pulseSize + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Node core
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(node.currentX, node.currentY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Small tech label
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(node.label, node.currentX + 12, node.currentY + 4);
      });

      // 4. Update and draw upward drifting particles (data packets)
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.85
      }}
    />
  );
}
