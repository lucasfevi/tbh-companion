import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// vitest.dom.config.ts doesn't enable `test.globals`, so @testing-library/react's
// automatic afterEach(cleanup) registration (which checks for a global afterEach)
// never fires — wire it up explicitly instead.
afterEach(cleanup);
