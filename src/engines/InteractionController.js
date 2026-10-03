/**
 * InteractionController
 * Subtle, non-intrusive pointer interaction and future device motion hooks.
 * 90% reduced sensitivity to maintain calm ambient peace.
 */
export class InteractionController {
  constructor(canvas, liquidEngine) {
    this.canvas = canvas;
    this.liquidEngine = liquidEngine;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this.motionData = {
      tiltX: 0,
      tiltY: 0,
      shakeImpulse: 0,
    };

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);

    this.attach();
  }

  attach() {
    this.canvas.addEventListener('pointerdown', this.boundPointerDown, { passive: true });
    window.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    window.addEventListener('pointerup', this.boundPointerUp, { passive: true });
  }

  detach() {
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
  }

  onPointerDown(e) {
    this.isDragging = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.lastX = x;
    this.lastY = y;

    // Very gentle click ripple (90% reduced from previous version)
    const normX = x / this.liquidEngine.width;
    this.liquidEngine.splash(normX, 0.5, 3);
  }

  onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.lastX = x;
    this.lastY = y;

    const speed = Math.sqrt(dx * dx + dy * dy);
    // Only reacts to deliberate swift strokes, imparting a tiny whisper
    if (speed > 16) {
      const normX = x / this.liquidEngine.width;
      this.liquidEngine.splash(normX, Math.min(0.25, speed * 0.006), 2);
    }
  }

  onPointerUp() {
    this.isDragging = false;
  }

  setTilt(tiltX, tiltY) {
    this.motionData.tiltX = tiltX;
    this.motionData.tiltY = tiltY;
    this.liquidEngine.applyMotion(this.motionData);
  }

  triggerShake(strength = 0.5) {
    this.motionData.shakeImpulse = strength;
    this.liquidEngine.applyMotion(this.motionData);
    setTimeout(() => {
      this.motionData.shakeImpulse = 0;
      this.liquidEngine.applyMotion(this.motionData);
    }, 300);
  }
}
