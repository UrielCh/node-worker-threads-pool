import { StaticPool } from "..";
import path from "path";

describe("Typescript task in StaticPool tests", () => {
  test("test .ts file", async () => {
    const workerData = 100;
    const pool = new StaticPool({
      task: path.resolve(__dirname, "addTs.ts"),
      size: 1,
      workerData,
    });
    const res = await pool.exec(1);
    expect(res).toBe(101);
    pool.destroy();
  }, 10_000);
});
