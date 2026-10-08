/**
 * InteractionController
 * Subtle, non-intrusive pointer interaction and device motion hooks
 * for the minimal ambient music environment.
 */
export class InteractionController {
  constructor(canvas, ambientField) {
    this.canvas = canvas;
    this.ambientField = ambientField;

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

    // Gentle particle dispersion on click
    const normX = Math.max(0, Math.min(1, x / (this.ambientField.width || 1)));
    const normY = Math.max(0, Math.min(1, y / (this.ambientField.height || 1)));
    this.ambientField.disturb(normX, normY, 18.0);
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
    // Subtle ambient wake trailing behind pointer
    if (speed > 8) {
      const normX = Math.max(0, Math.min(1, x / (this.ambientField.width || 1)));
      const normY = Math.max(0, Math.min(1, y / (this.ambientField.height || 1)));
      this.ambientField.disturb(normX, normY, Math.min(10.0, speed * 0.35));
    }
  }

  onPointerUp() {
    this.isDragging = false;
  }

  setTilt(tiltX, tiltY) {
    this.motionData.tiltX = tiltX;
    this.motionData.tiltY = tiltY;
    this.ambientField.applyMotion(this.motionData);
  }

  triggerShake(strength = 0.5) {
    this.motionData.shakeImpulse = strength;
    this.ambientField.applyMotion(this.motionData);
    setTimeout(() => {
      this.motionData.shakeImpulse = 0;
      this.ambientField.applyMotion(this.motionData);
    }, 300);
  }
}
