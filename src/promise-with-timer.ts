class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Detect if error is a Timeout error.
 */
export function isTimeoutError(err: Error): boolean {
  return err instanceof TimeoutError;
}

export class PromiseWithTimer {
  private timerID: NodeJS.Timeout | undefined;
  private timeoutSymbol = Symbol("timeoutSymbol");

  constructor(private p: Promise<any>, private timeout: number) {}

  _createTimer(): Promise<any> {
    return new Promise((resolve) => {
      this.timerID = setTimeout(resolve, this.timeout, this.timeoutSymbol);
    });
  }

  async startRace(): Promise<any> {
    if (this.timeout <= 0) {
      return await this.p;
    }

    const result = await Promise.race([this.p, this._createTimer()]);

    if (result === this.timeoutSymbol) {
      throw new TimeoutError("timeout");
    }
    if (this.timerID) clearTimeout(this.timerID);
    return result;
  }
}
