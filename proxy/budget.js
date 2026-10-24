'use strict';
const fs = require('node:fs');
const path = require('node:path');

function validDay(day) { const date = new Date(day); return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === day; }

// One writer per budget file. Corruption or write failure blocks model calls until repaired.
class BudgetStore {
  constructor(file, dailyLimit, hourlyLimit, now = () => new Date()) {
    this.file = file; this.dailyLimit = dailyLimit; this.hourlyLimit = hourlyLimit; this.now = now;
    this.state = { day: '', used: 0, callers: {} }; this.error = false;
    try { fs.accessSync(path.dirname(file), fs.constants.W_OK); } catch (_) { this.error = true; return; }
    try {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!saved || !validDay(saved.day) || !Number.isSafeInteger(saved.used) || saved.used < 0 || !saved.callers || Array.isArray(saved.callers) || typeof saved.callers !== 'object' || Object.values(saved.callers).some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('invalid budget');
      this.state = saved;
    } catch (e) { if (e.code !== 'ENOENT') this.error = true; }
  }
  roll() {
    const date = this.now().toISOString(), day = date.slice(0, 10), hour = date.slice(0, 13);
    if (this.state.day !== day) this.state = { day, used: 0, callers: {} };
    for (const key of Object.keys(this.state.callers)) if (!key.endsWith(':' + hour)) delete this.state.callers[key];
    return hour;
  }
  peek() {
    this.roll();
    return { day: this.state.day, used: this.state.used, limit: this.dailyLimit, remaining: this.error ? 0 : Math.max(0, this.dailyLimit - this.state.used), available: !this.error };
  }
  take(caller) {
    const hour = this.roll(), current = this.peek(), key = caller + ':' + hour;
    if (this.error) return { ...current, ok: false, reason: 'storage' };
    if (this.state.used >= this.dailyLimit) return { ...current, ok: false, reason: 'daily' };
    if ((this.state.callers[key] || 0) >= this.hourlyLimit) return { ...current, ok: false, reason: 'caller' };
    const next = { ...this.state, used: this.state.used + 1, callers: { ...this.state.callers, [key]: (this.state.callers[key] || 0) + 1 } };
    let fd;
    try {
      fd = fs.openSync(this.file + '.tmp', 'w', 0o600);
      fs.writeFileSync(fd, JSON.stringify(next)); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
      fs.renameSync(this.file + '.tmp', this.file);
      this.state = next;
    } catch (e) {
      if (fd !== undefined) { try { fs.closeSync(fd); } catch (_) {} }
      this.error = true;
      return { ...this.peek(), ok: false, reason: 'storage' };
    }
    return { ...this.peek(), ok: true };
  }
}
module.exports = { BudgetStore };
