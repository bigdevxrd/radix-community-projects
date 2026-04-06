// OmO State Manager — persistent key-value state across agent sessions

const fs = require("fs");
const path = require("path");

const DEFAULT_STATE_FILE = process.env.STATE_FILE || ".agent-state.json";

class StateManager {
  /**
   * @param {string} [stateFile] — path to JSON state file
   */
  constructor(stateFile) {
    this._file = stateFile || DEFAULT_STATE_FILE;
    this._state = {};
    this._history = []; // audit trail of state changes
    this.load();
  }

  /**
   * Set a key-value pair
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this._history.push({
      action: "set",
      key,
      prev: this._state[key],
      timestamp: Date.now(),
    });
    this._state[key] = value;
  }

  /**
   * Get a value by key
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Delete a key
   * @param {string} key
   */
  delete(key) {
    this._history.push({
      action: "delete",
      key,
      prev: this._state[key],
      timestamp: Date.now(),
    });
    delete this._state[key];
  }

  /** Get all keys */
  keys() {
    return Object.keys(this._state);
  }

  /** Get a snapshot of the full state */
  snapshot() {
    return { ...this._state };
  }

  /** Get the change history */
  history() {
    return [...this._history];
  }

  /** Save state to disk */
  save() {
    try {
      const data = {
        state: this._state,
        history: this._history.slice(-100), // keep last 100 entries
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this._file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("[OmO] Failed to save state:", err.message);
    }
  }

  /** Load state from disk */
  load() {
    try {
      if (fs.existsSync(this._file)) {
        const raw = fs.readFileSync(this._file, "utf8");
        const data = JSON.parse(raw);
        this._state = data.state || {};
        this._history = data.history || [];
      }
    } catch (err) {
      console.error("[OmO] Failed to load state:", err.message);
      this._state = {};
      this._history = [];
    }
  }

  /** Clear all state */
  clear() {
    this._history.push({ action: "clear", timestamp: Date.now() });
    this._state = {};
  }
}

module.exports = StateManager;
