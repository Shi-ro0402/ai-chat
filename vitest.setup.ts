import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// テストが1つ終わるたびに、表示した部品を片付ける
afterEach(() => {
  cleanup();
});
