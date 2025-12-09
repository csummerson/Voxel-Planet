export class GameLoop {
  constructor() {
    this.callbacks = [];
    this.running = false;
  }

  onUpdate(callback) {
    this.callbacks.push(callback);
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.loop();
    }
  }

  stop() {
    this.running = false;
  }

  loop() {
    if (!this.running) return;

    this.callbacks.forEach(callback => callback());

    requestAnimationFrame(() => this.loop());
  }
}